import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMatchmaking } from '../hooks/useMatchmaking';
import { useGameInvite } from '../hooks/useGameInvite';
import { useToast } from '../hooks/useToast';
import { Cpu, Users, Copy, Share2, Play, X, Shield, Clock } from 'lucide-react';
import { SignUpModal, LoginModal } from '../components/Modals';
import PageShell from '../components/PageShell';
import { supabase } from '../services/supabase';

const TIME_CONTROLS = {
  bullet: [
    { label: '1m', value: 'bullet_1_0', desc: '1+0 • Bullet' },
    { label: '1+1', value: 'bullet_1_1', desc: '1+1 • Bullet' },
    { label: '2+1', value: 'bullet_2_1', desc: '2+1 • Bullet' },
  ],
  blitz: [
    { label: '3m', value: 'blitz_3_0', desc: '3+0 • Blitz' },
    { label: '3+2', value: 'blitz_3_2', desc: '3+2 • Blitz' },
    { label: '5m', value: 'blitz_5_0', desc: '5+0 • Blitz' },
  ],
  rapid: [
    { label: '10m', value: 'rapid_10_0', desc: '10+0 • Rapid' },
    { label: '15+10', value: 'rapid_15_10', desc: '15+10 • Rapid' },
  ],
  classical: [
    { label: '30m', value: 'classical_30_0', desc: '30+0 • Classical' },
  ]
};

