import History from '../../features/borrow/History';

export default function AdminHistory() {
  return (
    <div className="admin-history-page">
      <div className="admin-history-header">
        <h1>Transaction History</h1>
        <p className="admin-history-subtitle">
          Complete audit log of books borrowed, returned and overdue, with full borrower and staff details.
        </p>
      </div>
      <History />
    </div>
  );
}
