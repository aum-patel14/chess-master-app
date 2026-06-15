import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGameInvite } from '../hooks/useGameInvite';
import { useToast } from '../hooks/useToast';
import { SignUpModal, LoginModal } from '../components/Modals';
import { ShieldAlert, Users, RotateCw } from 'lucide-react';
import PageShell from '../components/PageShell';

export default function JoinGame() {
  const { code } = useParams<{ code: string }>();
  const { currentUser } = useAuth();
  const { joinRoom } = useGameInvite();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'error' | 'unauthorized'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Auth modals
  const [showSignUp, setShowSignUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const isGuest = !currentUser || currentUser.uid === 'guest';

  useEffect(() => {
    if (!code) {
      setStatus('error');
      setErrorMsg('No invite code provided.');
      return;
    }

    if (isGuest) {
      setStatus('unauthorized');
      return;
    }

    const triggerJoin = async () => {
      try {
        setStatus('loading');
        await joinRoom(code.toUpperCase());
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'Failed to join game room.');
      }
    };

    triggerJoin();
  }, [code, currentUser, isGuest]);

  if (status === 'unauthorized') {
    return (
      <PageShell>
        <div style={container}>
          <div style={card}>
            <div style={badgeIcon}>⚔️</div>
            <h2 style={title}>Sign In to Join Match</h2>
            <p style={description}>
              You have been invited to join a ChessMaster online game room ({code?.toUpperCase()}). Please sign in to join.
            </p>
            <div style={actionButtons}>
              <button style={btnPrimary} onClick={() => setShowLogin(true)}>Log In</button>
              <button style={btnSecondary} onClick={() => setShowSignUp(true)}>Sign Up</button>
            </div>
          </div>
          <LoginModal show={showLogin} onClose={() => setShowLogin(false)} onSwitchToSignUp={() => { setShowLogin(false); setShowSignUp(true); }} />
          <SignUpModal show={showSignUp} onClose={() => setShowSignUp(false)} onSwitchToLogin={() => { setShowSignUp(false); setShowLogin(true); }} />
        </div>
      </PageShell>
    );
  }

  if (status === 'error') {
    return (
      <PageShell>
        <div style={container}>
          <div style={card}>
            <ShieldAlert style={errorIcon} />
            <h2 style={errorTitle}>Could Not Join Game</h2>
            <p style={errorText}>{errorMsg}</p>
            <button style={btnPrimary} onClick={() => navigate('/play/online')}>
              Back to Lobby
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div style={container}>
        <div style={card}>
          <div style={spinnerContainer}>
            <RotateCw style={spinnerIcon} />
          </div>
          <h2 style={title}>Connecting to Match...</h2>
          <p style={description}>
            Joining online room <span style={{ color: 'var(--gold)', fontWeight: 800 }}>{code?.toUpperCase()}</span>. Establishing connection...
          </p>
        </div>
      </div>
    </PageShell>
  );
}

// Styling definitions
const container = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '70vh',
  padding: '24px',
  boxSizing: 'border-box' as const
};

const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '40px 24px',
  maxWidth: '440px',
  width: '100%',
  boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  textAlign: 'center' as const,
  boxSizing: 'border-box' as const
};

const badgeIcon = {
  fontSize: '48px',
  marginBottom: '16px'
};

const title = {
  fontFamily: 'Cinzel, serif',
  fontSize: '20px',
  color: 'var(--gold)',
  margin: '0 0 12px'
};

const description = {
  fontSize: '14px',
  color: 'var(--text-secondary)',
  lineHeight: 1.5,
  marginBottom: '28px'
};

const actionButtons = {
  display: 'flex',
  flexDirection: 'column' as const,
  width: '100%',
  gap: '12px'
};

const btnPrimary = {
  width: '100%',
  minHeight: '46px',
  borderRadius: '8px',
  background: 'var(--gold)',
  border: 'none',
  color: '#0a0a14',
  fontWeight: 800,
  fontSize: '14.5px',
  cursor: 'pointer'
};

const btnSecondary = {
  width: '100%',
  minHeight: '46px',
  borderRadius: '8px',
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  fontWeight: 600,
  fontSize: '14.5px',
  cursor: 'pointer'
};

const errorIcon = {
  color: '#ff6b6b',
  width: '48px',
  height: '48px',
  marginBottom: '16px'
};

const errorTitle = {
  fontFamily: 'Cinzel, serif',
  fontSize: '20px',
  color: '#ff6b6b',
  margin: '0 0 12px'
};

const errorText = {
  fontSize: '14px',
  color: 'var(--text-secondary)',
  lineHeight: 1.5,
  marginBottom: '28px'
};

const spinnerContainer = {
  marginBottom: '16px'
};

const spinnerIcon = {
  width: '40px',
  height: '40px',
  color: 'var(--gold)',
  animation: 'spin 1.2s linear infinite'
};
