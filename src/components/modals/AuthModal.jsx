import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Mail, Lock, User } from 'lucide-react';
import './AuthModal.css';

export default function AuthModal({ show, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, signup, loginWithGoogle, loginWithFacebook, loginWithApple } = useAuth();

  if (!show) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, displayName);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  }

  async function handleSocial(providerFunc) {
    setError('');
    setLoading(true);
    try {
      await providerFunc();
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <div className="icon-btn-wrapper" style={{ position: 'absolute', top: '8px', right: '8px' }}>
          <button className="modal-close small-icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <h2>{isLogin ? 'Welcome Back' : 'Create an Account'}</h2>
        <p className="auth-subtitle">
          {isLogin ? 'Log in to sync your progress across devices.' : 'Join to track your Elo rating and save your games.'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <div className="social-logins">
          <button className="social-btn google" onClick={() => handleSocial(loginWithGoogle)}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" width="18" />
            Continue with Google
          </button>
          <button className="social-btn facebook" onClick={() => handleSocial(loginWithFacebook)}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/facebook.svg" alt="F" width="18" />
            Continue with Facebook
          </button>
          <button className="social-btn apple" onClick={() => handleSocial(loginWithApple)}>
            <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '2px' }}></span>
            Continue with Apple
          </button>
        </div>

        <div className="auth-divider">
          <span>or continue with email</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="input-group">
              <User size={18} className="input-icon" />
              <input 
                type="text" 
                placeholder="Username" 
                value={displayName} 
                onChange={e => setDisplayName(e.target.value)} 
                required 
              />
            </div>
          )}
          
          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input 
              type="email" 
              placeholder="Email address" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          
          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        <div className="auth-footer">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button className="toggle-auth-btn" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}
