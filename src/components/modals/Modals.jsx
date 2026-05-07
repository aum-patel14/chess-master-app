import { X } from 'lucide-react';

export function SignUpModal({ show, onClose, onSwitchToLogin }) {
  if (!show) return null;

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <button onClick={onClose} style={closeBtnStyle}>
          <X size={20} />
        </button>
        
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <div style={{ fontSize: '28px', color: 'var(--gold)', marginBottom: '8px' }}>♚</div>
          <h2 style={{ fontFamily: '"Cinzel", serif', fontSize: '24px', color: 'var(--text-primary)', margin: 0 }}>Sign Up</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>Free forever</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Username</label>
            <input type="text" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" style={inputStyle} />
          </div>
          <button style={btnPrimaryStyle}>Create Account</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        <button style={btnGhostStyle}>
          <span style={{ marginRight: '8px', fontWeight: 'bold' }}>G</span> Continue with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Already have an account? <span onClick={onSwitchToLogin} style={{ color: 'var(--gold)', cursor: 'pointer' }}>Log In</span>
        </p>
      </div>
    </div>
  );
}

export function LoginModal({ show, onClose, onSwitchToSignUp }) {
  if (!show) return null;

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <button onClick={onClose} style={closeBtnStyle}>
          <X size={20} />
        </button>
        
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <div style={{ fontSize: '28px', color: 'var(--gold)', marginBottom: '8px' }}>♚</div>
          <h2 style={{ fontFamily: '"Cinzel", serif', fontSize: '24px', color: 'var(--text-primary)', margin: 0 }}>Log In</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" style={inputStyle} />
          </div>
          <div style={{ textAlign: 'right', marginTop: '-4px' }}>
            <span style={{ color: 'var(--gold)', fontSize: '12px', cursor: 'pointer' }}>Forgot password?</span>
          </div>
          <button style={btnPrimaryStyle}>Log In</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        <button style={btnGhostStyle}>
          <span style={{ marginRight: '8px', fontWeight: 'bold' }}>G</span> Continue with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Don't have an account? <span onClick={onSwitchToSignUp} style={{ color: 'var(--gold)', cursor: 'pointer' }}>Sign Up</span>
        </p>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.75)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backdropFilter: 'blur(4px)'
};

const cardStyle = {
  background: 'var(--bg-card)', border: '1px solid var(--border-hover)',
  borderRadius: '12px', padding: '36px 32px', width: '400px', maxWidth: 'calc(100vw - 32px)',
  position: 'relative'
};

const closeBtnStyle = {
  position: 'absolute', top: '12px', right: '12px',
  width: '28px', height: '28px', borderRadius: '50%',
  background: 'var(--bg-hover)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const labelStyle = {
  display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px'
};

const inputStyle = {
  width: '100%', height: '40px', background: 'var(--bg-input)',
  border: '1px solid var(--border)', borderRadius: '6px',
  padding: '0 12px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none'
};

const btnPrimaryStyle = {
  width: '100%', height: '42px', marginTop: '8px',
  background: 'var(--gold)', color: '#fff', border: 'none',
  fontWeight: 700, fontSize: '14px', borderRadius: '6px', cursor: 'pointer'
};

const btnGhostStyle = {
  width: '100%', height: '42px', background: 'transparent',
  border: '1px solid var(--border-hover)', color: 'var(--text-primary)',
  fontSize: '14px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
};