export default function PlayOnline() {
  const { currentUser, userData } = useAuth();
  const { isQueued, joinQueue, leaveQueue } = useMatchmaking();
  const { createRoom } = useGameInvite();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'bullet' | 'blitz' | 'rapid' | 'classical'>('blitz');
  const [selectedTimeControl, setSelectedTimeControl] = useState('blitz_3_0');
  const [isRated, setIsRated] = useState(true);
  const [activeGameCode, setActiveGameCode] = useState<string | null>(null);

  useEffect(() => {
    const checkActiveGame = async () => {
      if (!currentUser || currentUser.uid === 'guest') return;
      const saved = localStorage.getItem('active_online_game');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.roomCode) {
            const { data, error } = await supabase
              .from('online_games')
              .select('status')
              .eq('room_code', parsed.roomCode)
              .maybeSingle();

            if (data && data.status === 'active' && !error) {
              setActiveGameCode(parsed.roomCode);
            } else {
              localStorage.removeItem('active_online_game');
            }
          }
        } catch (e) {
          console.error('Error checking active game:', e);
        }
      }
    };
    checkActiveGame();
  }, [currentUser]);

  // Friend room states
  const [friendTime, setFriendTime] = useState('blitz_3_0');
  const [friendRated, setFriendRated] = useState(true);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const { joinRoom } = useGameInvite();

  // Auth modals
  const [showSignUp, setShowSignUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Queue elapsed timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<any>(null);

  const isGuest = !currentUser || currentUser.uid === 'guest';

  useEffect(() => {
    if (isQueued) {
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(e => e + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isQueued]);

  const handleStartMatchmaking = () => {
    joinQueue(selectedTimeControl, isRated);
  };

  const handleCancelMatchmaking = () => {
    leaveQueue();
  };

  const handleCreateFriendRoom = async () => {
    const code = await createRoom(friendTime, friendRated);
    if (code) {
      setCreatedRoomCode(code);
    }
  };

  const handleJoinFriendRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    try {
      await joinRoom(joinCodeInput.trim().toUpperCase());
    } catch (err) {
      // Toast already handled by hook
    }
  };

  const copyInviteLink = () => {
    if (!createdRoomCode) return;
    const link = `${window.location.origin}/#/join/${createdRoomCode}`;
    navigator.clipboard.writeText(link);
    showToast('Invite link copied!', 'success');
  };

  const shareInviteLink = async () => {
    if (!createdRoomCode) return;
    const link = `${window.location.origin}/#/join/${createdRoomCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my ChessMaster Match',
          text: `I've created a custom chess room. Join me to play!`,
          url: link,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      copyInviteLink();
    }
  };

  // Estimate wait time based on time control length
  const getEstimatedWait = () => {
    if (selectedTimeControl.startsWith('bullet')) return '10s - 20s';
    if (selectedTimeControl.startsWith('blitz')) return '15s - 30s';
    if (selectedTimeControl.startsWith('rapid')) return '30s - 60s';
    return '1m - 3m';
  };

  if (isGuest) {
    return (
      <PageShell>
        <div style={container}>
          <div style={lobbyHeaderContainer}>
            <h1 style={lobbyTitle}>Online Arena</h1>
            <p style={lobbySubtitle}>Challenge players worldwide in real-time matches</p>
          </div>
          <div style={guestCardContainer}>
            <div style={guestIcon}>⚔️</div>
            <h2 style={guestTitle}>Create a free account to play online</h2>
            <p style={guestText}>
              Online arena matches, custom friend lobbies, and live Elo rating calculations require a registered ChessMaster Pro account. Create yours now in seconds!
            </p>
            <div style={guestActionButtons}>
              <button style={btnPrimary} onClick={() => setShowLogin(true)}>Log In</button>
              <button style={btnSecondary} onClick={() => setShowSignUp(true)}>Create Account</button>
            </div>
          </div>
          <LoginModal show={showLogin} onClose={() => setShowLogin(false)} onSwitchToSignUp={() => { setShowLogin(false); setShowSignUp(true); }} />
          <SignUpModal show={showSignUp} onClose={() => setShowSignUp(false)} onSwitchToLogin={() => { setShowSignUp(false); setShowLogin(true); }} />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div style={container}>
        <div style={lobbyHeaderContainer}>
          <h1 style={lobbyTitle}>Online Arena</h1>
          <p style={lobbySubtitle}>Choose your format and challenge the world</p>
        </div>

        {activeGameCode && (
          <div style={resumeBanner}>
            <style>{`
              @keyframes pulse {
                0% { transform: scale(0.9); opacity: 0.6; }
                50% { transform: scale(1.2); opacity: 1; }
                100% { transform: scale(0.9); opacity: 0.6; }
              }
            `}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                width: '10px',
                height: '10px',
                backgroundColor: '#81b64c',
                borderRadius: '50%',
                display: 'inline-block',
                boxShadow: '0 0 8px #81b64c',
                animation: 'pulse 1.5s infinite ease-in-out'
              }} />
              <div style={{ textAlign: 'left' }}>
                <strong style={{ color: '#fff', fontSize: '15px', display: 'block' }}>Game in Progress!</strong>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                  You have an active match ({activeGameCode}) in progress.
                </span>
              </div>
            </div>
            <button 
              style={btnResume}
              onClick={() => navigate(`/play/online/${activeGameCode}`)}
            >
              Resume Game
            </button>
          </div>
        )}

        {isQueued ? (
          <div style={queueOverlay}>
            <div style={spinnerContainer}>
              <div style={doubleSpinner} />
            </div>
            <h2 style={queueTitle}>Searching for Opponent</h2>
            <p style={queueDetails}>
              Format: <span style={{ color: 'var(--gold)' }}>{selectedTimeControl.replace('_', ' ').toUpperCase()}</span> • {isRated ? 'Rated' : 'Casual'}
            </p>
            <div style={queueTimerContainer}>
              <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
              <span>Elapsed: {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</span>
            </div>
            <p style={queueEst}>Estimated wait: {getEstimatedWait()}</p>
            <button style={btnCancel} onClick={handleCancelMatchmaking}>
              Cancel Search <X size={16} />
            </button>
          </div>
        ) : (
          <div style={dashboardGrid}>
            {/* Play Friend Card */}
            <div style={lobbyCard}>
              <div style={cardHeader}>
                <Users style={cardIcon} />
                <div>
                  <h2 style={cardTitle}>Play with a Friend</h2>
                  <p style={cardSubtitle}>Create custom lobbies or join via invite code</p>
                </div>
              </div>

              {!createdRoomCode ? (
                <div style={cardContent}>
                  <div style={inputGroup}>
                    <label style={labelStyle}>Time Control</label>
                    <select 
                      value={friendTime} 
                      onChange={(e) => setFriendTime(e.target.value)} 
                      style={selectInput}
                    >
                      <optgroup label="Bullet">
                        <option value="bullet_1_0">1+0 (Bullet)</option>
                        <option value="bullet_1_1">1+1 (Bullet)</option>
                        <option value="bullet_2_1">2+1 (Bullet)</option>
                      </optgroup>
                      <optgroup label="Blitz">
                        <option value="blitz_3_0">3+0 (Blitz)</option>
                        <option value="blitz_3_2">3+2 (Blitz)</option>
                        <option value="blitz_5_0">5+0 (Blitz)</option>
                      </optgroup>
                      <optgroup label="Rapid">
                        <option value="rapid_10_0">10+0 (Rapid)</option>
                        <option value="rapid_15_10">15+10 (Rapid)</option>
                      </optgroup>
                      <optgroup label="Classical">
                        <option value="classical_30_0">30+0 (Classical)</option>
                      </optgroup>
                    </select>
                  </div>

                  <div style={toggleRow}>
                    <span style={toggleLabel}>Rated Match (Affects Elo)</span>
                    <button 
                      style={{ ...toggleBtn, background: friendRated ? 'var(--gold)' : 'var(--bg-input)', color: friendRated ? '#0a0a14' : 'var(--text-primary)' }}
                      onClick={() => setFriendRated(!friendRated)}
                    >
                      {friendRated ? <Shield size={14} /> : null} {friendRated ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <button style={btnPrimary} onClick={handleCreateFriendRoom}>
                    Create Custom Lobby
                  </button>

                  <div style={cardDivider}>
                    <span style={dividerText}>Or join lobby</span>
                  </div>

                  <form onSubmit={handleJoinFriendRoom} style={joinForm}>
                    <input
                      type="text"
                      placeholder="Enter 6-char code"
                      maxLength={6}
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value)}
                      style={joinInput}
                    />
                    <button type="submit" style={btnJoin}>
                      Join <Play size={14} />
                    </button>
                  </form>
                </div>
              ) : (
                <div style={roomDisplayContainer}>
                  <h3 style={roomHeading}>Lobby Room Created!</h3>
                  <p style={roomSub}>Share code below with your friend to connect.</p>
                  
                  <div style={codeBox}>
                    <span style={codeText}>{createdRoomCode}</span>
                    <button style={codeCopyBtn} onClick={copyInviteLink} title="Copy Code">
                      <Copy size={18} />
                    </button>
                  </div>

                  <div style={shareActionGrid}>
                    <button style={btnShare} onClick={copyInviteLink}>
                      Copy Link <Copy size={16} />
                    </button>
                    <button style={btnShareGold} onClick={shareInviteLink}>
                      Share Room <Share2 size={16} />
                    </button>
                  </div>

                  <div style={waitingBanner}>
                    <div style={miniPulseSpinner} />
                    <span>Waiting for friend to connect...</span>
                  </div>

                  <button style={btnCancelLobby} onClick={() => setCreatedRoomCode(null)}>
                    Delete Lobby
                  </button>
                </div>
              )}
            </div>

            {/* Matchmaking Card */}
            <div style={lobbyCard}>
              <div style={cardHeader}>
                <Cpu style={cardIcon} />
                <div>
                  <h2 style={cardTitle}>Play with Anyone</h2>
                  <p style={cardSubtitle}>Match instantly with a similarly rated opponent</p>
                </div>
              </div>

              <div style={cardContent}>
                {/* Time Control Categories */}
                <div style={tabContainer}>
                  {Object.keys(TIME_CONTROLS).map((cat) => (
                    <button
                      key={cat}
                      style={{
                        ...tabBtn,
                        background: activeTab === cat ? 'rgba(212,175,55,0.1)' : 'transparent',
                        borderColor: activeTab === cat ? 'var(--gold)' : 'transparent',
                        color: activeTab === cat ? 'var(--gold)' : 'var(--text-secondary)'
                      }}
                      onClick={() => {
                        setActiveTab(cat as any);
                        const defaultVal = TIME_CONTROLS[cat as keyof typeof TIME_CONTROLS][0].value;
                        setSelectedTimeControl(defaultVal);
                      }}
                    >
                      {cat.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Sub presets */}
                <div style={presetsGrid}>
                  {TIME_CONTROLS[activeTab].map((ctrl) => (
                    <button
                      key={ctrl.value}
                      style={{
                        ...presetChip,
                        borderColor: selectedTimeControl === ctrl.value ? 'var(--gold)' : 'var(--border)',
                        background: selectedTimeControl === ctrl.value ? 'rgba(212,175,55,0.05)' : 'var(--bg-input)',
                        color: selectedTimeControl === ctrl.value ? 'var(--gold)' : 'var(--text-primary)'
                      }}
                      onClick={() => setSelectedTimeControl(ctrl.value)}
                    >
                      <div style={chipLabel}>{ctrl.label}</div>
                      <div style={chipDesc}>{ctrl.desc.split(' • ')[1]}</div>
                    </button>
                  ))}
                </div>

                <div style={toggleRow}>
                  <span style={toggleLabel}>Rated Arena Match (± Elo)</span>
                  <button 
                    style={{ ...toggleBtn, background: isRated ? 'var(--gold)' : 'var(--bg-input)', color: isRated ? '#0a0a14' : 'var(--text-primary)' }}
                    onClick={() => setIsRated(!isRated)}
                  >
                    {isRated ? <Shield size={14} /> : null} {isRated ? 'ON' : 'OFF'}
                  </button>
                </div>

                <button style={btnPrimaryGold} onClick={handleStartMatchmaking}>
                  Find Match <Play size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

// Styling definitions
const container = {
  width: '100%',
  maxWidth: '960px',
  margin: '0 auto',
  padding: '40px 24px',
  boxSizing: 'border-box' as const
};

const lobbyHeaderContainer = {
  textAlign: 'center' as const,
  marginBottom: '40px'
};

const lobbyTitle = {
  fontFamily: 'Cinzel, serif',
  fontSize: '32px',
  color: 'var(--text-primary)',
  margin: '0 0 10px',
  letterSpacing: '1px'
};

const lobbySubtitle = {
  fontSize: '15px',
  color: 'var(--text-secondary)',
  margin: 0
};

const dashboardGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
  gap: '32px'
};

const lobbyCard = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '28px',
  boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
  display: 'flex',
  flexDirection: 'column' as const,
  boxSizing: 'border-box' as const
};

const cardHeader = {
  display: 'flex',
  gap: '16px',
  alignItems: 'center',
  paddingBottom: '20px',
  borderBottom: '1px solid var(--border)',
  marginBottom: '20px'
};

const cardIcon = {
  color: 'var(--gold)',
  width: '28px',
  height: '28px'
};

const cardTitle = {
  fontFamily: 'Cinzel, serif',
  fontSize: '18px',
  margin: '0 0 4px',
  color: 'var(--text-primary)'
};

const cardSubtitle = {
  fontSize: '12.5px',
  color: 'var(--text-secondary)',
  margin: 0
};

const cardContent = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '20px'
};

const inputGroup = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px'
};

const labelStyle = {
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  color: 'var(--text-secondary)'
};

const selectInput = {
  minHeight: '44px',
  borderRadius: '8px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  padding: '0 12px',
  fontSize: '14px',
  outline: 'none',
  cursor: 'pointer'
};

const toggleRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  minHeight: '40px'
};

const toggleLabel = {
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--text-secondary)'
};

