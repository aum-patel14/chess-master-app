import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Calendar, Swords, Plus, Search, Filter, Clock, Users, ArrowRight, Lock, Award, Star } from 'lucide-react';
import PageShell from '../components/PageShell';
import supabase, { isDummyConfig } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';

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
  prize_type: 'none' | 'badge' | 'trophy';
  prize_badge_name: string | null;
  prize_badge_emoji: string | null;
  min_elo: number | null;
  max_elo: number | null;
}

export default function TournamentHub() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | 'arena' | 'swiss'>('all');
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed' | 'mine'>('active');

  // Load Tournaments & User Registrations
  useEffect(() => {
    async function loadHubData() {
      setLoading(true);
      try {
        // Fetch all tournaments
        const { data: tours, error: toursErr } = await supabase
          .from('tournaments')
          .select('*')
          .order('starts_at', { ascending: true });

        if (toursErr) throw toursErr;
        setTournaments(tours || []);

        // Fetch user's registered tournaments if logged in
        if (currentUser) {
          const { data: regs, error: regsErr } = await supabase
            .from('tournament_players')
            .select('tournament_id')
            .eq('user_id', currentUser.uid)
            .eq('withdrawn', false);

          if (!regsErr && regs) {
            setUserRegistrations(regs.map(r => r.tournament_id));
          }
        }
      } catch (err: any) {
        console.error('Failed to load tournaments:', err);
        showToast('Failed to load tournaments list', 'error');
      } finally {
        setLoading(false);
      }
    }

    loadHubData();
  }, [currentUser]);

  // Format time controls helper
  const formatTC = (tc: string) => {
    const parts = tc.split('_');
    if (parts.length < 3) return tc;
    const type = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    return `${parts[1]}+${parts[2]} ${type}`;
  };

  // Filter tournaments
  const filteredTournaments = tournaments.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFormat = formatFilter === 'all' || t.format === formatFilter;
    
    let matchesTab = false;
    if (activeTab === 'active') {
      matchesTab = t.status === 'active';
    } else if (activeTab === 'upcoming') {
      matchesTab = t.status === 'upcoming' || t.status === 'registration';
    } else if (activeTab === 'completed') {
      matchesTab = t.status === 'completed';
    } else if (activeTab === 'mine') {
      // Created by user or registered by user
      const isCreator = currentUser && (t as any).created_by === currentUser.uid;
      const isRegistered = userRegistrations.includes(t.id);
      matchesTab = !!(isCreator || isRegistered);
    }

    return matchesSearch && matchesFormat && matchesTab;
  });

  return (
    <PageShell>
      <div style={styles.container}>
        
        {/* Banner Section */}
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.hubTitle}>
              <Trophy size={36} color="#e2b04a" style={{ filter: 'drop-shadow(0 0 10px rgba(226,176,74,0.3))' }} />
              Tournament Arena
            </h1>
            <p style={styles.hubSubtitle}>Compete in live ChessMaster championships, earn badges, and climb the leaderboards!</p>
          </div>
          {currentUser && (
            <button 
              onClick={() => navigate('/tournaments/create')}
              style={styles.createBtn}
            >
              <Plus size={16} /> Create Tournament
            </button>
          )}
        </div>
        {isDummyConfig && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.45)',
            color: '#f87171',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: 1.5,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
            <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>⚠️ Database Connection Offline</strong>
            Swiss & Arena tournaments, automatic round generation, and standings updates are disabled. Please configure your <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '4px', color: '#fbbf24' }}>.env</code> file with valid Supabase credentials.
          </div>
        )}

        {/* Filters and Search Dashboard */}
        <div style={styles.dashboardFilters}>
          {/* Tabs */}
          <div style={styles.tabList}>
            {[
              { id: 'active', label: 'Live Now' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'completed', label: 'Past & Results' },
              { id: 'mine', label: 'My Arenas' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === tab.id ? styles.tabBtnActive : {})
                }}
              >
                {tab.id === 'active' && <span style={styles.liveIndicator}></span>}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search + Format Filter */}
          <div style={styles.filterControls}>
            <div style={styles.searchWrap}>
              <Search size={16} color="#64748b" style={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Search tournaments..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            <div style={styles.formatSelectWrap}>
              <Filter size={14} color="#64748b" style={styles.filterIcon} />
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value as any)}
                style={styles.formatSelect}
              >
                <option value="all">All Formats</option>
                <option value="arena">Arena</option>
                <option value="swiss">Swiss</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Grid List */}
        {loading ? (
          <div style={styles.loaderBox}>
            <div style={styles.spinner}></div>
            <span>Loading tournaments...</span>
          </div>
        ) : filteredTournaments.length === 0 ? (
          <div style={styles.emptyCard}>
            <Trophy size={48} color="rgba(255, 255, 255, 0.1)" />
            <h3>No Tournaments Found</h3>
            <p>We couldn't find any tournaments matching your query under this category.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {filteredTournaments.map((t) => {
              const isRegistered = userRegistrations.includes(t.id);
              const isCreator = currentUser && (t as any).created_by === currentUser.uid;

              return (
                <div 
                  key={t.id} 
                  style={{
                    ...styles.tourCard,
                    ...(t.status === 'active' ? styles.tourCardLive : {}),
                    ...(isRegistered ? styles.tourCardRegistered : {})
                  }}
                >
                  {/* Status header */}
                  <div style={styles.cardHeader}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {t.status === 'active' ? (
                        <span style={styles.badgeLive}>● LIVE</span>
                      ) : t.status === 'registration' || t.status === 'upcoming' ? (
                        <span style={styles.badgeUpcoming}>Registration Open</span>
                      ) : (
                        <span style={styles.badgePast}>Completed</span>
                      )}
                      
                      <span style={styles.formatBadge}>
                        {t.format === 'arena' ? 'Arena' : 'Swiss'}
                      </span>
                    </div>

                    {t.is_rated && (
                      <span style={styles.ratedBadge}>Rated</span>
                    )}
                  </div>

                  {/* Title & Desc */}
                  <h3 style={styles.cardTitle}>{t.title}</h3>
                  <p style={styles.cardDesc}>{t.description || 'No description provided.'}</p>

                  {/* Metrics */}
                  <div style={styles.cardMetrics}>
                    <div style={styles.metricItem}>
                      <Clock size={13} color="#e2b04a" />
                      <span>{formatTC(t.time_control)}</span>
                    </div>
                    <div style={styles.metricItem}>
                      <Users size={13} color="#e2b04a" />
                      <span>{t.player_count} / {t.max_players} Players</span>
                    </div>
                  </div>

                  {/* Date details */}
                  <div style={styles.dateBanner}>
                    <Calendar size={13} color="#64748b" />
                    <span>
                      {t.status === 'active' 
                        ? 'Closes in ' + (t.ends_at ? new Date(t.ends_at).toLocaleTimeString() : 'N/A')
                        : 'Starts ' + new Date(t.starts_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                      }
                    </span>
                  </div>

                  {/* Gated restrictions details */}
                  {(t.min_elo || t.max_elo) && (
                    <div style={styles.gatedBanner}>
                      <Lock size={12} color="#f87171" />
                      <span>
                        ELO: {t.min_elo || 0} - {t.max_elo || 'No Max'}
                      </span>
                    </div>
                  )}

                  {/* Award details */}
                  {t.prize_type !== 'none' && (
                    <div style={styles.prizeBanner}>
                      <Award size={13} color="#22c55e" />
                      <span>
                        {t.prize_type === 'badge' ? `Badge: ${t.prize_badge_emoji} ${t.prize_badge_name}` : 'Podium Trophies Awarded'}
                      </span>
                    </div>
                  )}

                  {/* Footer CTAS */}
                  <div style={styles.cardFooter}>
                    {isCreator && (
                      <span style={styles.creatorTag}>
                        <Star size={10} /> Creator
                      </span>
                    )}
                    <button 
                      onClick={() => navigate(`/tournaments/${t.id}`)}
                      style={{
                        ...styles.viewBtn,
                        ...(t.status === 'active' ? styles.viewBtnLive : {})
                      }}
                    >
                      {t.status === 'active' ? 'Enter Arena' : 'View Details'} <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
    maxWidth: '1100px',
    margin: '0 auto',
    fontFamily: '"DM Sans", sans-serif',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
    marginBottom: '40px',
  },
  hubTitle: {
    fontFamily: '"Cinzel", serif',
    fontSize: '32px',
    color: '#e2b04a',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    letterSpacing: '1px',
    margin: 0,
  },
  hubSubtitle: {
    color: '#94a3b8',
    fontSize: '15px',
    marginTop: '6px',
  },
  createBtn: {
    background: 'linear-gradient(135deg, #e2b04a 0%, #c99332 100%)',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    color: '#090812',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 14px rgba(226, 176, 74, 0.25)',
  },
  dashboardFilters: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '32px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '20px',
  },
  tabList: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  tabBtn: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '20px',
    padding: '8px 18px',
    color: '#94a3b8',
    fontSize: '13.5px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  tabBtnActive: {
    background: 'rgba(226, 176, 74, 0.12)',
    borderColor: '#e2b04a',
    color: '#e2b04a',
  },
  liveIndicator: {
    width: '6px',
    height: '6px',
    background: '#22c55e',
    borderRadius: '50%',
    display: 'inline-block',
    boxShadow: '0 0 8px #22c55e',
    animation: 'pulse 1.5s infinite',
  },
  filterControls: {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
  },
  searchWrap: {
    position: 'relative',
    flex: '1',
    minWidth: '260px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
  },
  searchInput: {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '10px 14px 10px 38px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
  },
  formatSelectWrap: {
    position: 'relative',
    minWidth: '150px',
  },
  filterIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
  },
  formatSelect: {
    width: '100%',
    background: '#131224',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '10px 14px 10px 34px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
  },
  loaderBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '80px',
    gap: '16px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '4px solid rgba(226, 176, 74, 0.15)',
    borderTop: '4px solid #e2b04a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  emptyCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '80px 40px',
    background: 'rgba(255, 255, 255, 0.01)',
    border: '1px dashed rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    color: '#94a3b8',
    gap: '12px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
  },
  tourCard: {
    background: 'radial-gradient(circle at top left, #16152a 0%, #0d0c18 100%)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '14px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.25s ease',
    position: 'relative',
  },
  tourCardLive: {
    borderColor: 'rgba(34, 197, 94, 0.3)',
    boxShadow: '0 0 15px rgba(34, 197, 94, 0.05)',
  },
  tourCardRegistered: {
    borderColor: 'rgba(226, 176, 74, 0.3)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  badgeLive: {
    background: 'rgba(34, 197, 94, 0.12)',
    color: '#22c55e',
    fontSize: '9.5px',
    fontWeight: 800,
    padding: '3px 8px',
    borderRadius: '12px',
    letterSpacing: '0.5px',
  },
  badgeUpcoming: {
    background: 'rgba(59, 130, 246, 0.12)',
    color: '#60a5fa',
    fontSize: '9.5px',
    fontWeight: 800,
    padding: '3px 8px',
    borderRadius: '12px',
    letterSpacing: '0.5px',
  },
  badgePast: {
    background: 'rgba(255, 255, 255, 0.06)',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '9.5px',
    fontWeight: 800,
    padding: '3px 8px',
    borderRadius: '12px',
    letterSpacing: '0.5px',
  },
  formatBadge: {
    background: 'rgba(255, 255, 255, 0.04)',
    color: '#94a3b8',
    fontSize: '9.5px',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '4px',
  },
  ratedBadge: {
    background: 'rgba(226, 176, 74, 0.12)',
    color: '#e2b04a',
    fontSize: '9.5px',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: '4px',
  },
  cardTitle: {
    fontSize: '18px',
    color: '#ffffff',
    fontFamily: '"Cinzel", serif',
    margin: '0 0 6px 0',
    letterSpacing: '0.5px',
  },
  cardDesc: {
    fontSize: '12.5px',
    color: '#94a3b8',
    lineHeight: 1.4,
    margin: '0 0 16px 0',
    flex: 1,
  },
  cardMetrics: {
    display: 'flex',
    gap: '14px',
    fontSize: '12px',
    color: '#cbd5e1',
    marginBottom: '12px',
  },
  metricItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  dateBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#64748b',
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    paddingTop: '12px',
    marginBottom: '8px',
  },
  gatedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11.5px',
    color: '#f87171',
    marginBottom: '8px',
  },
  prizeBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11.5px',
    color: '#4ade80',
    marginBottom: '16px',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  creatorTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '9.5px',
    fontWeight: 800,
    textTransform: 'uppercase',
    color: '#e2b04a',
    background: 'rgba(226, 176, 74, 0.08)',
    padding: '3px 8px',
    borderRadius: '12px',
  },
  viewBtn: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    color: '#ffffff',
    fontSize: '12.5px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginLeft: 'auto',
    transition: 'all 0.2s ease',
  },
  viewBtnLive: {
    background: '#22c55e',
    color: '#090812',
  }
};
