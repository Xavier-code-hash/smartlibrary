import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import Button from '../../components/common/Button';
import QRScanner from '../../components/common/QRScanner';
import { useToast } from '../../components/common/Toast';
import { useClickOutside } from '../../utils/useClickOutside';
import { formatDueDate } from '../../utils/dateHelpers';
import History from './History';
import { getBookCopies } from '../books/services/booksApi';

export default function Borrow() {
  const [searchParams] = useSearchParams();
  const preselectedBookId = searchParams.get('book');
  const toast = useToast();

  const [mode, setMode] = useState('manual');
  const [bookCopyId, setBookCopyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('borrow');
  const [autoFilled, setAutoFilled] = useState(false);

  const [manualId, setManualId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copies, setCopies] = useState([]);
  const [searching, setSearching] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const resultsRef = useRef(null);
  useClickOutside(resultsRef, () => setResultsOpen(false), resultsOpen);

  // Auto-fill the manual entry form when arriving from a book's Borrow button.
  useEffect(() => {
    if (!preselectedBookId) return;
    let isActive = true;
    setLoading(true);
    getBookCopies(preselectedBookId)
      .then(({ data }) => {
        if (!isActive) return;
        const list = data || [];
        const available = list.find((c) => c.status === 'available') || list[0];
        if (available) {
          const id = String(available.id);
          setBookCopyId(id);
          setManualId(id);
          setCopies(list);
          setSearchQuery(available.book?.title || '');
          setAutoFilled(true);
          toast(
            `Auto-filled: ${available.book?.title || 'Unknown book'} — Copy #${id} (${available.status})`,
            { variant: 'info' }
          );
        } else {
          toast('This book has no copies available to borrow.', { variant: 'warning' });
        }
      })
      .catch(() => {
        if (isActive) toast('Could not load copies for the selected book.', { variant: 'error' });
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [preselectedBookId]);

  const handleScanSuccess = useCallback((text) => {
    setBookCopyId(text);
    setAutoFilled(false);
    toast(`Scanned Copy ID: ${text}`, { variant: 'info' });
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
        setResultsOpen(true);
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
      toast('Please enter a copy ID or barcode', { variant: 'warning' });
      return;
    }
    setBookCopyId(trimmed);
    setAutoFilled(false);
    toast(`Manual entry: ${trimmed}`, { variant: 'info' });
  };

  const handleCopySelect = (copy) => {
    const id = String(copy.id);
    setBookCopyId(id);
    setManualId(id);
    setCopies([]);
    setSearchQuery('');
    setResultsOpen(false);
    setAutoFilled(false);
    toast(`Selected Copy #${id} - ${copy.book?.title || 'Unknown book'} (${copy.status})`, { variant: 'info' });
  };

  const handleClearPrefill = () => {
    setBookCopyId('');
    setManualId('');
    setCopies([]);
    setSearchQuery('');
    setAutoFilled(false);
  };

  const handleBorrow = async () => {
    if (!bookCopyId) {
      toast('Please select or scan a copy first', { variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/transactions/borrow/issue/', { book_copy: bookCopyId });
      const dueFormatted = data.due_date ? formatDueDate(data.due_date) : 'Unknown';
      toast(`Borrowed successfully. Return by: ${dueFormatted}`, { variant: 'success' });
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.book_copy?.[0] || 'Borrow failed';
      toast(String(msg), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!bookCopyId) {
      toast('Please select or scan a copy first', { variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/transactions/borrow/return_book/', { book_copy: bookCopyId });
      toast(`Returned successfully. Fine: $${data.fine || 0}`, { variant: 'success' });
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.book_copy?.[0] || 'Return failed';
      toast(String(msg), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="borrow-page">
      <h2>Borrow / Return</h2>

      <div className="borrow-tabs">
        <button
          type="button"
          className={`borrow-tab ${tab === 'borrow' ? 'active' : ''}`}
          onClick={() => setTab('borrow')}
        >
          Issue / Return
        </button>
        <button
          type="button"
          className={`borrow-tab ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          Transaction History
        </button>
      </div>

      {tab === 'history' ? (
        <History />
      ) : (
      <>
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
          {autoFilled && (
            <div className="prefill-banner">
              <span>✓ Manual entry auto-filled from the book. Review and confirm, or clear to choose another copy.</span>
              <Button type="button" variant="ghost" size="sm" onClick={handleClearPrefill}>Clear</Button>
            </div>
          )}
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

          <div className="manual-search" ref={resultsRef}>
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
      </>
      )}
    </div>
  );
}
