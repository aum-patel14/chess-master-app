import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/PageShell';
import DailyPuzzle from '../components/DailyPuzzle';
import { supabase } from '../services/supabase';
import { Award, Zap, Flame, Trophy, ChevronRight, Activity, CheckCircle, XCircle } from 'lucide-react';

interface ActivityItem {
  puzzle_id: string;
  solved: boolean;
  rating_before: number;
  rating_after: number;
  created_at: string;
  themes?: string[];
  rating?: number;
}

export default function PuzzleHub() {
  const navigate = useNavigate();

  // User lifetime stats
  const [rating, setRating] = useState(1200);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [streakBest, setStreakBest] = useState(0);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  // Recent activity list
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHubData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
          // Fetch ratings & stats
          const { data: rData } = await supabase
            .from('puzzle_ratings')
            .select('rating, games_played, streak_best, daily_streak_days')
            .eq('user_id', user.id)
            .single();

          if (rData) {
            setRating(rData.rating || 1200);
            setGamesPlayed(rData.games_played || 0);
            setStreakBest(rData.streak_best || 0);
            setDailyStreak(rData.daily_streak_days || 0);
          }

          // Fetch recent activity with joined puzzle info
          const { data: actData } = await supabase
            .from('puzzle_activity')
            .select('*, puzzles(themes, rating)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);

          if (actData) {
            const mapped: ActivityItem[] = actData.map((act: any) => ({
              puzzle_id: act.puzzle_id,
              solved: act.solved,
              rating_before: act.rating_before,
              rating_after: act.rating_after,
              created_at: act.created_at,
              themes: act.puzzles?.themes || [],
              rating: act.puzzles?.rating || 0,
            }));
            setActivities(mapped);
          }
        } else {
          // Guest User stats
          const localRating = localStorage.getItem('guest_puzzle_rating');
          if (localRating) {
            try {
              const parsed = JSON.parse(localRating);
              setRating(parsed.rating ?? 1200);
              setGamesPlayed(parsed.games_played ?? 0);
            } catch {
              // Ignore
            }
          }

          const localBest = parseInt(localStorage.getItem('guest_streak_best') || '0', 10);
          setStreakBest(localBest);

          const localDaily = parseInt(localStorage.getItem('guest_daily_streak') || '0', 10);
          setDailyStreak(localDaily);

          // Guest recent activities
          const localAct = localStorage.getItem('guest_puzzle_activity');
          if (localAct) {
            try {
              setActivities(JSON.parse(localAct).slice(0, 5));
            } catch {
              // Ignore
            }
          }
        }
      } catch (err) {
        console.error('Failed to load Puzzle Hub details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHubData();
  }, []);

  return (
    <PageShell>
      <div className="hub-wrapper">
        <style>{`
          .hub-wrapper {
            background: #12110f;
            min-height: calc(100vh - 64px);
            color: #ffffff;
            font-family: 'Outfit', 'Inter', sans-serif;
            padding: 40px 24px;
            box-sizing: border-box;
          }

          .hub-container {
            max-width: 1000px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 32px;
          }

          .hub-title-section {
            text-align: left;
          }

          .hub-title-section h1 {
            font-size: 28px;
            font-weight: 800;
            margin: 0;
          }

          .hub-title-section p {
            font-size: 14px;
            color: #888888;
            margin: 4px 0 0;
          }

          /* Stats grid styling */
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }

          @media (max-width: 768px) {
            .stats-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          .stat-hub-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .stat-icon-container {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .stat-content {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .stat-card-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #888888;
            font-weight: 700;
          }

          .stat-card-value {
            font-size: 18px;
            font-weight: 850;
          }

          /* Layout split grid */
          .layout-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
          }

          @media (max-width: 900px) {
            .layout-grid {
              grid-template-columns: 1fr;
              gap: 24px;
            }
          }

          .hub-column {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }

          .section-heading {
            font-size: 18px;
            font-weight: 800;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          /* Mode Cards */
          .mode-card-hub {
            background: rgba(30, 29, 27, 0.65);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
            display: flex;
            flex-direction: column;
            gap: 14px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .mode-card-hub:hover {
            transform: translateY(-2px);
            border-color: rgba(129, 182, 76, 0.4);
          }

          .mode-header {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .mode-icon-box {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .mode-title {
            font-size: 16px;
            font-weight: 800;
            margin: 0;
          }

          .mode-subtitle {
            font-size: 13px;
            color: #888888;
            margin: 2px 0 0;
          }

          .mode-stats-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(255, 255, 255, 0.02);
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            color: #cccccc;
          }

          .btn-mode-hub {
            width: 100%;
            height: 40px;
            background: linear-gradient(135deg, #81b64c, #639035);
            color: #ffffff;
            font-weight: 700;
            font-size: 14px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            box-shadow: 0 4px 12px rgba(129, 182, 76, 0.35);
            transition: all 0.2s;
          }

          .btn-mode-hub:hover {
            background: linear-gradient(135deg, #95d05a, #73a73e);
          }

          /* Recent Activities list */
          .activity-card {
            background: rgba(30, 29, 27, 0.45);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .activity-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .activity-item {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.04);
            border-radius: 10px;
            padding: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            transition: border-color 0.2s;
          }

          .activity-item:hover {
            border-color: rgba(255, 255, 255, 0.08);
          }

          .activity-left {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .activity-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
            text-align: left;
          }

          .activity-meta {
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
          }

          .activity-theme-row {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
          }

          .activity-theme-tag {
            font-size: 10px;
            background: rgba(255, 255, 255, 0.05);
            color: #aaaaaa;
            padding: 1px 6px;
            border-radius: 6px;
          }

          .activity-right {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 2px;
          }

          .elo-diff-up {
            color: #10b981;
            font-size: 13px;
            font-weight: 800;
          }

          .elo-diff-down {
            color: #ef4444;
            font-size: 13px;
            font-weight: 800;
          }

          .activity-date {
            font-size: 10px;
            color: #666666;
          }

          .empty-state {
            text-align: center;
            color: #666666;
            padding: 32px 16px;
            font-size: 14px;
          }
        `}</style>

        <div className="hub-container">
          {/* Header */}
          <div className="hub-title-section">
            <h1>Tactics Hub</h1>
            <p>Master chess patterns with three unique modes</p>
          </div>

          {/* Stats Summary Bar */}
          <div className="stats-grid">
            <div className="stat-hub-card">
              <div className="stat-icon-container" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                <Award size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-card-label">Current Elo</span>
                <span className="stat-card-value">{rating}</span>
              </div>
            </div>

            <div className="stat-hub-card">
              <div className="stat-icon-container" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <Zap size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-card-label">Total Solved</span>
                <span className="stat-card-value">{gamesPlayed}</span>
              </div>
            </div>

            <div className="stat-hub-card">
              <div className="stat-icon-container" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                <Trophy size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-card-label">Best Streak</span>
                <span className="stat-card-value">{streakBest}</span>
              </div>
            </div>

            <div className="stat-hub-card">
              <div className="stat-icon-container" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                <Flame size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-card-label">Daily Streak</span>
                <span className="stat-card-value">{dailyStreak}d</span>
              </div>
            </div>
          </div>

          {/* 2-Column Split: Modes left, Activity right */}
          <div className="layout-grid">
            {/* LEFT: Puzzle Modes */}
            <div className="hub-column">
              <h2 className="section-heading">
                <Zap size={18} color="#81b64c" /> Game Modes
              </h2>

              {/* Mode 1: Daily Puzzle */}
              <DailyPuzzle />

              {/* Mode 2: Rated Training */}
              <div className="mode-card-hub" onClick={() => navigate('/puzzles/rated')}>
                <div className="mode-header">
                  <div className="mode-icon-box" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                    <Award size={18} />
                  </div>
                  <div>
                    <h3 className="mode-title">Rated Tactics Training</h3>
                    <p className="mode-subtitle">Test yourself with rating-matched challenges.</p>
                  </div>
                </div>
                <div className="mode-stats-row">
                  <span>Current Elo rating:</span>
                  <span style={{ fontWeight: 800, color: '#3b82f6' }}>{rating} ELO</span>
                </div>
                <button className="btn-mode-hub" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)' }}>
                  Start Rated Training <ChevronRight size={16} />
                </button>
              </div>

              {/* Mode 3: Puzzle Streak */}
              <div className="mode-card-hub" onClick={() => navigate('/puzzles/streak')}>
                <div className="mode-header">
                  <div className="mode-icon-box" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                    <Trophy size={18} />
                  </div>
                  <div>
                    <h3 className="mode-title">Puzzle Streak Challenge</h3>
                    <p className="mode-subtitle">Escalating difficulty. One mistake ends the run!</p>
                  </div>
                </div>
                <div className="mode-stats-row">
                  <span>Personal Best:</span>
                  <span style={{ fontWeight: 800, color: '#a855f7' }}>{streakBest} Puzzles</span>
                </div>
                <button className="btn-mode-hub" style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', boxShadow: '0 4px 12px rgba(168, 85, 247, 0.35)' }}>
                  Start Streak Challenge <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* RIGHT: Recent Activity */}
            <div className="hub-column">
              <h2 className="section-heading">
                <Activity size={18} color="#81b64c" /> Recent Activity
              </h2>

              <div className="activity-card">
                {activities.length === 0 ? (
                  <div className="empty-state">
                    No puzzle activity found. Start training to log solved stats!
                  </div>
                ) : (
                  <div className="activity-list">
                    {activities.map((act, idx) => {
                      const diff = act.rating_after - act.rating_before;
                      const dateObj = new Date(act.created_at);
                      const formattedDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                      return (
                        <div className="activity-item" key={idx}>
                          <div className="activity-left">
                            {act.solved ? (
                              <CheckCircle size={22} color="#10b981" />
                            ) : (
                              <XCircle size={22} color="#ef4444" />
                            )}
                            <div className="activity-info">
                              <span className="activity-meta">
                                Puzzle #{act.puzzle_id} {act.rating ? `(${act.rating})` : ''}
                              </span>
                              <div className="activity-theme-row">
                                {act.themes && act.themes.length > 0 ? (
                                  act.themes.slice(0, 2).map(theme => (
                                    <span className="activity-theme-tag" key={theme}>
                                      {theme}
                                    </span>
                                  ))
                                ) : (
                                  <span className="activity-theme-tag">tactics</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="activity-right">
                            {diff !== 0 && (
                              <span className={diff >= 0 ? 'elo-diff-up' : 'elo-diff-down'}>
                                {diff >= 0 ? `+${diff}` : diff}
                              </span>
                            )}
                            <span className="activity-date">{formattedDate}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
