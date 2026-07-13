import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { ROLES } from '../../utils/constants';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './DashboardContent.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function DashboardContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [{ data: statsData }, { data: notifData }] = await Promise.all([
          api.get('/dashboard/stats/'),
          api.get('/auth/notifications/'),
        ]);
        setStats(statsData);
        setNotifications(notifData.results || notifData);
      } catch {
        setStats(null);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const popularBooksChartData = useMemo(() => {
    if (!stats?.popular_books?.length) return null;
    return {
      labels: stats.popular_books.map((b) => b.title),
      datasets: [
        {
          label: 'Borrows',
          data: stats.popular_books.map((b) => b.count),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [stats]);

  const trendChartData = useMemo(() => {
    if (!stats?.borrow_trends?.length) return null;
    return {
      labels: stats.borrow_trends.map((t) => t.book_title || t.issue_date),
      datasets: [
        {
          label: 'Issued',
          data: stats.borrow_trends.map((t) => 1),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [stats]);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!stats) return <div className="error">Failed to load dashboard data.</div>;

  if (user?.role === ROLES.ADMIN) {
    return (
      <div className="dashboard-content">
        <h2>Admin Dashboard</h2>
        <div className="stats-grid">
          <StatCard title="Total Books" value={stats.total_books} />
          <StatCard title="Total Copies" value={stats.total_copies} />
          <StatCard title="Available Copies" value={stats.available_copies} />
          <StatCard title="Total Members" value={stats.total_members} />
          <StatCard title="Active Borrows" value={stats.active_borrows} />
          <StatCard title="Overdue Items" value={stats.overdue_count} />
          <StatCard title="Unpaid Fines" value={stats.total_fines} />
        </div>
        <div className="charts-grid">
          {popularBooksChartData && (
            <div className="chart-card">
              <h3>Popular Books</h3>
              <Bar data={popularBooksChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            </div>
          )}
          {trendChartData && (
            <div className="chart-card">
              <h3>Borrow Trends</h3>
              <Bar data={trendChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            </div>
          )}
        </div>
        <div className="quick-links">
          <Link to="/admin/users" className="quick-link">Manage Users</Link>
          <Link to="/admin/books" className="quick-link">Manage Books</Link>
        </div>
      </div>
    );
  }

  if (user?.role === ROLES.LIBRARIAN) {
    return (
      <div className="dashboard-content">
        <h2>Librarian Dashboard</h2>
        <div className="stats-grid">
          <StatCard title="Active Borrows" value={stats.active_borrows} />
          <StatCard title="Overdue Items" value={stats.overdue_count} />
          <StatCard title="Available Copies" value={stats.available_copies} />
          <StatCard title="Unpaid Fines" value={stats.total_fines} />
        </div>
        <div className="quick-links">
          <Link to="/books" className="quick-link">Browse Books</Link>
          <Link to="/borrow" className="quick-link">Borrow / Return</Link>
          <Link to="/search" className="quick-link">Search</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <h2>My Dashboard</h2>
      <div className="stats-grid">
        <StatCard title="Active Borrows" value={stats.active_borrows_count} />
        <StatCard title="Overdue" value={stats.overdue_count} />
        <StatCard title="Unpaid Fines" value={stats.unpaid_fines} />
        <StatCard title="Reservations" value={stats.reservations_count} />
      </div>

      {stats.active_borrows?.length > 0 && (
        <section className="dashboard-section">
          <h3>Active Borrows</h3>
          <table className="dashboard-table">
            <thead>
              <tr><th>Title</th><th>Issue Date</th><th>Due Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {stats.active_borrows.map((t) => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td>{t.issue_date ? new Date(t.issue_date).toLocaleDateString() : '-'}</td>
                  <td>{t.due_date ? new Date(t.due_date).toLocaleDateString() : '-'}</td>
                  <td>{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {stats.overdue?.length > 0 && (
        <section className="dashboard-section">
          <h3>Overdue Items</h3>
          <table className="dashboard-table">
            <thead>
              <tr><th>Title</th><th>Due Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {stats.overdue.map((t) => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td>{t.due_date ? new Date(t.due_date).toLocaleDateString() : '-'}</td>
                  <td>{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {notifications.length > 0 && (
        <section className="dashboard-section">
          <h3>Notifications</h3>
          <ul className="notifications-list">
            {notifications.slice(0, 5).map((n) => (
              <li key={n.id} className={`notification-item ${n.read ? 'read' : 'unread'}`}>{n.message}</li>
            ))}
          </ul>
          <Link to="/notifications" className="quick-link">View all notifications</Link>
        </section>
      )}

      <div className="quick-links">
        <Link to="/books" className="quick-link">Browse Books</Link>
        <Link to="/borrow" className="quick-link">Borrow / Return</Link>
        <Link to="/profile" className="quick-link">Borrowing History</Link>
        <Link to="/search" className="quick-link">Search</Link>
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="stat-card">
      <h3>{typeof value === 'number' ? value.toLocaleString() : value}</h3>
      <p>{title}</p>
    </div>
  );
}