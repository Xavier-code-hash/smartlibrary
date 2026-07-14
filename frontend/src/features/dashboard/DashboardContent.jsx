import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { ROLES } from '../../utils/constants';
import Fines from '../transactions/Fines';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import './DashboardContent.css';

const centerTextPlugin = {
  id: 'centerText',
  afterDraw(chart, _args, opts) {
    const text = opts?.text;
    if (text == null) return;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const cx = (chartArea.left + chartArea.right) / 2;
    const cy = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 22px Inter, system-ui, sans-serif';
    ctx.fillText(String(text), cx, cy - 7);
    ctx.fillStyle = '#64748b';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillText(opts.sub || '', cx, cy + 15);
    ctx.restore();
  },
};

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Filler, Title, Tooltip, Legend, centerTextPlugin,
);

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
};

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: { legend: { position: 'top' } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
};

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

  const revenueChartData = useMemo(() => {
    if (!stats?.revenue?.data?.length) return null;
    return {
      labels: stats.revenue.labels,
      datasets: [
        {
          label: 'Revenue ($)',
          data: stats.revenue.data,
          backgroundColor: 'rgba(16, 185, 129, 0.75)',
          hoverBackgroundColor: 'rgba(5, 150, 105, 0.9)',
          borderRadius: 6,
        },
      ],
    };
  }, [stats]);

  const bookStatusItems = useMemo(() => {
    const s = stats?.books_status;
    if (!s) return null;
    return [
      { label: 'Available', value: s.available, color: '#10b981' },
      { label: 'Issued', value: s.issued, color: '#6366f1' },
      { label: 'Damaged', value: s.damaged, color: '#f59e0b' },
      { label: 'Lost', value: s.lost, color: '#ef4444' },
    ];
  }, [stats]);

  const borrowTrendChartData = useMemo(() => {
    if (!stats?.borrowing_trend?.labels?.length) return null;
    return {
      labels: stats.borrowing_trend.labels,
      datasets: [
        {
          label: 'Issued',
          data: stats.borrowing_trend.issued,
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14, 165, 233, 0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: 'Returned',
          data: stats.borrowing_trend.returned,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.12)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    };
  }, [stats]);

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

  const categoryItems = useMemo(() => {
    if (!stats?.categories?.length) return null;
    const palette = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
    return stats.categories.map((c, i) => ({
      label: c.label,
      value: c.value,
      color: palette[i % palette.length],
    }));
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
          <StatCard title="Revenue (Collected)" value={`$${Number(stats.total_revenue || 0).toFixed(2)}`} />
          <StatCard title="Unpaid Fines" value={`$${Number(stats.unpaid_fines || 0).toFixed(2)}`} />
        </div>
        <ChartsGrid
          revenue={revenueChartData}
          revenueTotal={stats.revenue?.total}
          bookStatusItems={bookStatusItems}
          availableCopies={stats.available_copies}
          totalCopies={stats.total_copies}
          borrowTrend={borrowTrendChartData}
          popular={popularBooksChartData}
          categoryItems={categoryItems}
        />
        <div className="quick-links">
          <Link to="/admin/users" className="quick-link">Manage Users</Link>
          <Link to="/admin/books" className="quick-link">Manage Books</Link>
          <Link to="/admin/history" className="quick-link">Transaction History</Link>
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
          <StatCard title="Revenue (Collected)" value={`$${Number(stats.total_revenue || 0).toFixed(2)}`} />
          <StatCard title="Unpaid Fines" value={`$${Number(stats.unpaid_fines || 0).toFixed(2)}`} />
        </div>
        <ChartsGrid
          revenue={revenueChartData}
          revenueTotal={stats.revenue?.total}
          bookStatusItems={bookStatusItems}
          availableCopies={stats.available_copies}
          totalCopies={stats.total_copies}
          borrowTrend={borrowTrendChartData}
          popular={popularBooksChartData}
          categoryItems={categoryItems}
        />
        <div className="quick-links">
          <Link to="/books" className="quick-link">Browse Books</Link>
          <Link to="/borrow" className="quick-link">Borrow / Return</Link>
          <Link to="/admin/history" className="quick-link">Transaction History</Link>
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

      <Fines />

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

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h3>{title}</h3>
        {subtitle != null && <span className="chart-card-subtitle">{subtitle}</span>}
      </div>
      <div className="chart-body">{children}</div>
    </div>
  );
}

function ChartsGrid({
  revenue, revenueTotal, bookStatusItems, availableCopies, totalCopies,
  borrowTrend, popular, categoryItems,
}) {
  return (
    <div className="charts-grid">
      {revenue && (
        <ChartCard title="Library Revenue" subtitle={`Total collected: $${Number(revenueTotal || 0).toFixed(2)}`}>
          <Bar data={revenue} options={barOptions} />
        </ChartCard>
      )}
      {bookStatusItems && (
        <PieChartCard
          title="Book Availability"
          subtitle={`${availableCopies}/${totalCopies} available`}
          centerSub="Copies"
          items={bookStatusItems}
        />
      )}
      {borrowTrend && (
        <ChartCard title="Borrowing Activity" subtitle="Issued vs Returned (last 12 months)">
          <Line data={borrowTrend} options={lineOptions} />
        </ChartCard>
      )}
      {popular && (
        <ChartCard title="Most Borrowed Books">
          <Bar data={popular} options={barOptions} />
        </ChartCard>
      )}
      {categoryItems && (
        <PieChartCard
          title="Collection by Category"
          subtitle={`${categoryItems.length} categories`}
          centerSub="Books"
          items={categoryItems}
        />
      )}
    </div>
  );
}

function PieChartCard({ title, subtitle, items, centerSub }) {
  const total = items.reduce((sum, it) => sum + (Number(it.value) || 0), 0);
  const data = {
    labels: items.map((i) => i.label),
    datasets: [{
      data: items.map((i) => i.value),
      backgroundColor: items.map((i) => i.color),
      borderColor: '#ffffff',
      borderWidth: 2,
      hoverOffset: 8,
    }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const pct = total ? Math.round((ctx.parsed / total) * 100) : 0;
            return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
          },
        },
      },
      centerText: { text: total.toLocaleString(), sub: centerSub },
    },
  };
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h3>{title}</h3>
        {subtitle != null && <span className="chart-card-subtitle">{subtitle}</span>}
      </div>
      <div className="pie-card-body">
        <div className="pie-3d">
          <Doughnut data={data} options={options} />
        </div>
        <ul className="pie-legend">
          {items.map((it) => {
            const pct = total ? Math.round((Number(it.value) / total) * 100) : 0;
            return (
              <li key={it.label}>
                <span className="pie-legend-dot" style={{ background: it.color }} />
                <span className="pie-legend-label">{it.label}</span>
                <span className="pie-legend-value">{it.value}</span>
                <span className="pie-legend-pct">{pct}%</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}