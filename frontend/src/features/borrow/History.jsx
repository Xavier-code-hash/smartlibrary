import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../components/common/Toast';
import Pagination from '../../components/common/Pagination';
import { formatDueDate } from '../../utils/dateHelpers';
import './History.css';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Borrowed' },
  { key: 'returned', label: 'Returned' },
  { key: 'overdue', label: 'Overdue' },
];

const STATUS_LABELS = {
  issued: 'Borrowed',
  returned: 'Returned',
  overdue: 'Overdue',
};

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function PersonCell({ person }) {
  if (!person) return <span className="history-muted">—</span>;
  return (
    <div className="history-person">
      <span className="history-person-name">{person.full_name}</span>
      <span className="history-person-meta">
        @{person.username}
        {person.membership_id ? ` · ${person.membership_id}` : ''}
      </span>
      <span className="history-person-meta">{person.email}</span>
    </div>
  );
}

export default function History() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.q = search.trim();
      const { data } = await api.get('/transactions/borrow/history/', { params });
      const results = data.results || [];
      setRows(results);
      setCount(data.count || 0);
      setTotalPages(Math.max(1, Math.ceil((data.count || 0) / 20)));
    } catch {
      toast('Failed to load transaction history', { variant: 'error' });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, toast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  return (
    <div className="history-page">
      <div className="history-toolbar">
        <div className="history-filters" role="tablist" aria-label="Transaction status">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={statusFilter === f.key}
              className={`history-filter ${statusFilter === f.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          className="history-search"
          type="search"
          placeholder="Search by member, title, ISBN or barcode"
          value={search}
          onChange={handleSearch}
        />
      </div>

      <div className="history-table-wrapper">
        <table className="history-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Book</th>
              <th>Borrowed By</th>
              <th>Issued By</th>
              <th>Issued</th>
              <th>Due</th>
              <th>Returned</th>
              <th>Returned By</th>
              <th>Status</th>
              <th>Fine</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="10" className="history-loading">Loading history…</td>
              </tr>
            )}
            {!loading && rows.map((row, idx) => (
              <tr key={row.id}>
                <td className="history-cell-id">{row.id}</td>
                <td>
                  <div className="history-book">
                    <span className="history-book-title">{row.book.title}</span>
                    <span className="history-book-meta">
                      {row.book.authors?.join(', ') || 'Unknown author'}
                    </span>
                    <span className="history-book-meta">
                      Copy #{row.book.copy_id}
                      {row.book.barcode ? ` · ${row.book.barcode}` : ''}
                    </span>
                  </div>
                </td>
                <td><PersonCell person={row.borrower} /></td>
                <td><PersonCell person={row.issuer} /></td>
                <td className="history-date">{formatDateTime(row.issue_date)}</td>
                <td className={`history-date ${row.is_overdue ? 'history-overdue' : ''}`}>
                  {formatDueDate(row.due_date)}
                </td>
                <td className="history-date">{formatDateTime(row.return_date)}</td>
                <td><PersonCell person={row.returner} /></td>
                <td>
                  <span className={`history-status status-${row.status}`}>
                    {STATUS_LABELS[row.status] || row.status}
                    {row.is_overdue && row.status !== 'returned' ? ` (${row.days_overdue}d)` : ''}
                  </span>
                </td>
                <td className="history-fine">
                  {row.fine ? (
                    <span className={row.fine.paid ? 'fine-paid' : 'fine-unpaid'}>
                      ${row.fine.amount}
                      {row.fine.paid ? ' · paid' : ' · unpaid'}
                    </span>
                  ) : (
                    <span className="history-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan="10" className="history-empty">No transaction history found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="history-footer">
        <span className="history-count">{count} transaction{count === 1 ? '' : 's'}</span>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
