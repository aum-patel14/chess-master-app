import React, { useState } from 'react';
import { X } from 'lucide-react';

const Github = ({ size = 16, style }) => (
  <svg
    height={size}
    width={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    style={style}
  >
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';

export function SignUpModal({ show, onClose, onSwitchToLogin }) {
  const { signup, loginWithGoogle, loginWithGithub } = useAuth();
  const { showToast } = useToast();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signup(email.trim(), password.trim(), username.trim());
      showToast('Registration successful! Welcome to ChessMaster Pro.', 'success');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      onClose();
    } catch (err) {
      showToast(err.message || 'Google Sign-In failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    try {
      setLoading(true);
      await loginWithGithub();
      onClose();
    } catch (err) {
      showToast(err.message || 'GitHub Sign-In failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <button onClick={onClose} style={closeBtnStyle} disabled={loading}>
          <X size={20} />
        </button>
        
        <div style={{ textAlign: 'center', margin: '16px 0 24px' }}>
          <div style={{ fontSize: '32px', color: 'var(--gold)', marginBottom: '8px' }}>♛</div>
          <h2 style={{ fontFamily: '"Inter", sans-serif', fontWeight: 800, fontSize: '24px', color: 'var(--text-primary)', margin: 0 }}>Sign Up</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>Join ChessMaster Pro</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', color: '#f87171', marginBottom: '16px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. GarryKasparov"
              style={inputStyle}
              disabled={loading}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              style={inputStyle}
              disabled={loading}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              disabled={loading}
              required
            />
          </div>
          <button type="submit" style={btnPrimaryStyle} disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={handleGoogleSignIn} style={btnGhostStyle} disabled={loading}>
            <span style={{ marginRight: '8px', fontWeight: '800', fontSize: '16px', color: '#4285F4' }}>G</span> Continue with Google
          </button>
          
          <button onClick={handleGithubSignIn} style={btnGhostStyle} disabled={loading}>
            <Github size={16} style={{ marginRight: '8px' }} /> Continue with GitHub
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Already have an account? <span onClick={onSwitchToLogin} style={{ color: '#6bbd44', cursor: 'pointer', fontWeight: 600 }}>Log In</span>
        </p>
      </div>
    </div>
  );
}

export function LoginModal({ show, onClose, onSwitchToSignUp }) {
  const { login, loginWithGoogle, loginWithGithub } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password.trim());
      showToast('Logged in successfully!', 'success');
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      onClose();
    } catch (err) {
      showToast(err.message || 'Google Sign-In failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    try {
      setLoading(true);
      await loginWithGithub();
      onClose();
    } catch (err) {
      showToast(err.message || 'GitHub Sign-In failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <button onClick={onClose} style={closeBtnStyle} disabled={loading}>
          <X size={20} />
        </button>
        
        <div style={{ textAlign: 'center', margin: '16px 0 24px' }}>
          <div style={{ fontSize: '32px', color: 'var(--gold)', marginBottom: '8px' }}>♚</div>
          <h2 style={{ fontFamily: '"Inter", sans-serif', fontWeight: 800, fontSize: '24px', color: 'var(--text-primary)', margin: 0 }}>Log In</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>Welcome back to ChessMaster Pro</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', color: '#f87171', marginBottom: '16px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              style={inputStyle}
              disabled={loading}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              disabled={loading}
              required
            />
          </div>
          <button type="submit" style={btnPrimaryStyle} disabled={loading}>
            {loading ? 'Logging In...' : 'Log In'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={handleGoogleSignIn} style={btnGhostStyle} disabled={loading}>
            <span style={{ marginRight: '8px', fontWeight: '800', fontSize: '16px', color: '#4285F4' }}>G</span> Continue with Google
          </button>
          
          <button onClick={handleGithubSignIn} style={btnGhostStyle} disabled={loading}>
            <Github size={16} style={{ marginRight: '8px' }} /> Continue with GitHub
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Don't have an account? <span onClick={onSwitchToSignUp} style={{ color: '#6bbd44', cursor: 'pointer', fontWeight: 600 }}>Sign Up</span>
        </p>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.82)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backdropFilter: 'blur(5px)'
};

const cardStyle = {
  background: '#1e1e1e', border: '1px solid #333333',
  borderRadius: '12px', padding: '32px 28px', width: '400px', maxWidth: 'calc(100vw - 32px)',
  position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
};

const closeBtnStyle = {
  position: 'absolute', top: '16px', right: '16px',
  width: '30px', height: '30px', borderRadius: '50%',
  background: '#2d2d2d', border: 'none', color: '#aaaaaa', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s'
};

const labelStyle = {
  display: 'block', fontSize: '12px', color: '#aaaaaa', marginBottom: '6px', fontWeight: 600
};

const inputStyle = {
  width: '100%', height: '42px', background: '#2b2b2b',
  border: '1px solid #3a3a3a', borderRadius: '6px',
  padding: '0 12px', fontSize: '14px', color: '#ffffff', outline: 'none', transition: 'border-color 0.2s'
};

const btnPrimaryStyle = {
  width: '100%', height: '44px', marginTop: '12px',
  background: '#6bbd44', color: '#ffffff', border: 'none',
  fontWeight: 700, fontSize: '14px', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s'
};

const btnGhostStyle = {
  width: '100%', height: '42px', background: '#2b2b2b',
  border: '1px solid #3a3a3a', color: '#ffffff', fontWeight: 600,
  fontSize: '14px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s, border-color 0.2s'
};
