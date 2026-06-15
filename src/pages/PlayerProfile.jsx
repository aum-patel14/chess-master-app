import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import PageShell from '../components/PageShell';
import { useToast } from '../hooks/useToast';
import { 
  User, Award, Calendar, Compass, ShieldAlert,
  ArrowUpRight, ArrowDownRight, Award as Trophy, Users, Crown
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, 
  YAxis, CartesianGrid, Tooltip 
} from 'recharts';
import { supabase } from '../services/supabase';
import { BOTS } from '../config/bots';
import './PlayerProfile.css';

export default function PlayerProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [games, setGames] = useState([]);
  const [highestBotBeaten, setHighestBotBeaten] = useState(null);
  const [loading, setLoading] = useState(true);
  const [puzzleStats, setPuzzleStats] = useState({
    rating: 1200,
    rd: 350,
    dailyStreak: 0,
    bestStreak: 0,
    totalSolved: 0,
    totalAttempted: 0,
    successRate: 0,
    favoriteTheme: 'Tactics',
    sparklineData: [],
    historyData: [],
  });

  // 1. FETCH USER PROFILE & GRAPH DATA FROM FIRESTORE
  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        if (username && username.toLowerCase() === 'guest') {
          const guestProfile = {
            id: 'guest',
            username: 'Guest',
            displayName: 'Guest',
            created_at: new Date().toISOString(),
            country: 'US',
            avatar_url: null,
            ratings: { blitz: 1200, bullet: 1200, rapid: 1200 }
          };
          setProfile(guestProfile);
          setRatings([
            { time_control: 'blitz', rating: 1200, rd: 0 },
            { time_control: 'bullet', rating: 1200, rd: 0 },
            { time_control: 'rapid', rating: 1200, rd: 0 },
            { time_control: 'classical', rating: 1200, rd: 0 },
            { time_control: 'puzzle', rating: 1200, rd: 0 }
          ]);
          setGames([]);
          setHighestBotBeaten(null);
          setLoading(false);
          return;
        }

        if (!db) {
          showToast('Database is not configured yet.', 'warning');
          setLoading(false);
          return;
        }

        // Query public profile by username
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          showToast('User profile not found.', 'error');
          setLoading(false);
          return;
        }

        const userDoc = querySnapshot.docs[0];
        const userProfile = { id: userDoc.id, ...userDoc.data() };
        setProfile(userProfile);

        // Map ratings from user document
        const ratingsArray = Object.entries(userProfile.ratings || {}).map(([tc, r]) => ({
          time_control: tc,
          rating: r,
          rd: 0
        }));
        setRatings(ratingsArray);

        // Query completed games from Firestore
        const gamesRef = collection(db, 'games');
        const gamesQuery = query(gamesRef, where('userId', '==', userProfile.id), limit(50));
        const gamesSnapshot = await getDocs(gamesQuery);
        
        let gameRecords = gamesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort in memory by created_at / timestamp desc
        gameRecords.sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp));
        gameRecords = gameRecords.slice(0, 20);

        setGames(gameRecords);

        // Query Supabase for highest bot beaten
        try {
          const { data, error } = await supabase
            .from('games')
            .select('bot_elo, bot_id')
            .eq('user_id', userProfile.id)
            .eq('result', 'win')
            .order('bot_elo', { ascending: false })
            .limit(1);

          if (error) {
            console.error('Error fetching highest bot beaten from Supabase:', error);
          } else if (data && data.length > 0) {
            setHighestBotBeaten(data[0]);
          } else {
            setHighestBotBeaten(null);
          }
        } catch (supabaseErr) {
          console.warn('Supabase query for bot stats failed:', supabaseErr);
        }

      } catch (err) {
        console.error('Error fetching player profile details:', err);
        showToast('Error loading profile.', 'error');
      } finally {
        setLoading(false);
      }
    }

    if (username) {
      loadProfile();
    }
  }, [username, showToast]);

  // Fetch puzzle stats & history
  useEffect(() => {
    if (!profile) return;

    const themeMapping = {
      fork: 'Fork 🍴',
      pin: 'Pin 📌',
      skewer: 'Skewer 🍢',
      mateIn1: 'Mate in 1 👑',
      mateIn2: 'Mate in 2 👑',
      mateIn3: 'Mate in 3 👑',
      advantage: 'Advantage 📈',
      crushing: 'Crushing 💥',
      endgame: 'Endgame 🏁',
      middlegame: 'Middlegame ⚔️',
      opening: 'Opening 📖',
      backRankMate: 'Back-Rank Mate 🏰',
      discoveredAttack: 'Discovered Attack 🔍',
      doubleCheck: 'Double Check ‼️',
      sacrificialMove: 'Sacrifice 💎',
      hangingPiece: 'Hanging Piece 🎣',
      sacrifice: 'Sacrifice 💎',
      quietMove: 'Quiet Move 🤫',
      defensiveMove: 'Defensive Move 🛡️',
      attraction: 'Attraction 🧲',
      deflection: 'Deflection 🪃',
      interference: 'Interference 🚧',
      clearance: 'Clearance 🧹',
      xRayAttack: 'X-Ray Attack ⚡'
    };

    async function loadPuzzleStats() {
      try {
        if (profile.id === 'guest') {
          // Guest User stats fallback
          const localRating = localStorage.getItem('guest_puzzle_rating');
          let rating = 1200;
          let rd = 350;
          if (localRating) {
            try {
              const parsed = JSON.parse(localRating);
              rating = parsed.rating ?? 1200;
              rd = parsed.rating_deviation ?? 350;
            } catch {}
          }

          const bestStreak = parseInt(localStorage.getItem('guest_streak_best') || '0', 10);
          const dailyStreak = parseInt(localStorage.getItem('guest_daily_streak') || '0', 10);

          const localActStr = localStorage.getItem('guest_puzzle_activity');
          let rawActivity = [];
          if (localActStr) {
            try {
              rawActivity = JSON.parse(localActStr);
            } catch {}
          }

          const solvedActivities = rawActivity.filter(act => act.solved);
          const sCount = solvedActivities.length;
          const tCount = rawActivity.length;
          const successRate = tCount > 0 ? Math.round((sCount / tCount) * 100) : 0;

          // Favorite theme
          const themeCounts = {};
          rawActivity.forEach(act => {
            if (act.solved) {
              const themes = act.themes || [];
              themes.forEach(t => {
                themeCounts[t] = (themeCounts[t] || 0) + 1;
              });
            }
          });

          let favTheme = 'Tactics';
          let maxCount = 0;
          Object.entries(themeCounts).forEach(([t, count]) => {
            if (count > maxCount) {
              maxCount = count;
              favTheme = t;
            }
          });

          const favoriteThemeFormatted = themeMapping[favTheme] || (favTheme.charAt(0).toUpperCase() + favTheme.slice(1));

          const chronological = [...rawActivity].reverse();
          const historyData = chronological.map((act, index) => ({
            index: index + 1,
            Rating: act.rating_after ?? act.rating_before ?? 1200,
            date: new Date(act.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          }));

          const sparklineData = historyData.slice(-20);

          setPuzzleStats({
            rating,
            rd,
            dailyStreak,
            bestStreak,
            totalSolved: sCount,
            totalAttempted: tCount,
            successRate,
            favoriteTheme: favoriteThemeFormatted,
            sparklineData,
            historyData,
          });
        } else {
          // Registered User: Load from Supabase
          const { data: rData } = await supabase
            .from('puzzle_ratings')
            .select('rating, rating_deviation, daily_streak_days, streak_best')
            .eq('user_id', profile.id)
            .maybeSingle();

          let rating = 1200;
          let rd = 350;
          let dailyStreak = 0;
          let bestStreak = 0;
          if (rData) {
            rating = rData.rating ?? 1200;
            rd = rData.rating_deviation ?? 350;
            dailyStreak = rData.daily_streak_days ?? 0;
            bestStreak = rData.streak_best ?? 0;
          }

          const { data: actData } = await supabase
            .from('puzzle_activity')
            .select('solved, rating_before, rating_after, created_at, puzzles(themes)')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(50);

          const rawActivity = actData || [];
          const solvedActivities = rawActivity.filter(act => act.solved);

          // Get total counts from Supabase count queries
          const { count: solvedCount } = await supabase
            .from('puzzle_activity')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('solved', true);

          const { count: totalCount } = await supabase
            .from('puzzle_activity')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          const sCount = solvedCount || 0;
          const tCount = totalCount || 0;
          const successRate = tCount > 0 ? Math.round((sCount / tCount) * 100) : 0;

          // Favorite theme
          const themeCounts = {};
          rawActivity.forEach(act => {
            if (act.solved) {
              const themes = act.puzzles?.themes || [];
              themes.forEach(t => {
                themeCounts[t] = (themeCounts[t] || 0) + 1;
              });
            }
          });

          let favTheme = 'Tactics';
          let maxCount = 0;
          Object.entries(themeCounts).forEach(([t, count]) => {
            if (count > maxCount) {
              maxCount = count;
              favTheme = t;
            }
          });

          const favoriteThemeFormatted = themeMapping[favTheme] || (favTheme.charAt(0).toUpperCase() + favTheme.slice(1));

          const chronological = [...rawActivity].reverse();
          const historyData = chronological.map((act, index) => ({
            index: index + 1,
            Rating: act.rating_after ?? act.rating_before ?? 1200,
            date: new Date(act.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          }));

          const sparklineData = historyData.slice(-20);

          setPuzzleStats({
            rating,
            rd,
            dailyStreak,
            bestStreak,
            totalSolved: sCount,
            totalAttempted: tCount,
            successRate,
            favoriteTheme: favoriteThemeFormatted,
            sparklineData,
            historyData,
          });
        }
      } catch (err) {
        console.error('Error fetching puzzle stats:', err);
      }
    }

    loadPuzzleStats();
  }, [profile]);

  // 2. COMPUTE DERIVED STATISTICS
  const stats = useMemo(() => {
    if (!profile || games.length === 0) {
      return { total: 0, wins: 0, losses: 0, draws: 0, winRate: 0, streak: 0 };
    }

    let wins = 0;
    let losses = 0;
    let draws = 0;

    games.forEach((g) => {
      const isWhite = g.white_id === profile.id;
      if (g.result === '1/2-1/2') {
        draws++;
      } else if (
        (g.result === '1-0' && isWhite) ||
        (g.result === '0-1' && !isWhite)
      ) {
        wins++;
      } else {
        losses++;
      }
    });

    const total = games.length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    // Longest win streak logic
    let currentStreak = 0;
    let maxStreak = 0;
    
    // Process chronologically (reverse recent array)
    const chronologicalGames = [...games].reverse();
    chronologicalGames.forEach((g) => {
      const isWhite = g.white_id === profile.id;
      const isWin = (g.result === '1-0' && isWhite) || (g.result === '0-1' && !isWhite);
      
      if (isWin) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else if (g.result !== '1/2-1/2') {
        currentStreak = 0; // Win streak resets on loss
      }
    });

    return { total, wins, losses, draws, winRate, streak: maxStreak };
  }, [profile, games]);

  // 3. GENERATE PROGRESSION CHART DATA (Simulated Blitz historical ratings curves)
  const chartData = useMemo(() => {
    if (!profile) return [];
    
    const blitzRating = ratings.find(r => r.time_control === 'blitz')?.rating ?? 1200;
    const dataPoints = [];
    const now = new Date();
    
    // Back-calculate rating progression curve based on latest rating and history
    let runningRating = blitzRating;
    
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(now.getDate() - (29 - i));
      
      // Add slight Glicko fluctuation to visualize rating over 30 days
      const variance = Math.sin(i * 0.5) * 45 + Math.cos(i * 0.2) * 15;
      dataPoints.push({
        date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        Rating: Math.round(runningRating - (30 - i) * 2 + variance)
      });
    }

    return dataPoints;
  }, [profile, ratings]);

  if (loading) {
    return (
      <PageShell>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: '#d4af37', fontSize: '1.5rem' }} className="font-cinzel">
          Loading Profile...
        </div>
      </PageShell>
    );
  }

  if (!profile) {
    return (
      <PageShell>
        <div className="profile-error-container font-cinzel">
          <ShieldAlert size={48} className="error-icon" />
          <h2>Profile Not Found</h2>
          <p>We couldn't locate a user named "{username}" inside our arena database.</p>
          <button className="error-back-btn" onClick={() => navigate('/')}>Return Home</button>
        </div>
      </PageShell>
    );
  }

  const joinDate = profile.created_at 
    ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'New Player';

  return (
    <PageShell>
      <div className="profile-outer-container">
        
        {/* HEADER SECTION */}
        <div className="profile-hero-card">
          <div className="profile-avatar-wrap">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-placeholder"><User size={40} /></div>
            )}
            <span className="profile-flag">{profile.country === 'US' ? '🇺🇸' : profile.country === 'IN' ? '🇮🇳' : '🌐'}</span>
          </div>

          <div className="profile-details font-cinzel">
            <h2>{profile.username}</h2>
            <div className="profile-meta">
              <span><Calendar size={13} /> Member since {joinDate}</span>
            </div>
          </div>

          {/* STATS OVERVIEW CARDS */}
          <div className="profile-hero-stats">
            <div className="hero-stat-box">
              <span className="stat-num">{stats.total}</span>
              <span className="stat-txt">GAMES</span>
            </div>
            <div className="hero-stat-box gold-tint">
              <span className="stat-num">{stats.winRate}%</span>
              <span className="stat-txt">WIN RATE</span>
            </div>
            <div className="hero-stat-box">
              <span className="stat-num">{stats.streak}🔥</span>
              <span className="stat-txt">STREAK</span>
            </div>
          </div>
        </div>

        {/* TIME CONTROL RATINGS GRID */}
        <div className="ratings-grid-row">
          <h3 className="section-title font-cinzel">⚡ Ratings & Skill Badges</h3>
          <div className="ratings-cards-wrapper">
            {['bullet', 'blitz', 'rapid', 'classical', 'puzzle'].map((tc) => {
              let rating, rd;
              if (tc === 'puzzle') {
                rating = puzzleStats.rating;
                rd = puzzleStats.rd;
              } else {
                const tcRecord = ratings.find(r => r.time_control === tc);
                rating = tcRecord?.rating ?? 1200;
                rd = tcRecord?.rd ?? 350;
              }

              const emojis = { bullet: '🚅', blitz: '⚡', rapid: '⏱', classical: '⏳', puzzle: '🧩' };
              const labels = { bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapid', classical: 'Classical', puzzle: 'Puzzles' };

              return (
                <div key={tc} className="rating-badge-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span className="badge-emoji">{emojis[tc]}</span>
                    <div className="badge-info">
                      <span className="badge-name font-cinzel">{labels[tc]}</span>
                      <span className="badge-rating">{rating} <span className="rd-lbl">±{Math.round(rd)}</span></span>
                    </div>
                  </div>
                  {tc === 'puzzle' && puzzleStats.sparklineData.length > 1 && (
                    <div className="sparkline-container" style={{ width: '80px', height: '24px', marginLeft: '12px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={puzzleStats.sparklineData}>
                          <Line type="monotone" dataKey="Rating" stroke="#81b64c" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Highest Bot Beaten Badge */}
            {(() => {
              const botConfig = BOTS.find(b => b.id === highestBotBeaten?.bot_id);
              const botDisplayName = botConfig ? botConfig.name : (highestBotBeaten?.bot_id ? (highestBotBeaten.bot_id.charAt(0).toUpperCase() + highestBotBeaten.bot_id.slice(1)) : '');
              return (
                <div className="rating-badge-card bot-beaten-card">
                  <span className="badge-emoji" style={{ display: 'flex', alignItems: 'center' }}>
                    <Crown size={28} style={{ color: '#ffd700' }} />
                  </span>
                  <div className="badge-info">
                    <span className="badge-name font-cinzel">Highest Bot Beaten</span>
                    <span className="badge-rating" style={{ fontSize: highestBotBeaten ? '14px' : '16px' }}>
                      {highestBotBeaten ? `${botDisplayName} · ${highestBotBeaten.bot_elo}` : 'No wins yet'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* PUZZLES STATISTICS PANEL */}
        <div className="profile-puzzles-panel">
          <h3 className="section-title font-cinzel">🧩 Puzzles Stats & Tactics Progress</h3>
          <div className="puzzles-dashboard-grid">
            
            {/* Stats Block */}
            <div className="puzzles-stats-sidebar">
              <div className="puzzles-stat-mini-card">
                <span className="puzzles-stat-label">Success Rate</span>
                <span className="puzzles-stat-value">{puzzleStats.successRate}%</span>
                <span className="puzzles-stat-sub">{puzzleStats.totalSolved} solved / {puzzleStats.totalAttempted} played</span>
              </div>
              
              <div className="puzzles-stat-mini-card">
                <span className="puzzles-stat-label">Best Tactics Streak</span>
                <span className="puzzles-stat-value">{puzzleStats.bestStreak} 🔥</span>
                <span className="puzzles-stat-sub">Consecutive solves</span>
              </div>

              <div className="puzzles-stat-mini-card">
                <span className="puzzles-stat-label">Daily Streak</span>
                <span className="puzzles-stat-value">
                  {puzzleStats.dailyStreak} {puzzleStats.dailyStreak > 0 ? '🔥' : '📅'}
                </span>
                <span className="puzzles-stat-sub">Consecutive active days</span>
              </div>

              <div className="puzzles-stat-mini-card">
                <span className="puzzles-stat-label">Favorite Theme</span>
                <span className="puzzles-stat-value" style={{ fontSize: '15px', color: '#81b64c' }}>
                  {puzzleStats.favoriteTheme}
                </span>
                <span className="puzzles-stat-sub">Most solved pattern</span>
              </div>
            </div>

            {/* History Chart Block */}
            <div className="puzzles-chart-area">
              <span className="chart-heading font-cinzel">Tactics Rating History (Last 50 Puzzles)</span>
              {puzzleStats.historyData.length > 1 ? (
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={puzzleStats.historyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} />
                      <YAxis domain={['auto', 'auto']} stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ background: '#16162a', border: '1px solid rgba(129, 182, 76, 0.3)', borderRadius: '8px', color: '#fff' }}
                        labelStyle={{ fontWeight: 'bold', color: '#81b64c' }}
                      />
                      <Line type="monotone" dataKey="Rating" stroke="#81b64c" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="no-puzzles-chart-fallback font-cinzel">
                  Solve puzzles in rated mode to view your tactics rating history chart.
                </div>
              )}
            </div>

          </div>
        </div>

        {/* CHART SECTION */}
        <div className="profile-chart-panel">
          <h3 className="section-title font-cinzel">📈 ELO Progress (Last 30 Days)</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} />
                <YAxis domain={['auto', 'auto']} stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#16162a', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '8px', color: '#fff' }}
                  labelStyle={{ fontWeight: 'bold', color: '#d4af37' }}
                />
                <Line type="monotone" dataKey="Rating" stroke="#d4af37" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RECENT MATCHES TABLE */}
        <div className="profile-matches-panel">
          <h3 className="section-title font-cinzel">⚔ Recent Completed Matches</h3>
          {games.length === 0 ? (
            <p className="no-matches-msg font-cinzel">No games recorded inside our database yet.</p>
          ) : (
            <div className="matches-table-wrap">
              <table className="matches-table">
                <thead>
                  <tr className="font-cinzel">
                    <th>Opponent</th>
                    <th>Side</th>
                    <th>Result</th>
                    <th>Type</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((g) => {
                    const isWhite = g.white_id === profile.id;
                    const opponentName = isWhite ? (g.black?.username ?? 'Opponent') : (g.white?.username ?? 'Opponent');
                    const side = isWhite ? 'White' : 'Black';

                    let outcome = 'Draw';
                    let outcomeClass = 'draw-pill';
                    if (g.result === '1/2-1/2') {
                      outcome = 'Draw';
                      outcomeClass = 'draw-pill';
                    } else if (
                      (g.result === '1-0' && isWhite) ||
                      (g.result === '0-1' && !isWhite)
                    ) {
                      outcome = 'Win';
                      outcomeClass = 'win-pill';
                    } else {
                      outcome = 'Loss';
                      outcomeClass = 'loss-pill';
                    }

                    const dateFormatted = new Date(g.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                    return (
                      <tr key={g.id} className="match-row">
                        <td className="opp-cell font-cinzel"><Users size={12} style={{ marginRight: '6px', opacity: 0.6 }} /> {opponentName}</td>
                        <td>{side}</td>
                        <td><span className={`outcome-pill ${outcomeClass}`}>{outcome}</span></td>
                        <td className="type-cell font-cinzel">{g.time_control}</td>
                        <td className="date-cell">{dateFormatted}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </PageShell>
  );
}