const toggleBtn = {
  minWidth: '72px',
  minHeight: '34px',
  borderRadius: '6px',
  border: 'none',
  fontWeight: 800,
  fontSize: '12px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  transition: 'all 0.15s'
};

const btnPrimary = {
  width: '100%',
  minHeight: '46px',
  borderRadius: '8px',
  background: 'transparent',
  border: '2px solid var(--gold)',
  color: 'var(--gold)',
  fontWeight: 700,
  fontSize: '14.5px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  transition: 'all 0.15s'
};

const btnPrimaryGold = {
  width: '100%',
  minHeight: '48px',
  borderRadius: '8px',
  background: 'var(--gold)',
  border: 'none',
  color: '#0a0a14',
  fontWeight: 800,
  fontSize: '15px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  boxShadow: '0 4px 16px rgba(212,175,55,0.2)'
};

const cardDivider = {
  display: 'flex',
  alignItems: 'center',
  textAlign: 'center' as const,
  color: 'var(--text-muted)',
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  fontWeight: 700,
  margin: '10px 0'
};

const dividerText = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  justifyContent: 'center',
  whiteSpace: 'nowrap' as const,
  ':before': { content: '""', flex: 1, borderBottom: '1px solid var(--border)' },
  ':after': { content: '""', flex: 1, borderBottom: '1px solid var(--border)' }
};

