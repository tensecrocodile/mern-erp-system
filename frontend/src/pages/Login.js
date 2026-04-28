import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authApi';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <div className="card auth-card">
        <div className="auth-logo-wrap">
          <div className="auth-logo">GW</div>
        </div>
        <h1 className="auth-heading">GeoWorkforce</h1>
        <p className="auth-sub">Sign in to access your workforce dashboard.</p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="form-label">
            Email
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@company.com"
            />
          </label>
          <label className="form-label">
            Password
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </label>
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
