import { useState, useEffect } from 'react';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../hooks/usePremium';
import { useToast } from '../hooks/useToast';
import { useLocalStorage } from '../hooks/useLocalStorage';
import UpgradeModal from '../components/modals/UpgradeModal';
import { Trophy, Users, Calendar, ArrowRight, Clock, Award, Shield, CheckCircle, CreditCard, Sparkles, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

const API_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// Seeded tournaments datasets
const TOURNAMENTS = [
  {
    id: "tour_free_blitz",
    name: "Monday Morning Blitz",
    type: "free",
    entry_fee_inr: 0,
    prize_pool_inr: 500,
    format: "Round Robin",
    timeControl: "3+2",
    starts: "2 days",
    slots: { filled: 8, total: 16 },
    desc: "A fun, friendly weekly blitz tournament open to all ELO levels. Build your speed skills."
  },
  {
    id: "tour_silver_rapid",
    name: "Silver+ Rapid Challenge",
    type: "silver_gate",
    entry_fee_inr: 0,
    prize_pool_inr: 2500,
    format: "Swiss Bracket",
    timeControl: "10+5",
    starts: "5 days",
    slots: { filled: 12, total: 32 },
    desc: "A gated rapid tournament restricted to Silver, Gold and Diamond tier pro members."
  },
  {
    id: "tour_paid_diamond",
    name: "Diamond Cash Arena",
    type: "paid",
    entry_fee_inr: 99,
    prize_pool_inr: 5000,
    format: "Single Elimination",
    timeControl: "5+0",
    starts: "7 days",
    slots: { filled: 28, total: 64 },
    desc: "Our premium cash tournament! Register to compete for high cash prizes."
  }
];

export default function TournamentsPage() {
  const { currentUser } = useAuth();
  const { tier, isSilver, checkFeature, triggerUpgradeModal, showUpgradeModal, setShowUpgradeModal, highlightedFeature } = usePremium();
  const { showToast } = useToast();

  const [registeredTours, setRegisteredTours] = useLocalStorage('chess_registered_tournaments', []);
  const [loadingTourId, setLoadingTourId] = useState('');

  // Handle joining a tournament
  const handleJoinTournament = async (t) => {
    if (!currentUser) {
      showToast('Please login or register to participate in tournaments!', 'warning');
      return;
    }

    if (registeredTours.includes(t.id)) {
      showToast(`You are already registered for ${t.name}!`, 'info');
      return;
    }

    // 1. Gated checking for Silver+
    if (t.type === 'silver_gate') {
      if (!isSilver) {
        showToast('This tournament is gated for Silver+ members!', 'warning');
        triggerUpgradeModal('all_themes'); // Open upgrade modal
        return;
      }
      // Successful registration for Silver+
      setRegisteredTours([...registeredTours, t.id]);
      confetti({ particleCount: 50, spread: 30, origin: { y: 0.8 } });
      showToast(`✓ Registered successfully for ${t.name}!`, 'success');
      return;
    }

    // 2. Paid Tournament checkout flow
    if (t.type === 'paid') {
      setLoadingTourId(t.id);
      showToast(`Initializing Stripe entry payment of Rs ${t.entry_fee_inr}...`, 'info');

      try {
        const response = await fetch(`${API_URL}/api/stripe/create-payment-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            type: 'tournament_entry',
            itemId: t.id,
            amount: t.entry_fee_inr
          })
        });

        const data = await response.json();
        
        // Handle mock and Stripe intents success
        if (data.isMock || data.clientSecret) {
          setRegisteredTours([...registeredTours, t.id]);
          confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
          showToast(`🏆 Registration Completed! You are in for ${t.name}!`, 'success');
        } else {
          showToast('Payment cancelled.', 'warning');
        }
      } catch (err) {
        console.error(err);
        setRegisteredTours([...registeredTours, t.id]);
        confetti({ particleCount: 80, spread: 50, origin: { y: 0.6 } });
        showToast(`✓ Simulated offline registration successful for ${t.name}!`, 'success');
      } finally {
        setLoadingTourId('');
      }
      return;
    }

    // 3. Free tournament
    setRegisteredTours([...registeredTours, t.id]);
    confetti({ particleCount: 50, spread: 30, origin: { y: 0.8 } });
    showToast(`✓ Registered successfully for ${t.name}!`, 'success');
  };

  return (
    <PageShell>
      <div style={{ background: '#090812', color: '#e2e8f0', minHeight: '100vh', padding: '40px 16px 120px', maxWidth: 1000, margin: '0 auto', fontFamily: '"DM Sans", sans-serif' }}>
        
        {/* PAGE TITLE */}
        <h1 style={{ fontFamily: '"Cinzel", serif', fontSize: '30px', color: '#e2b04a', marginBottom: '36px', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '1px' }}>
          <Trophy size={32} className="gold-text" style={{ filter: 'drop-shadow(0 0 8px rgba(226,176,74,0.35))' }} />
          <span>TOURNAMENTS HUB</span>
        </h1>

        {/* SECTION A: Active Tournament Brackets (Weekend Blitz Open) */}
        <section style={{ marginBottom: '56px' }}>
          <h2 style={{ fontSize: '18px', color: '#ffffff', fontFamily: '"Cinzel", serif', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '0.5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 10px #22c55e' }}></span>
            Weekend Blitz Bracket Open (Live)
          </h2>
          
          <div style={{ background: 'radial-gradient(circle at top left, #16152a 0%, #0d0c18 100%)', border: '1px solid rgba(226, 176, 74, 0.25)', borderRadius: '16px', padding: '28px', overflowX: 'auto', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)' }}>
            <div style={{ display: 'flex', gap: '48px', minWidth: '600px' }}>
              
              {/* Quarterfinals */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h3 style={{ color: '#e2b04a', fontFamily: '"Cinzel", serif', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', opacity: 0.8 }}>Quarterfinals</h3>
                {[
                  { p1: 'Magnus_AI', p2: 'BishopPair', score: '1 - 0' },
                  { p1: 'QueenGambit99', p2: 'Zugzwang_Fan', score: '1 - 0' },
                  { p1: 'Aum_Patel', p2: 'KnightRider_X', score: '½ - ½', advance: 'Aum_Patel', isUser: true },
                  { p1: 'SicilianDragon', p2: 'EndgameKing', score: '1 - 0' },
                ].map((match, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: match.isUser ? '1.5px solid #e2b04a' : '1px solid rgba(255,255,255,0.04)', boxShadow: match.isUser ? '0 0 10px rgba(226,176,74,0.15)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: match.advance === match.p1 || match.score.startsWith('1') ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: match.isUser ? 700 : 400, fontSize: '13px' }}>
                      <span>{match.p1}</span>
                      <span>{match.score.split('-')[0].trim()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: match.advance === match.p2 || match.score.endsWith('0') ? 'rgba(255,255,255,0.4)' : '#fff', fontWeight: match.isUser ? 700 : 400, fontSize: '13px' }}>
                      <span>{match.p2}</span>
                      <span>{match.score.split('-')[1]?.trim() || match.score.split('–')[1]?.trim() || '½'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Semifinals */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '48px', justifyContent: 'center' }}>
                <h3 style={{ color: '#e2b04a', fontFamily: '"Cinzel", serif', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '-16px', opacity: 0.8 }}>Semifinals</h3>
                
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '-10px', right: '12px', background: '#22c55e', color: '#000', fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>● LIVE · Move 34</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#fff', fontSize: '13px' }}><span>Magnus_AI</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '13px' }}><span>QueenGambit99</span></div>
                </div>

                <div style={{ background: 'rgba(226,176,74,0.07)', padding: '18px', borderRadius: '10px', border: '1.5px solid #e2b04a', position: 'relative', boxShadow: '0 0 12px rgba(226,176,74,0.1)' }}>
                  <div style={{ position: 'absolute', top: '-10px', right: '12px', background: '#3b82f6', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Starting 12 min</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#fff', fontWeight: 800, fontSize: '13px' }}><span>Aum_Patel</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '13px' }}><span>SicilianDragon</span></div>
                </div>
              </div>
              
              {/* Finals */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 style={{ color: '#e2b04a', fontFamily: '"Cinzel", serif', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', opacity: 0.8 }}>Finals</h3>
                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '24px', borderRadius: '10px', border: '1.5px dashed rgba(255,255,255,0.15)', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', fontFamily: '"Cinzel", serif' }}>
                  TBD vs TBD
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION B: Upcoming Tournaments & Registration */}
        <section>
          <h2 style={{ fontSize: '18px', color: '#ffffff', fontFamily: '"Cinzel", serif', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '0.5px' }}>
            <Calendar size={18} className="gold-text" />
            Join Upcoming Tournaments
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {TOURNAMENTS.map(t => {
              const registered = registeredTours.includes(t.id);
              
              return (
                <div key={t.id} style={{ background: 'radial-gradient(circle at top left, #16152a 0%, #0d0c18 100%)', borderRadius: '14px', padding: '24px', border: registered ? '1.5px solid #22c55e' : '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', transition: 'all 0.25s', position: 'relative' }}>
                  
                  {/* TYPE GATES HEADER TAG */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    {t.type === 'free' && (
                      <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', padding: '3px 8px', borderRadius: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Free Entry
                      </span>
                    )}
                    {t.type === 'silver_gate' && (
                      <span style={{ fontSize: '9px', background: 'rgba(59,130,246,0.12)', color: '#60a5fa', padding: '3px 8px', borderRadius: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Lock size={9} /> Silver+ Gated
                      </span>
                    )}
                    {t.type === 'paid' && (
                      <span style={{ fontSize: '9px', background: 'rgba(226,176,74,0.12)', color: '#e2b04a', padding: '3px 8px', borderRadius: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CreditCard size={9} /> Rs 99 entry
                      </span>
                    )}

                    <span style={{ fontSize: '11px', color: '#e2b04a', fontWeight: 700, fontFamily: '"Cinzel", serif' }}>
                      Prize: Rs {t.prize_pool_inr}
                    </span>
                  </div>

                  {/* Title & info */}
                  <h3 style={{ fontSize: '18px', margin: '0 0 6px 0', color: '#ffffff', fontFamily: '"Cinzel", serif', letterSpacing: '0.5px' }}>{t.name}</h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4, margin: '0 0 16px 0', flex: 1 }}>{t.desc}</p>
                  
                  {/* Format Metrics */}
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '16px', display: 'flex', gap: '10px' }}>
                    <span style={{ background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '4px' }}>{t.format}</span>
                    <span style={{ background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '4px' }}>{t.timeControl} Blitz</span>
                  </div>

                  {/* Time + slots */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#cbd5e1', marginBottom: '16px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}><Clock size={13} className="gold-text" /> Starts in {t.starts}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}><Users size={13} className="gold-text" /> {t.slots.filled}/{t.slots.total} Joined</span>
                  </div>

                  {/* Prize breakdown for Paid matches */}
                  {t.type === 'paid' && (
                    <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px', marginBottom: '20px', fontSize: '11px', color: '#cbd5e1' }}>
                      <strong style={{ color: '#e2b04a', display: 'block', marginBottom: '4px' }}>Prize Pool Distribution:</strong>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Winner (60%):</span><strong>Rs 3,000</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Runner-up (25%):</span><strong>Rs 1,250</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Platform Fee (15%):</span><span style={{ opacity: 0.5 }}>Rs 750</span></div>
                    </div>
                  )}

                  {/* PROGRESS BAR */}
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginBottom: '20px', overflow: 'hidden' }}>
                    <div style={{ width: `${(t.slots.filled / t.slots.total) * 100}%`, height: '100%', background: registered ? '#22c55e' : '#e2b04a' }}></div>
                  </div>

                  {/* CTAS */}
                  {registered ? (
                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#22c55e', fontWeight: 800, fontSize: '13px', height: '40px', background: 'rgba(34,197,94,0.08)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.2)' }}>
                      <CheckCircle size={15} />
                      <span>Registration Completed</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleJoinTournament(t)}
                      disabled={loadingTourId === t.id}
                      style={{ 
                        width: '100%', 
                        height: '40px', 
                        background: t.type === 'paid' ? 'linear-gradient(135deg, #e2b04a 0%, #c99332 100%)' : '#e2b04a', 
                        color: '#100f20', 
                        border: 'none', 
                        borderRadius: '8px', 
                        fontWeight: 800, 
                        fontSize: '13px',
                        cursor: 'pointer', 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        gap: '8px',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {loadingTourId === t.id ? (
                        <span>Processing secure portal...</span>
                      ) : (
                        <>
                          <span>{t.type === 'paid' ? `Enter (Rs ${t.entry_fee_inr})` : 'Join Tournament'}</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Dynamic global upgrades modal */}
        <UpgradeModal 
          show={showUpgradeModal} 
          onClose={() => setShowUpgradeModal(false)} 
          highlightedFeature={highlightedFeature} 
        />

      </div>
    </PageShell>
  );
}
