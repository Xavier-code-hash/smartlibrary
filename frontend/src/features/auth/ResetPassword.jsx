import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import Button from '../../components/common/Button';
import './Login.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [form, setForm] = useState({ new_password: '', new_password2: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (form.new_password !== form.new_password2) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/password-reset/confirm/', {
        token,
        new_password: form.new_password,
        new_password2: form.new_password2,
      });
      setMessage(data.detail || 'Password has been reset successfully.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.token?.[0] || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-form">
          <h2>Reset Password</h2>
          <p className="error">Invalid or missing reset token.</p>
          <p className="register-link"><Link to="/login">Back to login</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Reset Password</h2>
        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}
        <input
          name="new_password"
          type="password"
          placeholder="New Password"
          value={form.new_password}
          onChange={handleChange}
          required
          minLength={8}
        />
        <input
          name="new_password2"
          type="password"
          placeholder="Confirm New Password"
          value={form.new_password2}
          onChange={handleChange}
          required
          minLength={8}
        />
        <Button type="submit" variant="primary" disabled={loading || !!message}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </Button>
        <p className="register-link"><Link to="/login">Back to login</Link></p>
      </form>
    </div>
  );
}
