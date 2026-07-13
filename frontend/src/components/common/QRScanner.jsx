import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ onScan, onError }) {
  const scannerRef = useRef(null);
  const activeRef = useRef(false);
  const startingRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  }, [onScan, onError]);

  useEffect(() => {
    let cancelled = false;

    const ensureScanner = () => {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader');
      }
      return scannerRef.current;
    };

    const startScanner = async () => {
      if (startingRef.current || activeRef.current) return;
      startingRef.current = true;
      const scanner = ensureScanner();
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (text) => {
            if (!cancelled) onScanRef.current?.(text);
          },
          (err) => {
            if (!cancelled) onErrorRef.current?.(err);
          }
        );
        if (!cancelled) {
          activeRef.current = true;
        }
      } catch (error) {
        if (!cancelled) {
          const message = error?.message || String(error || '');
          if (!message.includes('already running') && !message.includes('not running')) {
            onErrorRef.current?.(error);
          }
        }
      } finally {
        if (!cancelled) {
          startingRef.current = false;
        }
      }
    };

    const stopScanner = async () => {
      if (!scannerRef.current || !activeRef.current) return;
      try {
        await scannerRef.current.stop();
      } catch (error) {
        const message = error?.message || String(error || '');
        if (!message.includes('not running') && !message.includes('not paused')) {
          console.warn('QR scanner stop warning:', error);
        }
      } finally {
        activeRef.current = false;
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, []);

  return <div id="qr-reader" />;
}
