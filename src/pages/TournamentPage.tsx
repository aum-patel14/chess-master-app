import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Calendar, Swords, Clock, Users, ArrowRight, Lock, Award, CheckCircle, ShieldAlert, Play, Eye, MessageSquare, LogOut, ShieldCheck, User } from 'lucide-react';
import PageShell from '../components/PageShell';
import supabase from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import confetti from 'canvas-confetti';

interface Tournament {
  id: string;
  slug: string;
  title: string;
  description: string;
  format: 'arena' | 'swiss';
  status: 'upcoming' | 'registration' | 'active' | 'completed' | 'cancelled';
  time_control: string;
  is_rated: boolean;
  max_players: number;
  player_count: number;
  starts_at: string;
  ends_at: string | null;
  total_rounds: number | null;
  current_round: number;
  duration_minutes: number | null;
  prize_type: 'none' | 'badge' | 'trophy';
  prize_badge_name: string | null;
  prize_badge_emoji: string | null;
  min_elo: number | null;
  max_elo: number | null;
  created_by: string;
}

interface Player {
  id: string;
  user_id: string;
  username: string;
  elo_at_entry: number;
  score: number;
  wins: number;
  draws: number;
  losses: number;
  consecutive_wins: number;
  rank: number | null;
  withdrawn: boolean;
  joined_at: string;
}

interface Pairing {
  id: string;
  round: number;
  white_id: string;
  black_id: string | null;
  game_id: string | null;
  result: 'white' | 'black' | 'draw' | 'pending' | 'bye' | null;
  white_username?: string;
  black_username?: string;
  room_code?: string;
}

