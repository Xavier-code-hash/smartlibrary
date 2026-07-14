import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';
import { ROLES } from '../../utils/constants';
import './Header.css';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  const closeMobile = () => setMobileOpen(false);

  const isStaff = user && (user.role === ROLES.ADMIN || user.role === ROLES.LIBRARIAN);
  const isAdmin = user && user.role === ROLES.ADMIN;

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link to="/" className="logo">Smart Library</Link>

        <button
          className={`header-mobile-toggle ${mobileOpen ? 'active' : ''}`}
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className={`header-nav ${mobileOpen ? 'open' : ''}`} aria-label="Primary">
          <NavLink to="/books" end onClick={closeMobile}>Books</NavLink>
          <NavLink to="/search" onClick={closeMobile}>Search</NavLink>
          <NavLink to="/dashboard" onClick={closeMobile}>Dashboard</NavLink>
          <NavLink to="/borrow" onClick={closeMobile}>Borrow</NavLink>
          <NavLink to="/profile" onClick={closeMobile}>Profile</NavLink>
          <NavLink to="/notifications" onClick={closeMobile}>Notifications</NavLink>

          {isStaff && (
            <div className={`nav-dropdown ${adminOpen ? 'open' : ''}`}>
              <button
                className="nav-dropdown-trigger"
                aria-expanded={adminOpen}
                onClick={(e) => {
                  e.preventDefault();
                  setAdminOpen(!adminOpen);
                }}
              >
                Admin <span className="nav-dropdown-arrow"></span>
              </button>
              <div className="nav-dropdown-menu">
                <NavLink to="/admin/books" end onClick={() => { closeMobile(); setAdminOpen(false); }}>Manage Books</NavLink>
                <NavLink to="/admin/history" onClick={() => { closeMobile(); setAdminOpen(false); }}>History</NavLink>
                <NavLink to="/admin/payments" onClick={() => { closeMobile(); setAdminOpen(false); }}>Payments</NavLink>
                {isAdmin && <NavLink to="/admin/users" onClick={() => { closeMobile(); setAdminOpen(false); }}>Users</NavLink>}
              </div>
            </div>
          )}
        </nav>

        <div className="header-actions">
          {user ? (
            <>
              <span className={`user-role role-${user.role}`}>
                {user.role === ROLES.ADMIN ? 'Admin' : user.role === ROLES.LIBRARIAN ? 'Librarian' : 'Member'}
              </span>
              <button onClick={handleLogout} className="header-logout">Logout</button>
              <Link to="/borrow" className="header-cta" onClick={closeMobile}>Reserve</Link>
            </>
          ) : (
            <Link to="/login" className="header-cta" onClick={closeMobile}>Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}
