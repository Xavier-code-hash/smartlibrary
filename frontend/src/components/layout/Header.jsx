import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';
import { ROLES } from '../../utils/constants';
import './Header.css';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">Smart Library</Link>
        <nav className="header-nav">
          <Link to="/books">Books</Link>
          <Link to="/search">Search</Link>
          {user ? (
            <>
              <span className={`user-role role-${user.role}`}>
                {user.role === ROLES.ADMIN ? 'Admin' : user.role === ROLES.LIBRARIAN ? 'Librarian' : 'Member'}
              </span>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/borrow">Borrow</Link>
              <Link to="/profile">Profile</Link>
              <Link to="/notifications">Notifications</Link>
              {(user.role === ROLES.ADMIN || user.role === ROLES.LIBRARIAN) && (
                <Link to="/admin/books">Manage Books</Link>
              )}
              {user.role === ROLES.ADMIN && <Link to="/admin/users">Users</Link>}
              <button onClick={handleLogout} className="btn-link">Logout</button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
}