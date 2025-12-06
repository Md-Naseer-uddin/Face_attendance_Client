import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.login(email, password);
      const data = response.data;

      if (data.success && data.token && data.user) {
        // Store JWT token and user data in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect to home page
        navigate('/', { replace: true });
      } else {
        setError(data.error || 'Login failed - Invalid response from server');
      }
    } catch (err) {
      if (err.response) {
        // Server responded with error
        const errorMsg = err.response.data.error || err.response.data.message || 'Login failed';
        setError(errorMsg);
      } else if (err.request) {
        // Request made but no response
        setError('Server not responding. Please ensure the server is running on port 3001.');
      } else {
        setError('Network error: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page login-page">
      <div className="card login-card">
        <h2>Login</h2>
        <p className="login-subtitle">Face Attendance System</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@mail.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