export default function TournamentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const { showToast } = useToast();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'standings' | 'pairings' | 'players' | 'rules'>('standings');
  
  // Realtime Presence states
  const [presencePlayers, setPresencePlayers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const presenceChannelRef = useRef<any>(null);

  // Time remaining count
  const [timeLeftStr, setTimeLeftStr] = useState('');

  // Fetch all details
  const fetchTournamentData = async () => {
    if (!id) return;
    try {
      const { data: tour, error: tourErr } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (tourErr) throw tourErr;
      if (!tour) {
        showToast('Tournament not found.', 'error');
        navigate('/tournaments');
        return;
      }
      setTournament(tour);

      // Check if Arena needs expiration check
      if (tour.status === 'active' && tour.format === 'arena' && tour.ends_at) {
        const timeRemaining = new Date(tour.ends_at).getTime() - new Date().getTime();
        if (timeRemaining <= 0) {
          // Dynamic completion safeguard
          await supabase.rpc('complete_tournament', { t_id: id });
          tour.status = 'completed';
          setTournament({ ...tour });
        }
      }

      // Fetch players
      const { data: playersData, error: playersErr } = await supabase
        .from('tournament_players')
        .select('*')
        .eq('tournament_id', id)
        .order('score', { ascending: false })
        .order('wins', { ascending: false });

      if (!playersErr && playersData) {
        setPlayers(playersData);
      }

      // Fetch pairings
      const { data: pairingsData, error: pairingsErr } = await supabase
        .from('tournament_pairings')
        .select(`
          id,
          round,
          white_id,
          black_id,
          game_id,
          result,
          online_games (
            room_code,
            white_username,
            black_username
          )
        `)
        .eq('tournament_id', id)
        .order('round', { ascending: false });

      if (!pairingsErr && pairingsData) {
        const mappedPairings: Pairing[] = pairingsData.map((p: any) => ({
          id: p.id,
          round: p.round,
          white_id: p.white_id,
          black_id: p.black_id,
          game_id: p.game_id,
          result: p.result,
          white_username: p.online_games?.white_username || 'White Player',
          black_username: p.online_games?.black_username || 'Black Player',
          room_code: p.online_games?.room_code
        }));
        setPairings(mappedPairings);
      }

    } catch (err: any) {
      console.error(err);
      showToast('Error loading tournament details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournamentData();
  }, [id]);

  // Realtime subscription setup
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`tournament_lobby:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_players', filter: `tournament_id=eq.${id}` }, () => {
        fetchTournamentData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_pairings', filter: `tournament_id=eq.${id}` }, () => {
        fetchTournamentData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` }, (payload) => {
        setTournament(payload.new as Tournament);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Countdown timer logic
  useEffect(() => {
    if (!tournament) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      
      if (tournament.status === 'upcoming' || tournament.status === 'registration') {
        const start = new Date(tournament.starts_at).getTime();
        const diff = start - now;
        if (diff <= 0) {
          setTimeLeftStr('Starting shortly...');
          fetchTournamentData();
        } else {
          const d = Math.floor(diff / 86400000);
          const h = Math.floor((diff % 86400000) / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          setTimeLeftStr(`${d > 0 ? d + 'd ' : ''}${h}h ${m}m ${s}s`);
        }
      } else if (tournament.status === 'active') {
        if (tournament.format === 'arena' && tournament.ends_at) {
          const end = new Date(tournament.ends_at).getTime();
          const diff = end - now;
          if (diff <= 0) {
            setTimeLeftStr('Tournament ending...');
            fetchTournamentData();
          } else {
            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTimeLeftStr(`${m}m ${s}s left`);
          }
        } else {
          setTimeLeftStr(`Round ${tournament.current_round} of ${tournament.total_rounds}`);
        }
      } else {
        setTimeLeftStr('Finished');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tournament]);

  // Handle Confetti on Completed State
  useEffect(() => {
    if (tournament?.status === 'completed' && players.length > 0 && currentUser) {
      const isTop3 = players.slice(0, 3).some(p => p.user_id === currentUser.uid);
      if (isTop3) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }
    }
  }, [tournament?.status, players, currentUser]);

  // Matchmaking Presence configuration
  useEffect(() => {
    if (!tournament || tournament.status !== 'active' || !currentUser) return;

    const channel = supabase.channel(`tournament_presence:${id}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const presArray: any[] = [];
        Object.keys(state).forEach((key) => {
          presArray.push(...state[key]);
        });
        setPresencePlayers(presArray);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUser.uid,
            username: userData?.username || currentUser.displayName || 'Player',
            status: isSearching ? 'searching' : 'idle',
            elo: userData?.rating || 1200
          });
        }
      });

    presenceChannelRef.current = channel;

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
      }
    };
  }, [tournament?.status, isSearching, currentUser]);

  // Watch for incoming pairings directed at us
  useEffect(() => {
    if (!tournament || tournament.status !== 'active' || !currentUser) return;

    // Check if there is an active pairing for this user that has a room code
    const myActivePairing = pairings.find(
      p => p.result === 'pending' && 
           (p.white_id === currentUser.uid || p.black_id === currentUser.uid) && 
           p.room_code
    );

    if (myActivePairing && myActivePairing.room_code) {
      showToast('⚔️ Opponent found! Joining match...', 'success');
      setIsSearching(false);
      navigate(`/play/online/${myActivePairing.room_code}`);
    }
  }, [pairings, currentUser, tournament]);

  // Join Tournament
  const handleJoin = async () => {
    if (!currentUser) {
      showToast('Please sign in or register to join tournaments!', 'warning');
      return;
    }

    if (!tournament) return;

    // ELO gates check
    const myElo = userData?.rating || 1200;
    if (tournament.min_elo && myElo < tournament.min_elo) {
      showToast(`Your rating (${myElo}) is lower than the minimum requirement of ${tournament.min_elo}.`, 'warning');
      return;
    }
    if (tournament.max_elo && myElo > tournament.max_elo) {
      showToast(`Your rating (${myElo}) is higher than the maximum requirement of ${tournament.max_elo}.`, 'warning');
      return;
    }

    try {
      const { error } = await supabase
        .from('tournament_players')
        .insert({
          tournament_id: tournament.id,
          user_id: currentUser.uid,
          username: userData?.username || currentUser.displayName || 'Player',
          elo_at_entry: myElo
        });

      if (error) throw error;
      showToast('✓ Registered successfully for the tournament!', 'success');
      confetti({ particleCount: 50, spread: 40, origin: { y: 0.8 } });
      fetchTournamentData();
    } catch (err: any) {
      console.error(err);
      showToast('Failed to register: ' + (err.message || 'Already registered'), 'error');
    }
  };

  // Withdraw from Tournament
  const handleWithdraw = async () => {
    if (!currentUser || !tournament) return;
    try {
      const { error } = await supabase
        .from('tournament_players')
        .delete()
        .eq('tournament_id', tournament.id)
        .eq('user_id', currentUser.uid);

      if (error) throw error;
      showToast('You have withdrawn from the tournament.', 'info');
      fetchTournamentData();
    } catch (err: any) {
      console.error(err);
      showToast('Failed to withdraw: ' + err.message, 'error');
    }
  };

  // Find opponent in Arena
  const handleFindArenaOpponent = async () => {
    if (!currentUser || !tournament) return;

    if (isSearching) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    showToast('Searching for tournament opponent...', 'info');

    // Get closest opponent from database
    try {
      const { data: opponentId, error: oppError } = await supabase.rpc('get_arena_opponent', {
        t_id: tournament.id,
        requesting_user: currentUser.uid
      });

      if (oppError || !opponentId) {
        // No offline candidate, remain in searching state to wait for dynamic check
        return;
      }

      // Check consensus: creator has smaller uid
      if (currentUser.uid < opponentId) {
        // Create match
        const { data: roomCode, error: createError } = await supabase.rpc('create_match', {
          p1: currentUser.uid,
          p2: opponentId,
          tc: tournament.time_control,
          rated: tournament.is_rated
        });

        if (createError) throw createError;

        // Fetch game ID
        const { data: game } = await supabase
          .from('online_games')
          .select('id')
          .eq('room_code', roomCode)
          .single();

        if (game) {
          // Insert pairing
          await supabase
            .from('tournament_pairings')
            .insert({
              tournament_id: tournament.id,
              round: 0,
              white_id: currentUser.uid,
              black_id: opponentId,
              game_id: game.id,
              result: 'pending'
            });

          setIsSearching(false);
          navigate(`/play/online/${roomCode}`);
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error pairing opponent: ' + err.message, 'error');
      setIsSearching(false);
    }
  };

  // Swiss Game Activation
  const handlePlaySwissMatch = async (pairing: Pairing) => {
    if (!currentUser || !tournament) return;

    // Check if game already pre-created
    if (pairing.room_code) {
      navigate(`/play/online/${pairing.room_code}`);
      return;
    }

    // Creator role checks (white or alphabetically first)
    const opponentId = pairing.white_id === currentUser.uid ? pairing.black_id : pairing.white_id;
    if (!opponentId) return; // Bye handled separately

    if (currentUser.uid === pairing.white_id || (!pairing.white_id && currentUser.uid < opponentId)) {
      showToast('Creating game server...', 'info');
      try {
        const { data: roomCode, error: rpcError } = await supabase.rpc('create_match', {
          p1: currentUser.uid,
          p2: opponentId,
          tc: tournament.time_control,
          rated: tournament.is_rated
        });

        if (rpcError) throw rpcError;

        // Fetch game ID
        const { data: game } = await supabase
          .from('online_games')
          .select('id')
          .eq('room_code', roomCode)
          .single();

        if (game) {
          await supabase
            .from('tournament_pairings')
            .update({ game_id: game.id })
            .eq('id', pairing.id);

          navigate(`/play/online/${roomCode}`);
        }
      } catch (err: any) {
        console.error(err);
        showToast('Error launching game room: ' + err.message, 'error');
      }
    } else {
      showToast('Waiting for opponent to launch the game server...', 'info');
    }
  };

  // Creator Admin Action: Start Tournament
  const handleStartTournament = async () => {
    if (!tournament) return;
    try {
      // Set status to active
      const { error: updateErr } = await supabase
        .from('tournaments')
        .update({ status: 'active' })
        .eq('id', tournament.id);

      if (updateErr) throw updateErr;

      if (tournament.format === 'swiss') {
        // Generate round 1 Swiss pairings
        await supabase.rpc('generate_swiss_round', { t_id: tournament.id });
      }

      showToast('🚀 Tournament started successfully!', 'success');
      fetchTournamentData();
    } catch (err: any) {
      console.error(err);
      showToast('Failed to start tournament: ' + err.message, 'error');
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div style={styles.loaderBox}>
          <div style={styles.spinner}></div>
          <span>Loading tournament arena...</span>
        </div>
      </PageShell>
    );
  }

  if (!tournament) return null;

  const isRegistered = players.some(p => p.user_id === currentUser?.uid && !p.withdrawn);
  const isCreator = currentUser && tournament.created_by === currentUser.uid;

  // Find user's pending pairing
  const myPendingPairing = pairings.find(
    p => p.result === 'pending' && 
         (p.white_id === currentUser?.uid || p.black_id === currentUser?.uid)
  );

  return (
    <PageShell>
      <div style={styles.container}>
        
        {/* Tournament Hero Stats Banner */}
        <div style={styles.heroCard}>
          <div style={styles.heroHeader}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Trophy size={32} color="#e2b04a" />
              <h1 style={styles.heroTitle}>{tournament.title}</h1>
            </div>
            <span style={{
              ...styles.formatTag,
              background: tournament.format === 'arena' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
              color: tournament.format === 'arena' ? '#f87171' : '#60a5fa'
            }}>
              {tournament.format === 'arena' ? '⚡ Arena' : '♟ Swiss'}
            </span>
          </div>

          <p style={styles.heroDesc}>{tournament.description || 'Welcome to the tournament arena!'}</p>

          <div style={styles.gridStats}>
            <div style={styles.statBox}>
              <Clock size={16} color="#e2b04a" />
              <div style={styles.statContent}>
                <span style={styles.statLabel}>Format Control</span>
                <span style={styles.statValue}>{formatTC(tournament.time_control)}</span>
              </div>
            </div>

            <div style={styles.statBox}>
              <Users size={16} color="#e2b04a" />
              <div style={styles.statContent}>
                <span style={styles.statLabel}>Registrants</span>
                <span style={styles.statValue}>{tournament.player_count} / {tournament.max_players}</span>
              </div>
            </div>

            <div style={styles.statBox}>
              <Calendar size={16} color="#e2b04a" />
              <div style={styles.statContent}>
                <span style={styles.statLabel}>Time Tracker</span>
                <span style={styles.statValue}>{timeLeftStr}</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div style={styles.actionRow}>
            {tournament.status === 'registration' || tournament.status === 'upcoming' ? (
              <>
                {isRegistered ? (
                  <button onClick={handleWithdraw} style={styles.withdrawBtn}>
                    <LogOut size={16} /> Withdraw from Tournament
                  </button>
                ) : (
                  <button onClick={handleJoin} style={styles.joinBtn}>
                    <CheckCircle size={16} /> Join Tournament
                  </button>
                )}

                {isCreator && tournament.player_count >= (tournament.min_players || 4) && (
                  <button onClick={handleStartTournament} style={styles.startBtn}>
                    <Play size={16} /> Start Tournament Now
                  </button>
                )}
              </>
            ) : tournament.status === 'active' ? (
              <>
                {isRegistered && tournament.format === 'arena' && (
                  <button 
                    onClick={handleFindArenaOpponent} 
                    style={{
                      ...styles.joinBtn,
                      background: isSearching ? '#ef4444' : 'linear-gradient(135deg, #e2b04a 0%, #c99332 100%)',
                      color: isSearching ? '#ffffff' : '#090812'
                    }}
                  >
                    <Swords size={16} /> {isSearching ? 'Cancel Search' : 'Find Next Match'}
                  </button>
                )}

                {isRegistered && tournament.format === 'swiss' && myPendingPairing && (
                  <button 
                    onClick={() => handlePlaySwissMatch(myPendingPairing)} 
                    style={styles.joinBtn}
                  >
                    <Play size={16} /> Play Current Round Pairing
                  </button>
                )}
              </>
            ) : (
              <span style={styles.finishedLabel}>🏆 Tournament Finished</span>
            )}
          </div>
        </div>

        {/* Podium Ceremony if Completed */}
        {tournament.status === 'completed' && players.length > 0 && (
          <div style={styles.podiumCard}>
            <h2 style={styles.podiumTitle}>👑 THE PODIUM CEREMONY 👑</h2>
            <div style={styles.podiumWrapper}>
              {/* 2nd place */}
              {players[1] && (
                <div style={styles.podiumColumn}>
                  <Award size={36} color="#cbd5e1" style={styles.trophyIcon} />
                  <div style={{ ...styles.podiumBase, height: '80px', background: '#475569' }}>
                    <span style={styles.podiumRank}>2nd</span>
                    <span style={styles.podiumName}>{players[1].username}</span>
                    <span style={styles.podiumScore}>{players[1].score} pts</span>
                  </div>
                </div>
              )}

              {/* 1st place */}
              {players[0] && (
                <div style={styles.podiumColumn}>
                  <Award size={48} color="#ffd700" style={styles.trophyIcon} />
                  <div style={{ ...styles.podiumBase, height: '120px', background: 'linear-gradient(180deg, #d97706 0%, #92400e 100%)' }}>
                    <span style={styles.podiumRank}>CHAMPION</span>
                    <span style={styles.podiumName}>{players[0].username}</span>
                    <span style={styles.podiumScore}>{players[0].score} pts</span>
                  </div>
                </div>
              )}

              {/* 3rd place */}
              {players[2] && (
                <div style={styles.podiumColumn}>
                  <Award size={36} color="#cd7f32" style={styles.trophyIcon} />
                  <div style={{ ...styles.podiumBase, height: '60px', background: '#7c2d12' }}>
                    <span style={styles.podiumRank}>3rd</span>
                    <span style={styles.podiumName}>{players[2].username}</span>
                    <span style={styles.podiumScore}>{players[2].score} pts</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Tabs */}
        <div style={styles.tabBar}>
          {[
            { id: 'standings', label: 'Scoreboard & Standings' },
            { id: 'pairings', label: 'Matches & Pairings' },
            { id: 'players', label: 'Players list' },
            { id: 'rules', label: 'Tournament rules' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                ...styles.tabBtn,
                ...(activeTab === tab.id ? styles.tabBtnActive : {})
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab view containers */}
        <div style={styles.tabContentCard}>
          
          {/* Leaderboard/Standings Tab */}
          {activeTab === 'standings' && (
            <div>
              <h3 style={styles.tabSectionTitle}>Standings</h3>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tr}>
                    <th style={styles.th}>Rank</th>
                    <th style={styles.th}>Player</th>
                    <th style={styles.th}>Rating</th>
                    <th style={styles.th}>Score</th>
                    <th style={styles.th}>W - D - L</th>
                    {tournament.format === 'arena' && <th style={styles.th}>Streak</th>}
                  </tr>
                </thead>
                <tbody>
                  {players.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={styles.noPlayers}>No players registered yet.</td>
                    </tr>
                  ) : (
                    players.map((p, index) => (
                      <tr key={p.id} style={{
                        ...styles.trBody,
                        background: p.user_id === currentUser?.uid ? 'rgba(226, 176, 74, 0.05)' : 'transparent'
                      }}>
                        <td style={styles.td}>
                          {index + 1 === 1 ? '🥇 1' : index + 1 === 2 ? '🥈 2' : index + 1 === 3 ? '🥉 3' : index + 1}
                        </td>
                        <td style={{ ...styles.td, fontWeight: 'bold' }}>{p.username}</td>
                        <td style={styles.td}>{p.elo_at_entry}</td>
                        <td style={{ ...styles.td, color: '#e2b04a', fontWeight: 'bold' }}>{p.score}</td>
                        <td style={styles.td}>{p.wins} - {p.draws} - {p.losses}</td>
                        {tournament.format === 'arena' && (
                          <td style={styles.td}>
                            {p.consecutive_wins >= 2 ? `🔥 ${p.consecutive_wins}` : p.consecutive_wins}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pairings Tab */}
          {activeTab === 'pairings' && (
            <div>
              <h3 style={styles.tabSectionTitle}>Tournament Pairings</h3>
              {pairings.length === 0 ? (
                <div style={styles.noPairings}>No match pairings generated yet. Matchmaking will start when the tournament is live!</div>
              ) : (
                <div style={styles.pairingsGrid}>
                  {pairings.map((p) => {
                    const isMyMatch = p.white_id === currentUser?.uid || p.black_id === currentUser?.uid;
                    
                    return (
                      <div key={p.id} style={{
                        ...styles.pairingCard,
                        border: isMyMatch ? '1px solid #e2b04a' : '1px solid rgba(255, 255, 255, 0.05)',
                        background: isMyMatch ? 'rgba(226, 176, 74, 0.03)' : 'rgba(255, 255, 255, 0.01)'
                      }}>
                        {/* Round badge */}
                        <div style={styles.pairingHeader}>
                          <span>{p.round === 0 ? 'Arena Match' : `Round ${p.round}`}</span>
                          <span style={{
                            ...styles.resultTag,
                            color: p.result === 'pending' ? '#f59e0b' : '#34d399'
                          }}>
                            {p.result === 'pending' ? 'Pending' : p.result === 'draw' ? 'Draw' : p.result === 'bye' ? 'Bye' : p.result + ' won'}
                          </span>
                        </div>

                        {/* Opponents mapping */}
                        <div style={styles.pairingOpponents}>
                          <div style={styles.opponentRow}>
                            <span style={styles.playerDotWhite}></span>
                            <span style={{ color: p.result === 'white' ? '#fff' : '#94a3b8', fontWeight: p.result === 'white' ? 'bold' : 'normal' }}>
                              {p.white_username}
                            </span>
                          </div>
                          {p.black_id ? (
                            <div style={styles.opponentRow}>
                              <span style={styles.playerDotBlack}></span>
                              <span style={{ color: p.result === 'black' ? '#fff' : '#94a3b8', fontWeight: p.result === 'black' ? 'bold' : 'normal' }}>
                                {p.black_username}
                              </span>
                            </div>
                          ) : (
                            <div style={styles.opponentRow}>
                              <span style={{ fontStyle: 'italic', color: '#64748b' }}>BYE</span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        {p.result === 'pending' && isMyMatch && (
                          <button 
                            onClick={() => handlePlaySwissMatch(p)}
                            style={styles.pairingPlayBtn}
                          >
                            <Play size={12} /> Play Game
                          </button>
                        )}

                        {p.room_code && p.result !== 'pending' && (
                          <button 
                            onClick={() => navigate(`/game`, {
                              state: {
                                mode: 'spectate',
                                roomCode: p.room_code
                              }
                            })}
                            style={styles.pairingWatchBtn}
                          >
                            <Eye size={12} /> View Game
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Registrants List Tab */}
          {activeTab === 'players' && (
            <div>
              <h3 style={styles.tabSectionTitle}>Registered Players ({players.length})</h3>
              <div style={styles.playersListGrid}>
                {players.map((p) => (
                  <div key={p.id} style={styles.playerItem}>
                    <User size={16} color="#64748b" />
                    <div>
                      <span style={{ fontWeight: 'bold', display: 'block' }}>{p.username}</span>
                      <span style={{ fontSize: '11.5px', color: '#64748b' }}>Rating: {p.elo_at_entry}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rules and prize instructions Tab */}
          {activeTab === 'rules' && (
            <div style={styles.rulesContent}>
              <h3 style={styles.tabSectionTitle}>Rules and Mechanics</h3>
              
              <h4>Scoring Rules:</h4>
              {tournament.format === 'arena' ? (
                <ul>
                  <li>Wins earn 2 points.</li>
                  <li>Draws earn 1 point.</li>
                  <li>Losses earn 0 points.</li>
                  <li><strong>Streak multiplier:</strong> Consecutive wins of 2 or more earn 3 points per win! Streaks reset on draw or loss.</li>
                  <li>Play as many games as you can within the active time window.</li>
                </ul>
              ) : (
                <ul>
                  <li>Wins earn 1 point.</li>
                  <li>Draws earn 0.5 points.</li>
                  <li>Losses earn 0 points.</li>
                  <li>Structured round pairings. Complete each match to progress to the next round automatically.</li>
                  <li>Byes earn 1 point.</li>
                </ul>
              )}

              <h4>General Terms:</h4>
              <ul>
                <li>Cheating or using chess engines is strictly prohibited. Offenders will be banned.</li>
                <li>Abandoning games will count as a loss.</li>
                <li>Prizes (badges/trophies) will be distributed automatically to your profile upon completion of the podium ceremony.</li>
              </ul>
            </div>
          )}

        </div>
      </div>
    </PageShell>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#090812',
    color: '#e2e8f0',
    padding: '40px 16px 120px',
    maxWidth: '1000px',
    margin: '0 auto',
    fontFamily: '"DM Sans", sans-serif',
  },
  loaderBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '80px',
    gap: '16px',
    color: '#94a3b8',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '4px solid rgba(226, 176, 74, 0.15)',
    borderTop: '4px solid #e2b04a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  heroCard: {
    background: 'radial-gradient(circle at top left, #16152a 0%, #0d0c18 100%)',
    border: '1px solid rgba(226, 176, 74, 0.2)',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
    marginBottom: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  heroHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  heroTitle: {
    fontFamily: '"Cinzel", serif',
    fontSize: '28px',
    color: '#e2b04a',
    margin: 0,
    letterSpacing: '0.5px',
  },
  formatTag: {
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    padding: '4px 12px',
    borderRadius: '12px',
    letterSpacing: '0.5px',
  },
  heroDesc: {
    color: '#cbd5e1',
    fontSize: '14px',
    lineHeight: 1.5,
    margin: 0,
  },
  gridStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    background: 'rgba(0, 0, 0, 0.15)',
    padding: '16px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.02)',
  },
  statBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  statLabel: {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: '14.5px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  joinBtn: {
    background: 'linear-gradient(135deg, #e2b04a 0%, #c99332 100%)',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    color: '#090812',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 14px rgba(226, 176, 74, 0.25)',
  },
  withdrawBtn: {
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    padding: '12px 24px',
    color: '#f87171',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  startBtn: {
    background: '#22c55e',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    color: '#090812',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 14px rgba(34, 197, 148, 0.25)',
  },
  finishedLabel: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#cbd5e1',
    fontSize: '14px',
    fontWeight: 'bold',
    padding: '12px 24px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  podiumCard: {
    background: 'radial-gradient(circle, #1e1b4b 0%, #0d0c18 100%)',
    border: '1px solid rgba(226, 176, 74, 0.3)',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    marginBottom: '32px',
    textAlign: 'center',
  },
  podiumTitle: {
    fontFamily: '"Cinzel", serif',
    color: '#e2b04a',
    fontSize: '22px',
    marginBottom: '28px',
    letterSpacing: '1px',
  },
  podiumWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: '24px',
    height: '240px',
    maxWidth: '550px',
    margin: '0 auto',
  },
  podiumColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: '1',
  },
  trophyIcon: {
    marginBottom: '10px',
    filter: 'drop-shadow(0 0 8px currentColor)',
  },
  podiumBase: {
    width: '100%',
    borderRadius: '8px 8px 0 0',
    padding: '14px 10px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: '4px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  podiumRank: {
    fontSize: '10px',
    fontWeight: 800,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: '0.5px',
  },
  podiumName: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: '14px',
    wordBreak: 'break-all',
  },
  podiumScore: {
    color: '#e2b04a',
    fontSize: '12px',
    fontWeight: 600,
  },
  tabBar: {
    display: 'flex',
    gap: '10px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '4px',
    marginBottom: '24px',
    overflowX: 'auto',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    color: '#e2b04a',
    borderColor: '#e2b04a',
  },
  tabContentCard: {
    background: 'radial-gradient(circle at top left, #16152a 0%, #0d0c18 100%)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '14px',
    padding: '28px',
  },
  tabSectionTitle: {
    fontFamily: '"Cinzel", serif',
    fontSize: '18px',
    color: '#ffffff',
    marginBottom: '20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    paddingBottom: '10px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  th: {
    padding: '12px',
    color: '#64748b',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  trBody: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
  },
  td: {
    padding: '14px 12px',
    fontSize: '13.5px',
    color: '#cbd5e1',
  },
  noPlayers: {
    textAlign: 'center',
    padding: '40px',
    color: '#64748b',
    fontStyle: 'italic',
  },
  noPairings: {
    textAlign: 'center',
    padding: '40px',
    color: '#64748b',
    lineHeight: 1.5,
  },
  pairingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  pairingCard: {
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  pairingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 600,
  },
  resultTag: {
    textTransform: 'uppercase',
    fontWeight: 800,
  },
  pairingOpponents: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  opponentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13.5px',
  },
  playerDotWhite: {
    width: '8px',
    height: '8px',
    background: '#ffffff',
    borderRadius: '50%',
    border: '1px solid #64748b',
  },
  playerDotBlack: {
    width: '8px',
    height: '8px',
    background: '#090812',
    borderRadius: '50%',
    border: '1px solid #64748b',
  },
  pairingPlayBtn: {
    background: 'linear-gradient(135deg, #e2b04a 0%, #c99332 100%)',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    color: '#090812',
    fontWeight: 'bold',
    fontSize: '11.5px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    marginTop: '4px',
  },
  pairingWatchBtn: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    color: '#cbd5e1',
    fontWeight: 'bold',
    fontSize: '11.5px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    marginTop: '4px',
  },
  playersListGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
  playerItem: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  rulesContent: {
    color: '#cbd5e1',
    fontSize: '13.5px',
    lineHeight: 1.6,
  }
};
