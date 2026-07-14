import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useToast } from '../../components/common/Toast';
import './Payments.css';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
];

const STATUS_LABELS = {
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function Payments() {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/transactions/payments/');
        setPayments(Array.isArray(data) ? data : (data.results || []));
      } catch {
        setPayments([]);
        toast('Failed to load payment history', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [toast]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return payments;
    return payments.filter((p) => p.status === statusFilter);
  }, [payments, statusFilter]);

  const totals = useMemo(() => {
    const completed = payments.filter((p) => p.status === 'completed');
    const collected = completed.reduce((sum, p) => sum + Number(p.amount), 0);
    const pending = payments.filter((p) => p.status === 'pending').length;
    return { total: payments.length, collected, pending };
  }, [payments]);

  return (
    <div className="payments-page">
      <div className="payments-header">
        <div>
          <h1>Payment History</h1>
          <p className="payments-subtitle">
            Complete log of all M-Pesa payments — pending, completed and failed.
          </p>
        </div>
        <div className="payments-summary">
          <div className="payments-sum-item">
            <span className="payments-sum-value">{totals.total}</span>
            <span className="payments-sum-label">Total</span>
          </div>
          <div className="payments-sum-item">
            <span className="payments-sum-value">KES {totals.collected.toFixed(2)}</span>
            <span className="payments-sum-label">Collected</span>
          </div>
          <div className="payments-sum-item">
            <span className="payments-sum-value">{totals.pending}</span>
            <span className="payments-sum-label">Pending</span>
          </div>
        </div>
      </div>

      <div className="payments-filters" role="tablist" aria-label="Payment status">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={statusFilter === f.key}
            className={`payments-filter ${statusFilter === f.key ? 'active' : ''}`}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="payments-table-wrapper">
        <table className="payments-table">
          <thead>
            <tr>
              <th>Receipt #</th>
              <th>Member</th>
              <th>Book</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Date</th>
              <th>M-Pesa Receipt</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="9" className="payments-loading">Loading payments…</td>
              </tr>
            )}
            {!loading && filtered.map((p) => (
              <tr key={p.id}>
                <td className="payments-cell-receipt">
                  {p.receipt_number || <span className="payments-muted">—</span>}
                </td>
                <td>
                  <div className="payments-person">
                    <span className="payments-person-name">{p.full_name}</span>
                    <span className="payments-person-meta">@{p.username}</span>
                  </div>
                </td>
                <td className="payments-cell-book">{p.book_title}</td>
                <td className="payments-cell-amount">KES {Number(p.amount).toFixed(2)}</td>
                <td className="payments-cell-method">{p.method === 'mpesa' ? 'M-Pesa' : p.method}</td>
                <td className="payments-cell-phone">{p.phone}</td>
                <td>
                  <span className={`fine-status ${p.status}`}>
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                </td>
                <td className="payments-cell-date">
                  {formatDate(p.completed_at || p.created_at)}
                </td>
                <td className="payments-cell-mpesa">
                  {p.receipt ? p.receipt : <span className="payments-muted">—</span>}
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan="9" className="payments-empty">No payments found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
