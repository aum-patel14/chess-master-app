import React from 'react';
import PageShell from '../components/PageShell';
import { Trophy, Users, Calendar, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TournamentsPage() {
  const { userData } = useAuth();

  return (
    <PageShell>
      <div style={{ background: '#0a0a14', color: '#e8e8e8', minHeight: '100vh', padding: '24px 16px 100px', maxWidth: 960, margin: '0 auto' }}>
        <h1 style={{ fontFamily: '"Cinzel", serif', fontSize: '32px', color: 'var(--gold)', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Trophy size={36} />
          Tournaments
        </h1>

        {/* SECTION A: Active Tournament */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 8px #22c55e' }}></span>
            Weekend Blitz Open
          </h2>
          
          <div style={{ background: '#1a1a2e', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '16px', padding: '24px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: '48px', minWidth: '600px' }}>
              {/* Quarterfinals */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h3 style={{ color: '#d4af37', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Quarterfinals</h3>
                {[
                  { p1: 'Magnus_AI', p2: 'BishopPair', score: '1 - 0' },
                  { p1: 'QueenGambit99', p2: 'Zugzwang_Fan', score: '1 - 0' },
                  { p1: 'Aum_Patel', p2: 'KnightRider_X', score: '½ - ½', advance: 'Aum_Patel', isUser: true },
                  { p1: 'SicilianDragon', p2: 'EndgameKing', score: '1 - 0' },
                ].map((match, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: match.isUser ? '1px solid var(--gold)' : '1px solid transparent' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: match.advance === match.p1 || match.score.startsWith('1') ? '#fff' : '#888', fontWeight: match.isUser && match.p1 === 'Aum_Patel' ? 800 : 400 }}>
                      <span>{match.p1}</span>
                      <span>{match.score.split('-')[0].trim()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: match.advance === match.p2 || match.score.endsWith('0') ? '#888' : '#fff', fontWeight: match.isUser && match.p2 === 'Aum_Patel' ? 800 : 400 }}>
                      <span>{match.p2}</span>
                      <span>{match.score.split('-')[1]?.trim() || match.score.split('–')[1]?.trim() || '½'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Semifinals */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '48px', justifyContent: 'center' }}>
                <h3 style={{ color: '#d4af37', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '-16px' }}>Semifinals</h3>
                
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '-10px', right: '12px', background: '#22c55e', color: '#000', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>● LIVE · Move 34</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#fff' }}><span>Magnus_AI</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff' }}><span>QueenGambit99</span></div>
                </div>

                <div style={{ background: 'rgba(212,175,55,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--gold)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '-10px', right: '12px', background: '#3b82f6', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>Starting in 12 min</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#fff', fontWeight: 800 }}><span>Aum_Patel</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff' }}><span>SicilianDragon</span></div>
                </div>
              </div>
              
              {/* Finals */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 style={{ color: '#d4af37', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Finals</h3>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.2)', textAlign: 'center', color: '#666' }}>
                  TBD vs TBD
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION B: Upcoming Tournaments */}
        <section>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="var(--gold)" />
            Upcoming Tournaments
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            
            {/* Tournament 1 */}
            <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', margin: 0 }}>Monday Morning Blitz</h3>
                <span style={{ fontSize: '12px', background: 'rgba(212,175,55,0.2)', color: 'var(--gold)', padding: '4px 8px', borderRadius: '12px' }}>500 pts</span>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#aaa', marginBottom: '20px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> Starts in 2 days</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={14} /> 8/16 Joined</span>
              </div>
              <button style={{ width: '100%', padding: '10px', background: 'var(--gold)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                Join Tournament <ArrowRight size={16} />
              </button>
            </div>

            {/* Tournament 2 */}
            <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', margin: 0 }}>Classical Weekend</h3>
                <span style={{ fontSize: '12px', background: 'rgba(212,175,55,0.2)', color: 'var(--gold)', padding: '4px 8px', borderRadius: '12px' }}>1000 pts</span>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#aaa', marginBottom: '20px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> Starts in 5 days</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={14} /> 3/8 Joined</span>
              </div>
              <button style={{ width: '100%', padding: '10px', background: 'var(--gold)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                Join Tournament <ArrowRight size={16} />
              </button>
            </div>

          </div>
        </section>

      </div>
    </PageShell>
  );
}
