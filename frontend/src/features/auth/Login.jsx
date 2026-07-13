import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Button from '../../components/common/Button';
import './Login.css';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(form.username, form.password);
      if (user.role === 'admin') {
        navigate('/admin/books');
      } else if (user.role === 'librarian') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Login</h2>
        {error && <p className="error">{error}</p>}
        <input name="username" placeholder="Username" value={form.username} onChange={handleChange} required />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
        <Button type="submit" variant="primary">Login</Button>
        <p className="forgot-link"><Link to="/forgot-password">Forgot Password?</Link></p>
        <p className="register-link">Don't have an account? <Link to="/register">Register</Link></p>
      </form>
    </div>
  );
}