const joinForm = {
  display: 'flex',
  gap: '8px'
};

const joinInput = {
  flex: 1,
  minHeight: '42px',
  borderRadius: '8px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  padding: '0 12px',
  fontSize: '14.5px',
  fontWeight: 700,
  letterSpacing: '1px',
  textAlign: 'center' as const
};

const btnJoin = {
  minHeight: '42px',
  padding: '0 20px',
  borderRadius: '8px',
  background: 'var(--gold)',
  color: '#0a0a14',
  border: 'none',
  fontWeight: 800,
  fontSize: '13.5px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};

const roomDisplayContainer = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px 0',
  gap: '16px'
};

const roomHeading = {
  fontFamily: 'Cinzel, serif',
  fontSize: '20px',
  color: 'var(--gold)',
  margin: 0
};

const roomSub = {
  fontSize: '13px',
  color: 'var(--text-secondary)',
  margin: 0,
  textAlign: 'center' as const
};

const codeBox = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '16px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-hover)',
  borderRadius: '8px',
  padding: '14px 28px',
  width: '100%',
  boxSizing: 'border-box' as const
};

const codeText = {
  fontSize: '26px',
  fontWeight: 900,
  letterSpacing: '3px',
  color: 'var(--text-primary)',
  fontFamily: 'monospace'
};

