import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Button from '../../components/common/Button';
import QRScanner from '../../components/common/QRScanner';

export default function Borrow() {
  const [mode, setMode] = useState('scan');
  const [bookCopyId, setBookCopyId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [manualId, setManualId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copies, setCopies] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleScanSuccess = useCallback((text) => {
    setBookCopyId(text);
    setMessage(`Scanned Copy ID: ${text}`);
  }, []);

  const handleScanError = useCallback((err) => {
    console.error('QR scan error:', err);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setCopies([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get('/transactions/borrow/search_copy/', {
          params: { q: searchQuery.trim() },
        });
        setCopies(data || []);
      } catch {
        setCopies([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleManualIdSubmit = (e) => {
    e.preventDefault();
    const trimmed = manualId.trim();
    if (!trimmed) {
      setMessage('Please enter a copy ID or barcode');
      return;
    }
    setBookCopyId(trimmed);
    setMessage(`Manual entry: ${trimmed}`);
  };

  const handleCopySelect = (copy) => {
    const id = String(copy.id);
    setBookCopyId(id);
    setManualId(id);
    setCopies([]);
    setSearchQuery('');
    setMessage(`Selected Copy #${id} - ${copy.book?.title || 'Unknown book'} (${copy.status})`);
  };

  const handleBorrow = async () => {
    if (!bookCopyId) {
      setMessage('Please select or scan a copy first');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.post('/transactions/borrow/issue/', { book_copy: bookCopyId });
      setMessage(`Borrowed successfully. Due: ${data.due_date}`);
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.book_copy?.[0] || 'Borrow failed';
      setMessage(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!bookCopyId) {
      setMessage('Please select or scan a copy first');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.post('/transactions/borrow/return_book/', { book_copy: bookCopyId });
      setMessage(`Returned successfully. Fine: $${data.fine || 0}`);
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.book_copy?.[0] || 'Return failed';
      setMessage(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="borrow-page">
      <h2>Borrow / Return</h2>

      <div className="mode-toggle">
        <button
          type="button"
          className={`mode-btn ${mode === 'scan' ? 'active' : ''}`}
          onClick={() => setMode('scan')}
        >
          Scan QR
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
          onClick={() => setMode('manual')}
        >
          Manual Entry
        </button>
      </div>

      {mode === 'scan' && (
        <div className="scan-mode">
          <QRScanner onScan={handleScanSuccess} onError={handleScanError} />
          {bookCopyId && <p className="scanned-info">Scanned Copy ID: {bookCopyId}</p>}
        </div>
      )}

      {mode === 'manual' && (
        <div className="manual-mode">
          <form onSubmit={handleManualIdSubmit} className="manual-id-form">
            <label htmlFor="manual-id">Copy ID / Barcode</label>
            <input
              id="manual-id"
              type="text"
              placeholder="Enter copy ID or barcode"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
            />
            <Button type="submit" variant="secondary">Look up Copy</Button>
          </form>

          <div className="manual-search">
            <label htmlFor="search-query">Search by Title or ISBN</label>
            <input
              id="search-query"
              type="text"
              placeholder="Search books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searching && <p className="searching-text">Searching...</p>}
            {!searching && copies.length > 0 && (
              <ul className="copy-results">
                {copies.map((copy) => (
                  <li key={copy.id}>
                    <button type="button" className="copy-item" onClick={() => handleCopySelect(copy)}>
                      <span className="copy-title">{copy.book?.title || 'Unknown book'}</span>
                      <span className="copy-meta">Copy #{copy.id} | {copy.barcode || 'no barcode'} | {copy.status}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!searching && searchQuery && copies.length === 0 && (
              <p className="no-results">No copies found</p>
            )}
          </div>
        </div>
      )}

      <div className="action-buttons">
        <Button onClick={handleBorrow} variant="primary" disabled={loading || !bookCopyId}>Borrow</Button>
        <Button onClick={handleReturn} variant="secondary" disabled={loading || !bookCopyId}>Return</Button>
      </div>

      {message && <p className="message">{message}</p>}
    </div>
  );
}
