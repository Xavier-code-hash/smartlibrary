import { useState, useEffect } from 'react';
import api from '../../services/api';
import './Notifications.css';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    api.get('/auth/notifications/')
      .then(({ data }) => {
        const results = data.results || data || [];
        setNotifications(results.length ? results : []);
      })
      .catch(() => setNotifications([]));
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h2>Notifications</h2>
        {unread > 0 && <span className="notifications-badge">{unread} new</span>}
      </div>
      {notifications.length === 0 && <p>No notifications</p>}
      <ul className="notifications-list">
        {notifications.map((n) => (
          <li key={n.id} className={`notification-item ${n.read ? 'read' : 'unread'}`}>
            <span className={`notification-dot ${n.read ? '' : 'active'}`} />
            <div className="notification-body">
              <div className="notification-top">
                <span className={`notification-tag tag-${n.type || 'system'}`}>{n.title || 'Notification'}</span>
                <span className="notification-time">{n.created_at ? timeAgo(n.created_at) : ''}</span>
              </div>
              <p className="notification-message">{n.message}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
