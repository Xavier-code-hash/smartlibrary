import { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatDate } from '../../utils/dateHelpers';
import './Profile.css';

const statusLabel = {
  issued: 'Issued',
  returned: 'Returned',
  overdue: 'Overdue',
  lost: 'Lost',
};

export default function Profile() {
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState({});

  useEffect(() => {
    api.get('/auth/profile/')
      .then(({ data }) => setProfile(data || {}))
      .catch(() => {});
    api.get('/transactions/borrow/my_borrows/')
      .then(({ data }) => {
        const results = data.results || data || [];
        setHistory(results.length ? results : []);
      })
      .catch(() => setHistory([]));
  }, []);

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar">{profile.full_name?.charAt(0) || profile.username?.charAt(0) || 'U'}</div>
        <div className="profile-info">
          <h2>{profile.full_name || profile.username}</h2>
          <p className="profile-handle">@{profile.username}</p>
          <div className="profile-meta">
            <span>{profile.email}</span>
            <span>{profile.phone}</span>
            <span>Member since {formatDate(profile.member_since)}</span>
            <span>ID: {profile.membership_id}</span>
          </div>
        </div>
        <div className="profile-stats">
          <div><strong>{profile.total_borrowed}</strong><span>Total Borrowed</span></div>
          <div><strong>{profile.currently_borrowed}</strong><span>Current</span></div>
          <div><strong>{profile.overdue_count}</strong><span>Overdue</span></div>
        </div>
      </div>

      <h3>My Borrowing History</h3>
      {history.length === 0 && <p>No borrowing history yet.</p>}
      <table className="profile-history">
        <thead>
          <tr><th>Book</th><th>Author</th><th>Issue Date</th><th>Due Date</th><th>Return Date</th><th>Status</th></tr>
        </thead>
        <tbody>
          {history.map((t) => (
            <tr key={t.id}>
              <td>{t.book_title}</td>
              <td>{t.book_author || '-'}</td>
              <td>{formatDate(t.issue_date)}</td>
              <td>{formatDate(t.due_date)}</td>
              <td>{t.return_date ? formatDate(t.return_date) : '-'}</td>
              <td><span className={`status-pill status-${t.status}`}>{statusLabel[t.status] || t.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
