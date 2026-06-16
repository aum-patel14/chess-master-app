import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, Calendar, Shield, Swords, Sparkles, Clock, AlertTriangle, Check } from 'lucide-react';
import PageShell from '../components/PageShell';
import supabase from '../services/supabase';
import { useToast } from '../hooks/useToast';

export default function CreateTournament() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<'arena' | 'swiss'>('arena');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeControl, setTimeControl] = useState('blitz_3_0');
  const [isRated, setIsRated] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(32);
  const [minPlayers, setMinPlayers] = useState(4);
  const [registrationOpensAt, setRegistrationOpensAt] = useState('');
  const [startsAt, setStartsAt] = useState('');
  
  // Arena specifics
  const [durationMinutes, setDurationMinutes] = useState(60);

  // Swiss specifics
  const [totalRounds, setTotalRounds] = useState(5);

  // Prize details
  const [prizeType, setPrizeType] = useState<'none' | 'badge' | 'trophy'>('none');
  const [prizeBadgeName, setPrizeBadgeName] = useState('');
  const [prizeBadgeEmoji, setPrizeBadgeEmoji] = useState('🏆');

  // Elo gating
  const [minElo, setMinElo] = useState('');
  const [maxElo, setMaxElo] = useState('');

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (title.trim().length < 3) {
      showToast('Title must be at least 3 characters long', 'warning');
      return;
    }

    if (!registrationOpensAt || !startsAt) {
      showToast('Please specify registration and start times', 'warning');
      return;
    }

    const regDate = new Date(registrationOpensAt);
    const startDate = new Date(startsAt);
    const now = new Date();

    if (regDate >= startDate) {
      showToast('Registration must open before the tournament starts', 'warning');
      return;
    }

    if (startDate <= now) {
      showToast('Start time must be in the future', 'warning');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast('You must be logged in to create a tournament', 'error');
        setLoading(false);
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const isAdmin = profile?.role === 'admin';

      // Generate slug
      const baseSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
      const slug = `${baseSlug}-${uniqueSuffix}`;

      // Calculate Arena ends_at
      let endsAt = null;
      if (format === 'arena') {
        endsAt = new Date(startDate.getTime() + durationMinutes * 60000).toISOString();
      }

      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          slug,
          title,
          description,
          format,
          time_control: timeControl,
          is_rated: isRated,
          created_by: user.id,
          is_admin_created: isAdmin,
          max_players: maxPlayers,
          min_players: minPlayers,
          registration_opens_at: regDate.toISOString(),
          starts_at: startDate.toISOString(),
          ends_at: endsAt,
          total_rounds: format === 'swiss' ? totalRounds : null,
          duration_minutes: format === 'arena' ? durationMinutes : null,
          prize_type: prizeType,
          prize_badge_name: prizeType === 'badge' ? prizeBadgeName : null,
          prize_badge_emoji: prizeType === 'badge' ? prizeBadgeEmoji : null,
          min_elo: minElo ? parseInt(minElo) : null,
          max_elo: maxElo ? parseInt(maxElo) : null,
          status: 'upcoming'
        })
        .select()
        .single();

      if (error) throw error;

      showToast('🏆 Tournament created successfully!', 'success');
      navigate(`/tournaments/${data.id}`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to create tournament', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <div style={styles.container}>
        {/* Back Link */}
        <button 
          onClick={() => navigate('/tournaments')}
          style={styles.backButton}
        >
          <ArrowLeft size={16} /> Back to Hub
        </button>

        {/* Heading */}
        <div style={styles.header}>
          <Trophy size={36} color="#e2b04a" />
          <h1 style={styles.title}>Create Tournament</h1>
          <p style={styles.subtitle}>Host a custom Arena or Swiss tournament for the community</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} style={styles.formCard}>
          
          {/* Format Picker */}
          <div style={styles.formSection}>
            <label style={styles.sectionLabel}>Tournament Format</label>
            <div style={styles.formatSelector}>
              <div 
                onClick={() => setFormat('arena')}
                style={{
                  ...styles.formatOption,
                  ...(format === 'arena' ? styles.formatOptionActive : {})
                }}
              >
                <div style={styles.optionHeader}>
                  <Swords size={20} color={format === 'arena' ? '#e2b04a' : '#a0aec0'} />
                  <span style={styles.optionTitle}>Arena Format</span>
                </div>
                <p style={styles.optionDesc}>
                  Continuous pairings inside a fixed time window. Win streaks gain bonus points. Fastest paced action!
                </p>
              </div>

              <div 
                onClick={() => setFormat('swiss')}
                style={{
                  ...styles.formatOption,
                  ...(format === 'swiss' ? styles.formatOptionActive : {})
                }}
              >
                <div style={styles.optionHeader}>
                  <Trophy size={20} color={format === 'swiss' ? '#e2b04a' : '#a0aec0'} />
                  <span style={styles.optionTitle}>Swiss Bracket</span>
                </div>
                <p style={styles.optionDesc}>
                  Structured rounds. Players pair against opponents with similar scores. Equal opportunities for all.
                </p>
              </div>
            </div>
          </div>

          {/* Title and Description */}
          <div style={styles.formGrid2}>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Tournament Title *</label>
              <input 
                type="text" 
                placeholder="e.g. Midnight Blitz Championship"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={styles.textInput}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Time Control</label>
              <select 
                value={timeControl}
                onChange={(e) => setTimeControl(e.target.value)}
                style={styles.selectInput}
              >
                <option value="bullet_1_0">1+0 (Bullet)</option>
                <option value="bullet_2_1">2+1 (Bullet)</option>
                <option value="blitz_3_0">3+0 (Blitz)</option>
                <option value="blitz_3_2">3+2 (Blitz)</option>
                <option value="blitz_5_0">5+0 (Blitz)</option>
                <option value="rapid_10_0">10+0 (Rapid)</option>
                <option value="classical_30_0">30+0 (Classical)</option>
              </select>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Description</label>
            <textarea 
              placeholder="Describe rules, details, or streams info..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={styles.textareaInput}
            />
          </div>

          {/* Dates & Gating */}
          <div style={styles.formGrid2}>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Registration Opens At *</label>
              <input 
                type="datetime-local" 
                value={registrationOpensAt}
                onChange={(e) => setRegistrationOpensAt(e.target.value)}
                required
                style={styles.dateInput}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Tournament Starts At *</label>
              <input 
                type="datetime-local" 
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
                style={styles.dateInput}
              />
            </div>
          </div>

          {/* Conditional Specs */}
          <div style={styles.formGrid2}>
            {format === 'arena' ? (
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Duration (Minutes)</label>
                <input 
                  type="number" 
                  min={10}
                  max={180}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                  style={styles.textInput}
                />
                <span style={styles.fieldHint}>Time window for matches</span>
              </div>
            ) : (
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Total Rounds</label>
                <select 
                  value={totalRounds}
                  onChange={(e) => setTotalRounds(parseInt(e.target.value) || 5)}
                  style={styles.selectInput}
                >
                  <option value={3}>3 Rounds</option>
                  <option value={4}>4 Rounds</option>
                  <option value={5}>5 Rounds</option>
                  <option value={6}>6 Rounds</option>
                  <option value={7}>7 Rounds</option>
                  <option value={8}>8 Rounds</option>
                </select>
                <span style={styles.fieldHint}>Round robin style rounds</span>
              </div>
            )}

            <div style={styles.inputGroup}>
              <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: '28px' }}>
                <label style={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={isRated}
                    onChange={(e) => setIsRated(e.target.checked)}
                    style={styles.checkboxInput}
                  />
                  <span>Rated Matchmaking (Affects ELO)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Bounds & Gating */}
          <div style={styles.formGrid3}>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Min Players</label>
              <input 
                type="number" 
                min={4}
                max={100}
                value={minPlayers}
                onChange={(e) => setMinPlayers(parseInt(e.target.value) || 4)}
                style={styles.textInput}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Max Players</label>
              <input 
                type="number" 
                min={minPlayers}
                max={200}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 64)}
                style={styles.textInput}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Min ELO Requirement</label>
              <input 
                type="number" 
                placeholder="No Minimum"
                value={minElo}
                onChange={(e) => setMinElo(e.target.value)}
                style={styles.textInput}
              />
            </div>
          </div>

          {/* Prizes Selector */}
          <div style={styles.formSection}>
            <label style={styles.sectionLabel}>Award Prizes</label>
            <div style={styles.prizeSelector}>
              {(['none', 'badge', 'trophy'] as const).map((p) => (
                <div 
                  key={p}
                  onClick={() => setPrizeType(p)}
                  style={{
                    ...styles.prizeOption,
                    ...(prizeType === p ? styles.prizeOptionActive : {})
                  }}
                >
                  <span style={styles.prizeTitle}>
                    {p === 'none' && 'No Prize'}
                    {p === 'badge' && 'Custom Badge'}
                    {p === 'trophy' && 'Profile Trophies'}
                  </span>
                  <p style={styles.prizeDesc}>
                    {p === 'none' && 'Bragging rights only.'}
                    {p === 'badge' && 'Custom badge awarded to the top 3 spots.'}
                    {p === 'trophy' && 'Gold, Silver & Bronze trophies on profile.'}
                  </p>
                </div>
              ))}
            </div>

            {prizeType === 'badge' && (
              <div style={{ ...styles.formGrid2, marginTop: '16px' }}>
                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Badge Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Blitz Champion"
                    value={prizeBadgeName}
                    onChange={(e) => setPrizeBadgeName(e.target.value)}
                    required={prizeType === 'badge'}
                    style={styles.textInput}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Badge Emoji</label>
                  <select
                    value={prizeBadgeEmoji}
                    onChange={(e) => setPrizeBadgeEmoji(e.target.value)}
                    style={styles.selectInput}
                  >
                    <option value="🏆">🏆 Trophy</option>
                    <option value="👑">👑 Crown</option>
                    <option value="⚡">⚡ Lightning</option>
                    <option value="🔥">🔥 Fire</option>
                    <option value="🎖️">🎖️ Medal</option>
                    <option value="⚔️">⚔️ Swords</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={styles.actionRow}>
            <button 
              type="button"
              onClick={() => navigate('/tournaments')}
              style={styles.cancelBtn}
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              style={styles.submitBtn}
            >
              {loading ? 'Creating...' : 'Create Tournament'}
            </button>
          </div>

        </form>
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
    maxWidth: '850px',
    margin: '0 auto',
    fontFamily: '"DM Sans", sans-serif',
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    marginBottom: '24px',
    padding: 0,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontFamily: '"Cinzel", serif',
    fontSize: '32px',
    color: '#e2b04a',
    marginTop: '12px',
    letterSpacing: '1px',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '15px',
    marginTop: '6px',
  },
  formCard: {
    background: 'radial-gradient(circle at top left, #16152a 0%, #0d0c18 100%)',
    border: '1px solid rgba(226, 176, 74, 0.15)',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionLabel: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: '"Cinzel", serif',
    letterSpacing: '0.5px',
  },
  formatSelector: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  formatOption: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  formatOptionActive: {
    background: 'rgba(226, 176, 74, 0.06)',
    borderColor: '#e2b04a',
  },
  optionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  optionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  optionDesc: {
    fontSize: '12.5px',
    color: '#94a3b8',
    lineHeight: 1.4,
  },
  formGrid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  formGrid3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  inputLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#cbd5e1',
  },
  textInput: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
  },
  selectInput: {
    background: '#131224',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
  },
  textareaInput: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    resize: 'none',
  },
  dateInput: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
  },
  fieldHint: {
    fontSize: '11px',
    color: '#64748b',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#cbd5e1',
    cursor: 'pointer',
  },
  checkboxInput: {
    width: '16px',
    height: '16px',
    accentColor: '#e2b04a',
  },
  prizeSelector: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '12px',
  },
  prizeOption: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  prizeOptionActive: {
    background: 'rgba(226, 176, 74, 0.06)',
    borderColor: '#e2b04a',
  },
  prizeTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ffffff',
    display: 'block',
    marginBottom: '4px',
  },
  prizeDesc: {
    fontSize: '11.5px',
    color: '#94a3b8',
    lineHeight: 1.3,
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '24px',
  },
  cancelBtn: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    color: '#cbd5e1',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #e2b04a 0%, #c99332 100%)',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    color: '#090812',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(226, 176, 74, 0.25)',
  }
};
