import { X } from 'lucide-react';

export function SignUpModal({ show, onClose, onSwitchToLogin }) {
  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="animate-fade-up" style={{
        background: '#14141F', border: '1px solid var(--lp-border-gold)', borderRadius: '20px',
        padding: '40px', width: '100%', maxWidth: '440px', position: 'relative'
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}>
          <X size={24} />
        </button>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '32px', color: 'var(--lp-gold)', marginBottom: '16px' }}>♚</div>
          <h2 style={{ fontFamily: '"Cinzel", serif', fontSize: '24px', color: 'var(--lp-text-primary)', marginBottom: '8px' }}>Join ChessMaster Pro</h2>
          <p style={{ color: 'var(--lp-text-secondary)', fontSize: '14px' }}>Free forever. No credit card required.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input type="text" placeholder="Full Name" style={inputStyle} />
          <input type="email" placeholder="Email Address" style={inputStyle} />
          <input type="password" placeholder="Password" style={inputStyle} />
          <button style={btnPrimaryStyle}>Create Account →</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--lp-border)' }} />
          <span style={{ color: '#555', fontSize: '12px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--lp-border)' }} />
        </div>

        <button style={btnGhostStyle}>
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--lp-text-secondary)' }}>
          Already have an account? <span onClick={onSwitchToLogin} style={{ color: 'var(--lp-gold)', cursor: 'pointer' }}>Log In</span>
        </p>
      </div>
    </div>
  );
}

export function LoginModal({ show, onClose, onSwitchToSignUp }) {
  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="animate-fade-up" style={{
        background: '#14141F', border: '1px solid var(--lp-border-gold)', borderRadius: '20px',
        padding: '40px', width: '100%', maxWidth: '440px', position: 'relative'
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}>
          <X size={24} />
        </button>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '32px', color: 'var(--lp-gold)', marginBottom: '16px' }}>♚</div>
          <h2 style={{ fontFamily: '"Cinzel", serif', fontSize: '24px', color: 'var(--lp-text-primary)' }}>Welcome Back</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input type="email" placeholder="Email Address" style={inputStyle} />
          <input type="password" placeholder="Password" style={inputStyle} />
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: 'var(--lp-gold)', fontSize: '12px', cursor: 'pointer' }}>Forgot password?</span>
          </div>
          <button style={btnPrimaryStyle}>Log In →</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--lp-border)' }} />
          <span style={{ color: '#555', fontSize: '12px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--lp-border)' }} />
        </div>

        <button style={btnGhostStyle}>
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--lp-text-secondary)' }}>
          Don't have an account? <span onClick={onSwitchToSignUp} style={{ color: 'var(--lp-gold)', cursor: 'pointer' }}>Sign Up</span>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', height: '44px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--lp-border)', padding: '0 16px', color: 'var(--lp-text-primary)',
  fontSize: '14px', outline: 'none'
};

const btnPrimaryStyle = {
  width: '100%', height: '52px', borderRadius: '12px', background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
  border: 'none', color: '#000', fontWeight: 700, fontSize: '15px', cursor: 'pointer', marginTop: '8px'
};

const btnGhostStyle = {
  width: '100%', height: '44px', borderRadius: '8px', background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)', color: 'var(--lp-text-primary)', fontSize: '14px', cursor: 'pointer'
};
