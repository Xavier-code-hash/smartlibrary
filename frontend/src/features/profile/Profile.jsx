import { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatDate, formatDueDate } from '../../utils/dateHelpers';
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

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username || 'User';
  const memberSince = profile.date_joined ? formatDate(profile.date_joined) : 'Unknown';
  const totalBorrowed = history.length;
  const currentlyBorrowed = history.filter((t) => t.status === 'issued').length;
  const overdueCount = history.filter((t) => t.status === 'overdue').length;

  useEffect(() => {
    api.get('/auth/me/')
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
        <div className="profile-avatar">{fullName.charAt(0)}</div>
        <div className="profile-info">
          <h2>{fullName}</h2>
          <p className="profile-handle">@{profile.username}</p>
          <div className="profile-meta">
            <span>{profile.email}</span>
            <span>{profile.phone || '-'}</span>
            <span>Member since {memberSince}</span>
            <span>ID: {profile.membership_id || '-'}</span>
          </div>
        </div>
        <div className="profile-stats">
          <div><strong>{totalBorrowed}</strong><span>Total Borrowed</span></div>
          <div><strong>{currentlyBorrowed}</strong><span>Current</span></div>
          <div><strong>{overdueCount}</strong><span>Overdue</span></div>
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
              <td>{formatDueDate(t.due_date)}</td>
              <td>{t.return_date ? formatDate(t.return_date) : '-'}</td>
              <td><span className={`status-pill status-${t.status}`}>{statusLabel[t.status] || t.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
