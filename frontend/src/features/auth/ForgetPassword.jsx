import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Button from '../../components/common/Button';
import './Login.css';

export default function ForgetPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/password-reset/request/', { email });
      setMessage(data.detail || 'If an account with that email exists, a password reset link has been sent.');
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Forgot Password</h2>
        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}
        <input
          name="email"
          type="email"
          placeholder="Enter your registered email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" variant="primary" disabled={loading || !!message}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </Button>
        <p className="register-link">Remember your password? <Link to="/login">Login</Link></p>
      </form>
    </div>
  );
}