const codeCopyBtn = {
  background: 'transparent',
  border: 'none',
  color: 'var(--gold)',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center'
};

const shareActionGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px',
  width: '100%'
};

const btnShare = {
  minHeight: '40px',
  borderRadius: '6px',
  background: 'var(--bg-hover)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  fontWeight: 600,
  fontSize: '13px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px'
};

const btnShareGold = {
  minHeight: '40px',
  borderRadius: '6px',
  background: 'var(--gold)',
  border: 'none',
  color: '#0a0a14',
  fontWeight: 700,
  fontSize: '13px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px'
};

const waitingBanner = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '12px',
  color: 'var(--text-secondary)',
  marginTop: '8px'
};

const miniPulseSpinner = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: 'var(--gold)',
  animation: 'pulse 1.5s infinite ease-in-out'
};

const btnCancelLobby = {
  width: '100%',
  minHeight: '42px',
  borderRadius: '8px',
  background: 'rgba(255, 60, 60, 0.08)',
  border: '1px solid rgba(255, 60, 60, 0.25)',
  color: '#ff6b6b',
  fontWeight: 600,
  fontSize: '13.5px',
  cursor: 'pointer',
  marginTop: '12px'
};

const tabContainer = {
  display: 'flex',
  borderBottom: '1px solid var(--border)',
  marginBottom: '10px'
};

const tabBtn = {
  flex: 1,
  minHeight: '38px',
  border: 'none',
  borderBottom: '2px solid transparent',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.15s'
};

const presetsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
  gap: '8px'
};

const presetChip = {
  minHeight: '52px',
  borderRadius: '8px',
  border: '1px solid',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s',
  padding: '6px'
};

const chipLabel = {
  fontWeight: 800,
  fontSize: '14.5px'
};

const chipDesc = {
  fontSize: '9.5px',
  opacity: 0.7,
  marginTop: '2px'
};

const queueOverlay = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '60px 40px',
  maxWidth: '480px',
  margin: '20px auto',
  boxShadow: '0 12px 64px rgba(0,0,0,0.6)',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box' as const
};

const spinnerContainer = {
  marginBottom: '32px'
};

const doubleSpinner = {
  width: '56px',
  height: '56px',
  borderRadius: '50%',
  border: '3px solid rgba(212,175,55,0.06)',
  borderTopColor: 'var(--gold)',
  borderBottomColor: 'var(--gold)',
  animation: 'spin 1.5s linear infinite'
};

const queueTitle = {
  fontFamily: 'Cinzel, serif',
  fontSize: '22px',
  color: 'var(--gold)',
  margin: '0 0 8px'
};

const queueDetails = {
  fontSize: '14px',
  color: 'var(--text-secondary)',
  margin: '0 0 24px'
};

const queueTimerContainer = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '15px',
  fontWeight: 700,
  color: 'var(--text-primary)',
  marginBottom: '8px'
};

const queueEst = {
  fontSize: '12px',
  color: 'var(--text-muted)',
  margin: '0 0 32px'
};

const btnCancel = {
  minHeight: '44px',
  width: '180px',
  borderRadius: '8px',
  background: 'rgba(255, 60, 60, 0.08)',
  border: '1px solid rgba(255, 60, 60, 0.25)',
  color: '#ff6b6b',
  fontWeight: 700,
  fontSize: '14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px'
};

const guestCardContainer = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '40px',
  maxWidth: '480px',
  margin: '20px auto',
  boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  textAlign: 'center' as const,
  boxSizing: 'border-box' as const
};

const guestIcon = {
  fontSize: '56px',
  marginBottom: '20px'
};

const guestTitle = {
  fontFamily: 'Cinzel, serif',
  fontSize: '22px',
  color: 'var(--gold)',
  margin: '0 0 12px'
};

const guestText = {
  fontSize: '14.5px',
  color: 'var(--text-secondary)',
  lineHeight: 1.55,
  marginBottom: '32px'
};

const guestActionButtons = {
  display: 'flex',
  flexDirection: 'column' as const,
  width: '100%',
  gap: '12px'
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

const resumeBanner = {
  background: 'linear-gradient(90deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 100%)',
  border: '1px solid rgba(212,175,55,0.3)',
  borderRadius: '12px',
  padding: '16px 24px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '28px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
  boxSizing: 'border-box' as const,
  width: '100%'
};

const btnResume = {
  background: 'var(--gold)',
  color: '#0a0a14',
  border: 'none',
  borderRadius: '8px',
  padding: '10px 20px',
  fontWeight: 800,
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.15s',
  boxShadow: '0 2px 8px rgba(212,175,55,0.3)'
};
