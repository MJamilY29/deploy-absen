import React, { useState } from 'react';
import axios from 'axios';

interface LoginPageProps {
  onLogin: (user: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // For registration
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false); // To toggle between login and register forms
  const [showPassword, setShowPassword] = useState(false); // To toggle password visibility
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    axios.post(`${process.env.REACT_APP_API_URL}/api/login`, { username, password })
      .then(response => {
        console.log('Login response:', response);
        if (response.data.success) {
          onLogin(response.data.user);
        } else {
          setError(response.data.message);
        }
      })
      .catch(error => {
        console.error('Login error:', error);
        if (error.response && error.response.data && error.response.data.message) {
          setError(error.response.data.message);
        } else {
          setError('An error occurred during login.');
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !username || !password) {
      setError('All fields are required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    axios.post(`${process.env.REACT_APP_API_URL}/api/register`, { username, password, name })
      .then(response => {
        if (response.data.success) {
          alert('Account created successfully! Please log in.');
          setIsRegistering(false); // Switch back to login form
          setUsername('');
          setPassword('');
          setName('');
          setError(null);
        } else {
          setError(response.data.message);
        }
      })
      .catch(error => {
        console.error('Registration error:', error);
        if (error.response && error.response.data && error.response.data.message) {
          setError(error.response.data.message);
        } else {
          setError('An error occurred during registration.');
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className="container mt-5">
      <h1>{isRegistering ? 'Register' : 'Login'}</h1>
      {error && <div className="alert alert-danger">{error}</div>}

      {!isRegistering ? (
        <form onSubmit={handleLogin}>
          <div className="form-floating mb-3">
            <input
              type="text"
              className="form-control"
              id="floatingLoginUsername"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <label htmlFor="floatingLoginUsername">Username</label>
          </div>
          <div className="form-floating mb-3 position-relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-control"
              id="floatingPasswordLogin"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label htmlFor="floatingPasswordLogin">Password</label>
            {password && (
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)', zIndex: 100 }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span className="visually-hidden">Loading...</span>
              </>
            ) : (
              'Login'
            )}
          </button>
          <button type="button" className="btn btn-link" onClick={() => {
            setIsRegistering(true);
            setError(null);
          }}>Register</button>
        </form>
      ) : (
        <form onSubmit={handleRegister}>
          <div className="form-floating mb-3">
            <input
              type="text"
              className="form-control"
              id="floatingName"
              placeholder="Nama Lengkap"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label htmlFor="floatingName">Nama Lengkap</label>
          </div>
          <div className="form-floating mb-3">
            <input
              type="text"
              className="form-control"
              id="floatingRegisterUsername"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <label htmlFor="floatingRegisterUsername">Username</label>
          </div>
          <div className="form-floating mb-3 position-relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-control"
              id="floatingPasswordRegister"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label htmlFor="floatingPasswordRegister">Password</label>
            {password && (
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)', zIndex: 100 }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-success" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span className="visually-hidden">Loading...</span>
              </>
            ) : (
              'Register'
            )}
          </button>
          <button type="button" className="btn btn-link" onClick={() => {
            setIsRegistering(false);
            setError(null);
          }}>Back to Login</button>
        </form>
      )}
    </div>
  );
};

export default LoginPage;
