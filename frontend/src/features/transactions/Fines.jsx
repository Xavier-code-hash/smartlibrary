import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../auth/context/AuthContext';
import { useToast } from '../../components/common/Toast';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { formatDate } from '../../utils/dateHelpers';
import './Fines.css';

export default function Fines() {
  const { user } = useAuth();
  const toast = useToast();
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [phone, setPhone] = useState(user?.phone || '');
  const [submitting, setSubmitting] = useState(false);
  const [payMessage, setPayMessage] = useState('');
  const [receiptFine, setReceiptFine] = useState(null);

  const fetchFines = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/transactions/fines/my_fines/');
      setFines(Array.isArray(data) ? data : []);
    } catch {
      setFines([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFines();
  }, [fetchFines]);

  const unpaid = fines.filter((f) => !f.paid);
  const outstanding = unpaid.reduce((sum, f) => sum + Number(f.amount), 0);

  const startPay = (fine) => {
    setPaying(fine);
    setPhone(user?.phone || '');
    setPayMessage('');
  };

  const handlePay = async () => {
    if (!paying) return;
    const trimmed = phone.trim();
    if (!trimmed) {
      setPayMessage('Please enter your M-Pesa phone number.');
      return;
    }
    setSubmitting(true);
    setPayMessage('');
    try {
      const { data } = await api.post('/transactions/fines/pay/', {
        fine_id: paying.id,
        phone: trimmed,
      });
      setPayMessage(data.message || 'STK push sent. Complete the payment on your phone.');
      toast('M-Pesa prompt sent. Enter your PIN on your phone.', { variant: 'success' });
      setTimeout(() => {
        setPaying(null);
        fetchFines();
      }, 2600);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Payment initiation failed. Please try again.';
      setPayMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayAll = async () => {
    if (unpaid.length === 0) {
      toast('You have no outstanding fines to pay.', { variant: 'info' });
      return;
    }
    setSubmitting(true);
    let lastMsg = '';
    try {
      for (const fine of unpaid) {
        const { data } = await api.post('/transactions/fines/pay/', {
          fine_id: fine.id,
          phone: phone.trim() || user?.phone || '',
        });
        lastMsg = data.message || lastMsg;
      }
      toast('M-Pesa prompts sent for all outstanding fines.', { variant: 'success' });
      setTimeout(fetchFines, 2600);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Some payments could not be initiated.';
      toast(msg, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="fines-section">
      <div className="fines-header">
        <div>
          <h3>My Fines</h3>
          <p className="fines-subtitle">
            {unpaid.length > 0
              ? `KES ${outstanding.toFixed(2)} outstanding across ${unpaid.length} fine${unpaid.length === 1 ? '' : 's'}`
              : 'All fines settled'}
          </p>
        </div>
        <div className="fines-header-actions">
          <Button variant="primary" onClick={handlePayAll} disabled={submitting}>
            Pay All
          </Button>
          <Button variant="outline" onClick={fetchFines} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="fines-loading">Loading fines…</p>
      ) : (
        <div className="fines-table-wrapper">
          <table className="fines-table">
            <thead>
              <tr>
                <th>Book</th>
                <th>Amount</th>
                <th>Issued</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fines.length === 0 ? (
                <tr>
                  <td colSpan="5" className="fines-empty">You have no fines. 🎉</td>
                </tr>
              ) : (
                fines.map((f) => (
                  <tr key={f.id} className={f.paid ? 'fines-row-paid' : ''}>
                    <td className="fines-cell-book">{f.book_title}</td>
                    <td className="fines-cell-amount">KES {Number(f.amount).toFixed(2)}</td>
                    <td className="fines-cell-date">{formatDate(f.created_at)}</td>
                    <td>
                      {f.paid ? (
                        <span className="fine-status paid">Paid</span>
                      ) : f.payment_status === 'pending' ? (
                        <span className="fine-status pending">Pending</span>
                      ) : f.payment_status === 'failed' ? (
                        <span className="fine-status failed">Failed</span>
                      ) : (
                        <span className="fine-status unpaid">Unpaid</span>
                      )}
                    </td>
                    <td className="fines-cell-action">
                      {!f.paid && (
                        <button className="btn-link" onClick={() => startPay(f)} disabled={submitting}>
                          Pay with M-Pesa
                        </button>
                      )}
                      {f.paid && f.receipt_number && (
                        <button className="btn-link" onClick={() => setReceiptFine(f)}>
                          View Receipt
                        </button>
                      )}
                      {f.paid && !f.receipt_number && (
                        <span className="fines-receipt">Settled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={!!paying} onClose={() => setPaying(null)} title="Pay Fine with M-Pesa">
        {paying && (
          <div className="fines-pay-modal">
            <p className="fines-pay-amount">KES {Number(paying.amount).toFixed(2)}</p>
            <p className="fines-pay-book">{paying.book_title}</p>

            <label htmlFor="mpesa-phone">M-Pesa Phone Number</label>
            <input
              id="mpesa-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0712345678"
              disabled={submitting}
            />

            {payMessage && <p className="fines-pay-message">{payMessage}</p>}

            <div className="fines-pay-actions">
              <Button onClick={handlePay} variant="primary" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send STK Push'}
              </Button>
              <Button onClick={() => setPaying(null)} variant="outline" disabled={submitting}>
                Cancel
              </Button>
            </div>
            <p className="fines-pay-hint">
              You will receive an M-Pesa prompt on your phone. Enter your PIN to complete the payment.
            </p>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!receiptFine} onClose={() => setReceiptFine(null)} title="Payment Receipt">
        {receiptFine && (
          <div className="fines-receipt-modal">
            <div className="receipt-brand">Smart Library</div>
            <div className="receipt-title">Payment Receipt</div>
            <dl className="receipt-rows">
              <div><dt>Receipt #</dt><dd>{receiptFine.receipt_number}</dd></div>
              <div><dt>Book</dt><dd>{receiptFine.book_title}</dd></div>
              <div><dt>Amount</dt><dd>KES {Number(receiptFine.amount).toFixed(2)}</dd></div>
              <div><dt>Method</dt><dd>M-Pesa</dd></div>
              {receiptFine.receipt && (
                <div><dt>M-Pesa Receipt</dt><dd>{receiptFine.receipt}</dd></div>
              )}
              <div><dt>Date</dt><dd>{new Date(receiptFine.created_at).toLocaleString()}</dd></div>
              <div><dt>Status</dt><dd>Settled</dd></div>
            </dl>
            <p className="receipt-footer">Thank you for your payment.</p>
            <div className="fines-pay-actions">
              <Button onClick={() => window.print()} variant="outline">Print</Button>
              <Button onClick={() => setReceiptFine(null)} variant="primary">Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
