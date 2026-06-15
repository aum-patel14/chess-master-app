import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { useToast } from '../../hooks/useToast';
import { Cpu, Users, Copy, Play } from 'lucide-react';
import { SignUpModal, LoginModal } from '../Modals';

const TIME_PRESETS = [
  { label: 'Bullet 1m', sec: 60 },
  { label: 'Blitz 3m', sec: 180 },
  { label: 'Rapid 10m', sec: 600 }
];

const SECONDS_TO_ENUM = {
  60: 'bullet_1_0',
  180: 'blitz_3_0',
  600: 'rapid_10_0'
};

const ENUM_TO_SECONDS = {
  'bullet_1_0': 60,
  'bullet_1_1': 60,
  'bullet_2_1': 120,
  'blitz_3_0': 180,
  'blitz_3_2': 180,
  'blitz_5_0': 300,
  'blitz_5_3': 300,
  'rapid_10_0': 600,
  'rapid_10_5': 600,
  'rapid_15_10': 900,
  'classical_30_0': 1800
};

export default function MultiplayerLobby({ onStartGame }) {
  const { currentUser, userData } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('matchmake'); // 'matchmake' | 'friend'
  const [selectedTime, setSelectedTime] = useState(180); // Default 3m Blitz
  const [joinCode, setJoinCode] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState(null);
  
  // Auth modals
  const [showSignUp, setShowSignUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Matchmaking status
  const [isQueued, setIsQueued] = useState(false);
  const [queueTime, setQueueTime] = useState(0);

  const isGuest = !currentUser || currentUser.uid === 'guest';

  // Timer for active queue
  useEffect(() => {
    let timer = null;
    if (isQueued) {
      setQueueTime(0);
      timer = setInterval(() => {
        setQueueTime(t => t + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isQueued]);

  // Subscribe to matchmaking matches
  useEffect(() => {
    if (!currentUser || currentUser.uid === 'guest') return;

    const channel = supabase
      .channel('lobby-matches')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'online_games',
          filter: `status=eq.active`
        },
        (payload) => {
          const game = payload.new;
          if (game.white_id === currentUser.uid || game.black_id === currentUser.uid) {
            setIsQueued(false);
            const isWhite = game.white_id === currentUser.uid;
            onStartGame({
              roomCode: game.room_code,
              color: isWhite ? 'white' : 'black',
              opponentName: isWhite ? game.black_username : game.white_username,
              opponentRating: isWhite ? game.black_elo : game.white_elo,
              timeControl: ENUM_TO_SECONDS[game.time_control] || 180
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, onStartGame]);

  // Subscribe to private room opponent joining
  useEffect(() => {
    if (!createdRoomCode) return;

    const channel = supabase
      .channel(`lobby-${createdRoomCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'online_games',
          filter: `room_code=eq.${createdRoomCode}`
        },
        (payload) => {
          const game = payload.new;
          if (game.status === 'active' && game.black_id) {
            setCreatedRoomCode(null);
            onStartGame({
              roomCode: game.room_code,
              color: 'white',
              opponentName: game.black_username,
              opponentRating: game.black_elo,
              timeControl: ENUM_TO_SECONDS[game.time_control] || selectedTime
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [createdRoomCode, onStartGame, selectedTime]);

  const handleJoinQueue = async () => {
    if (isGuest) return;
    setIsQueued(true);
    
    try {
      const tcEnum = SECONDS_TO_ENUM[selectedTime] || 'blitz_3_0';
      const username = userData?.username || currentUser?.displayName || 'Player';
      const elo = userData?.rating || 1200;
      
      const { data, error } = await supabase.rpc('join_matchmaking', {
        p_user_id: currentUser.uid,
        p_username: username,
        p_elo: elo,
        p_time_control: tcEnum,
        p_is_rated: true
      });
      
      if (error) {
        setIsQueued(false);
        showToast(error.message, 'error');
        return;
      }
      
      if (data && data.matched) {
        setIsQueued(false);
        const game = data.game;
        const isWhite = game.white_id === currentUser.uid;
        onStartGame({
          roomCode: game.room_code,
          color: isWhite ? 'white' : 'black',
          opponentName: isWhite ? game.black_username : game.white_username,
          opponentRating: isWhite ? game.black_elo : game.white_elo,
          timeControl: ENUM_TO_SECONDS[game.time_control] || selectedTime
        });
      }
    } catch (err) {
      setIsQueued(false);
      showToast('Error joining matchmaking queue', 'error');
      console.error(err);
    }
  };

  const handleCancelQueue = async () => {
    setIsQueued(false);
    if (!currentUser) return;
    try {
      await supabase
        .from('matchmaking_queue')
        .delete()
        .eq('user_id', currentUser.uid);
      showToast('Matchmaking queue cancelled', 'info');
    } catch (err) {
      console.error('Error cancelling queue:', err);
    }
  };

  const handleCreateRoom = async () => {
    if (isGuest) return;
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let roomCode = '';
    for (let i = 0; i < 6; i++) {
      roomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const tcEnum = SECONDS_TO_ENUM[selectedTime] || 'blitz_3_0';
    const username = userData?.username || currentUser?.displayName || 'Player';
    const elo = userData?.rating || 1200;
    
    try {
      const { error } = await supabase
        .from('online_games')
        .insert({
          room_code: roomCode,
          white_id: currentUser.uid,
          white_username: username,
          white_elo: elo,
          time_control: tcEnum,
          status: 'waiting'
        });
        
      if (error) {
        showToast('Failed to create private lobby. Please try again.', 'error');
        console.error(error);
        return;
      }
      
      setCreatedRoomCode(roomCode);
      showToast(`Private room created: ${roomCode}`, 'success');
    } catch (err) {
      showToast('Error creating room', 'error');
      console.error(err);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (isGuest || !joinCode) return;
    const cleanCode = joinCode.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      showToast('Room codes must be exactly 6 characters.', 'warning');
      return;
    }
    
    try {
      const username = userData?.username || currentUser?.displayName || 'Player';
      const elo = userData?.rating || 1200;
      
      const { data, error } = await supabase.rpc('join_private_game', {
        p_room_code: cleanCode,
        p_user_id: currentUser.uid,
        p_username: username,
        p_elo: elo
      });
      
      if (error) {
        showToast(error.message, 'error');
        return;
      }
      
      if (data && data.success) {
        const game = data.game;
        onStartGame({
          roomCode: game.room_code,
          color: 'black',
          opponentName: game.white_username,
          opponentRating: game.white_elo,
          timeControl: ENUM_TO_SECONDS[game.time_control] || 180
        });
      } else {
        showToast(data.message || 'Failed to join private room', 'error');
      }
    } catch (err) {
      showToast('Error joining room', 'error');
      console.error(err);
    }
  };

  const handleLeaveLobby = async () => {
    if (createdRoomCode) {
      try {
        await supabase
          .from('online_games')
          .delete()
          .eq('room_code', createdRoomCode)
          .eq('status', 'waiting');
      } catch (err) {
        console.error('Error deleting waiting game:', err);
      }
    }
    setCreatedRoomCode(null);
  };

  const copyRoomCode = () => {
    if (!createdRoomCode) return;
    navigator.clipboard.writeText(createdRoomCode);
    showToast('Lobby code copied to clipboard!', 'success');
  };

  if (isGuest) {
    return (
      <div style={lobbyWrapper}>
        <h2 style={lobbyHeader}>🌐 Online Multiplayer</h2>
        <div style={guestCard}>
          <div style={guestIconContainer}>⚔️</div>
          <h3 style={guestTitle}>Sign In to Play Online</h3>
          <p style={guestText}>
            Realtime multiplayer requires a registered account to track ratings, match histories, and unlock achievements.
          </p>
          <div style={guestActionButtons}>
            <button style={btnPrimary} onClick={() => setShowLogin(true)}>
              Log In
            </button>
            <button style={btnSecondary} onClick={() => setShowSignUp(true)}>
              Sign Up
            </button>
          </div>
        </div>

        <LoginModal 
          show={showLogin} 
          onClose={() => setShowLogin(false)} 
          onSwitchToSignUp={() => { setShowLogin(false); setShowSignUp(true); }} 
        />
        <SignUpModal 
          show={showSignUp} 
          onClose={() => setShowSignUp(false)} 
          onSwitchToLogin={() => { setShowSignUp(false); setShowLogin(true); }} 
        />
      </div>
    );
  }

  return (
    <div style={lobbyWrapper}>
      <h2 style={lobbyHeader}>🌐 Online Multiplayer</h2>
      
      {!isQueued && !createdRoomCode ? (
        <>
          <div style={tabContainer}>
            <button 
              style={{ ...tabBtn, background: activeTab === 'matchmake' ? 'var(--gold)' : 'var(--bg-hover)', color: activeTab === 'matchmake' ? '#0a0a14' : 'var(--text-primary)' }}
              onClick={() => setActiveTab('matchmake')}
            >
              <Cpu size={16} /> Quick Match
            </button>
            <button 
              style={{ ...tabBtn, background: activeTab === 'friend' ? 'var(--gold)' : 'var(--bg-hover)', color: activeTab === 'friend' ? '#0a0a14' : 'var(--text-primary)' }}
              onClick={() => setActiveTab('friend')}
            >
              <Users size={16} /> Play a Friend
            </button>
          </div>

          <div style={configContainer}>
            <label style={sectionLabel}>Select Time Control</label>
            <div style={presetsGrid}>
              {TIME_PRESETS.map(p => (
                <button
                  key={p.sec}
                  style={{ ...presetBtn, border: selectedTime === p.sec ? '2px solid var(--gold)' : '1px solid var(--border)' }}
                  onClick={() => setSelectedTime(p.sec)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {activeTab === 'matchmake' ? (
              <button style={btnPrimary} onClick={handleJoinQueue}>
                Find Match <Play size={16} />
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                <button style={btnSecondary} onClick={handleCreateRoom}>
                  Create Private Room
                </button>
                <div style={divider}>or</div>
                <form onSubmit={handleJoinRoom} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Enter 6-char code"
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    style={codeInput}
                  />
                  <button type="submit" style={btnJoin}>Join</button>
                </form>
              </div>
            )}
          </div>
        </>
      ) : isQueued ? (
        <div style={queueOverlay}>
          <div style={pulseSpinner} />
          <h3 style={{ fontFamily: 'Cinzel, serif', margin: '16px 0 8px' }}>Finding Opponent...</h3>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            Elapsed: {Math.floor(queueTime / 60)}:{(queueTime % 60).toString().padStart(2, '0')}
          </div>
          <button style={btnCancel} onClick={handleCancelQueue}>
            Cancel Queue
          </button>
        </div>
      ) : (
        <div style={roomOverlay}>
          <h3 style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', margin: '0 0 8px' }}>Lobby Created</h3>
          <p style={{ fontSize: '14px', opacity: 0.8, margin: '0 0 20px' }}>Share this code with your friend to connect!</p>
          
          <div style={codeDisplayContainer}>
            <span style={codeDisplayText}>{createdRoomCode}</span>
            <button style={btnCopy} onClick={copyRoomCode} title="Copy code">
              <Copy size={18} />
            </button>
          </div>

          <div style={pulseDotsContainer}>
            <div style={pulseDot} />
            <div style={{ ...pulseDot, animationDelay: '0.2s' }} />
            <div style={{ ...pulseDot, animationDelay: '0.4s' }} />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Waiting for friend to join...
          </div>

          <button style={btnCancel} onClick={handleLeaveLobby}>
            Leave Lobby
          </button>
        </div>
      )}
    </div>
  );
}

// Styling components
const lobbyWrapper = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '24px',
  width: '100%',
  maxWidth: '480px',
  margin: '40px auto',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  boxSizing: 'border-box'
};

const lobbyHeader = {
  fontFamily: 'Cinzel, serif',
  textAlign: 'center',
  color: 'var(--text-primary)',
  margin: '0 0 24px'
};

const tabContainer = {
  display: 'flex',
  gap: '8px',
  marginBottom: '20px'
};

const tabBtn = {
  flex: 1,
  minHeight: '40px',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: '13px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  transition: 'all 0.15s'
};

const sectionLabel = {
  display: 'block',
  fontSize: '12px',
  opacity: 0.8,
  marginBottom: '10px',
  fontWeight: 600
};

const configContainer = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
};

const presetsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
  marginBottom: '12px'
};

const presetBtn = {
  minHeight: '44px',
  borderRadius: '8px',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '13px',
  transition: 'border-color 0.15s'
};

const btnPrimary = {
  width: '100%',
  minHeight: '48px',
  borderRadius: '8px',
  background: 'var(--gold)',
  color: '#0a0a14',
  border: 'none',
  fontWeight: 800,
  fontSize: '15px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  marginTop: '12px'
};

const btnSecondary = {
  width: '100%',
  minHeight: '48px',
  borderRadius: '8px',
  background: 'transparent',
  color: 'var(--gold)',
  border: '2px solid var(--gold)',
  fontWeight: 700,
  fontSize: '15px',
  cursor: 'pointer'
};

const divider = {
  textAlign: 'center',
  color: 'var(--text-muted)',
  fontSize: '12px',
  textTransform: 'uppercase',
  fontWeight: 700
};

const codeInput = {
  flex: 1,
  minHeight: '44px',
  borderRadius: '8px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  padding: '0 12px',
  fontSize: '15px',
  fontWeight: 700,
  letterSpacing: '1px',
  textAlign: 'center'
};

const btnJoin = {
  minHeight: '44px',
  width: '80px',
  borderRadius: '8px',
  background: 'var(--gold)',
  color: '#0a0a14',
  border: 'none',
  fontWeight: 800,
  fontSize: '14px',
  cursor: 'pointer'
};

const queueOverlay = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 0'
};

const pulseSpinner = {
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  border: '3px solid rgba(212,175,55,0.1)',
  borderTopColor: 'var(--gold)',
  animation: 'spin 1s linear infinite'
};

const btnCancel = {
  width: '100%',
  minHeight: '44px',
  borderRadius: '8px',
  background: 'rgba(255, 60, 60, 0.1)',
  border: '1px solid rgba(255, 60, 60, 0.3)',
  color: '#ff6b6b',
  fontWeight: 700,
  cursor: 'pointer'
};

const roomOverlay = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 0'
};

const codeDisplayContainer = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-hover)',
  borderRadius: '8px',
  padding: '12px 24px',
  marginBottom: '20px'
};

const codeDisplayText = {
  fontSize: '28px',
  fontWeight: 900,
  letterSpacing: '2px',
  color: 'var(--text-primary)',
  fontFamily: 'monospace'
};

const btnCopy = {
  background: 'transparent',
  border: 'none',
  color: 'var(--gold)',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center'
};

const pulseDotsContainer = {
  display: 'flex',
  gap: '6px',
  margin: '12px 0 8px'
};

const pulseDot = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  background: 'var(--gold)',
  animation: 'dotPulse 1s ease-in-out infinite'
};

const guestCard = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  padding: '24px 12px',
};

const guestIconContainer = {
  fontSize: '48px',
  marginBottom: '16px',
};

const guestTitle = {
  fontFamily: 'Cinzel, serif',
  fontSize: '20px',
  color: 'var(--gold)',
  margin: '0 0 12px'
};

const guestText = {
  fontSize: '14px',
  color: 'var(--text-secondary)',
  lineHeight: 1.5,
  marginBottom: '24px',
  maxWidth: '320px'
};

const guestActionButtons = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  gap: '12px'
};

