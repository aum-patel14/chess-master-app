import './LandingPage.css';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { SignUpModal, LoginModal } from '../components/Modals';
import LandingPageToast from '../components/LandingPageToast';

export default function LandingPage() {
  const navigate = useNavigate();
  const [toastMsg, setToastMsg] = useState('');
  const [showSignUp, setShowSignUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
  };

  const handlePlay = () => {
    navigate('/play');
  };

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-up');
          entry.target.style.opacity = 1;
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-reveal').forEach(el => {
      el.style.opacity = 0;
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="lp-layout">
      {/* Mobile Top Navbar */}
      <div className="mobile-only-navbar" style={{ 
        display: 'none', height: '64px', width: '100%', background: 'var(--lp-bg-sidebar)', 
        borderBottom: '1px solid var(--lp-border)', alignItems: 'center', justifyContent: 'space-between', 
        padding: '0 20px', position: 'fixed', top: 0, zIndex: 110 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px', color: 'var(--lp-gold)' }}>♚</span>
        </div>
        <button onClick={() => setMobileMenuOpen(true)} style={{ background: 'transparent', border: 'none', color: 'var(--lp-text-primary)' }}>
          <Menu size={24} />
        </button>
      </div>

      <Sidebar 
        onToast={showToast} 
        onOpenSignUp={() => setShowSignUp(true)} 
        onOpenLogin={() => setShowLogin(true)} 
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />
      
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 90 }}
        />
      )}

      <main className="lp-content">
        {/* TOP BAR */}
        <div className="lp-topbar hide-on-mobile">
          <Bell size={20} color="var(--lp-text-secondary)" style={{ cursor: 'pointer' }} />
          <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: 'var(--lp-bg-card)', border: '1px solid var(--lp-border)' }} />
          <button 
            onClick={() => setShowLogin(true)}
            style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--lp-text-primary)', cursor: 'pointer' }}>
            Log In
          </button>
          <button 
            onClick={() => setShowSignUp(true)}
            style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: 'linear-gradient(135deg, #D4AF37, #B8860B)', color: '#000', fontWeight: 700, cursor: 'pointer' }}>
            Sign Up
          </button>
        </div>

        {/* SECTION 1 - HERO */}
        <section style={{ 
          minHeight: '90vh', position: 'relative', display: 'flex', alignItems: 'center', 
          padding: '72px 64px', overflow: 'hidden' 
        }} className="hero-section responsive-pad">
          <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '800px', background: 'radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '600px', height: '600px', background: 'radial-gradient(ellipse at 90% 90%, rgba(139,92,246,0.05) 0%, transparent 60%)', pointerEvents: 'none' }} />

          <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '60% 40%', width: '100%', gap: '40px', zIndex: 1 }}>
            <div className="animate-fade-up">
              <div style={{ 
                display: 'inline-block', padding: '6px 16px', borderRadius: '20px', 
                background: 'var(--lp-gold-glow)', border: '1px solid var(--lp-border-gold)',
                color: 'var(--lp-gold)', fontSize: '12px', marginBottom: '24px', fontWeight: 600
              }}>
                ⭐ Trusted by 10,000+ Players Worldwide
              </div>
              
              <h1 style={{ 
                fontFamily: '"Cinzel Decorative", serif', fontSize: 'clamp(36px, 4.5vw, 60px)', 
                lineHeight: 1.15, marginBottom: '20px',
                background: 'linear-gradient(135deg, #FFD700 0%, #D4AF37 45%, #B8860B 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }} className="animate-shimmer">
                Play Chess Online on the #1 Platform
              </h1>
              
              <p style={{ fontSize: '18px', color: 'var(--lp-text-secondary)', fontWeight: 300, maxWidth: '480px', lineHeight: 1.7, marginBottom: '36px' }}>
                Join thousands of players. Challenge AI, play friends, and master chess — completely free.
              </p>
              
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <button 
                  onClick={handlePlay}
                  style={{ 
                    height: '52px', padding: '0 32px', borderRadius: '12px', background: 'linear-gradient(135deg, #FFD700, #D4AF37)',
                    color: '#000', fontWeight: 700, fontSize: '15px', border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 24px rgba(212,175,55,0.35)', transition: 'all 0.2s', flex: '1 1 auto', minWidth: '200px'
                  }}
                  onMouseEnter={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 30px rgba(212,175,55,0.5)'; }}
                  onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 24px rgba(212,175,55,0.35)'; }}
                >
                  Get Started Free →
                </button>
                <button 
                  onClick={() => showToast('Watch Video Comming Soon')}
                  style={{ 
                    height: '52px', padding: '0 32px', borderRadius: '12px', background: 'transparent',
                    color: 'var(--lp-gold)', fontWeight: 600, fontSize: '15px', border: '1.5px solid rgba(212,175,55,0.3)', cursor: 'pointer',
                    transition: 'all 0.2s', flex: '1 1 auto', minWidth: '200px'
                  }}
                  onMouseEnter={(e) => { e.target.style.background = 'var(--lp-gold-glow)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
                >
                  Watch How It Works
                </button>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginTop: '24px', fontSize: '12px', color: 'var(--lp-text-secondary)', flexWrap: 'wrap' }}>
                <span>✓ No credit card</span>
                <span>✓ No download</span>
                <span>✓ Instant play</span>
              </div>

              <div style={{ display: 'flex', marginTop: '40px' }}>
                <StatBox num="10K+" label="GAMES" />
                <div style={{ width: '1px', background: 'rgba(212,175,55,0.3)', margin: '0 20px' }} />
                <StatBox num="5" label="AI LEVELS" />
                <div style={{ width: '1px', background: 'rgba(212,175,55,0.3)', margin: '0 20px' }} />
                <StatBox num="500+" label="PLAYERS" />
              </div>
            </div>

            {/* Board Preview */}
            <div className="hero-board hide-on-mobile animate-fade-up" style={{ animationDelay: '0.2s' }}>
              <div className="animate-float" style={{ 
                background: '#1A1208', border: '2px solid #D4AF37', borderRadius: '16px', padding: '16px',
                boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 40px rgba(212,175,55,0.1)', width: 'fit-content', margin: '0 auto'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ width: '24px', height: '24px', background: '#333', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🤖</div>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>AI Expert <span style={{ color: '#888', fontWeight: 400 }}>(2500)</span></span>
                  </div>
                  <div style={{ background: '#222', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '14px' }}>3:42</div>
                </div>

                <div style={{ width: '320px', height: '320px', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', border: '2px solid #444' }}>
                  {Array.from({length: 64}).map((_, i) => {
                    const row = Math.floor(i / 8);
                    const col = i % 8;
                    const isDark = (row + col) % 2 === 1;
                    const isHighlighted = i === 52 || i === 36; // e2 to e4
                    return (
                      <div key={i} style={{ 
                        background: isHighlighted ? 'rgba(212,175,55,0.6)' : (isDark ? '#B58863' : '#F0D9B5'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#000'
                      }}>
                        {/* Just a mockup */}
                        {i === 4 && '♚'}
                        {i === 60 && '♔'}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ width: '24px', height: '24px', background: '#ddd', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>👤</div>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>You — White <span style={{ color: '#888', fontWeight: 400 }}>(1200)</span></span>
                  </div>
                  <div style={{ background: 'var(--lp-green)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '14px', boxShadow: '0 0 10px rgba(76,175,125,0.4)' }}>10:00</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2 - FEATURES */}
        <section style={{ padding: '96px 64px', background: '#0A0A14' }} className="responsive-pad scroll-reveal">
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '4px', color: 'var(--lp-gold)', marginBottom: '16px', fontWeight: 700 }}>WHY CHESSMASTER PRO</div>
            <h2 style={{ fontFamily: '"Cinzel", serif', fontSize: '40px', color: '#fff' }}>Everything You Need to Master Chess</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            <FeatureCard 
              icon="🤖" bg="rgba(212,175,55,0.1)" color="var(--lp-gold)" 
              title="Stockfish AI Engine" 
              desc="Play against the world's strongest chess engine. Choose from 5 difficulty levels — Beginner to Grandmaster."
              link="Play vs AI →" onClick={handlePlay}
            />
            <FeatureCard 
              icon="👥" bg="rgba(139,92,246,0.1)" color="var(--lp-purple)" 
              title="Play with Friends" 
              desc="Challenge your friends locally on the same device or invite them for an online match."
              link="Play Now →" onClick={handlePlay}
            />
            <FeatureCard 
              icon="🎨" bg="rgba(96,165,250,0.1)" color="#60A5FA" 
              title="6 Custom Board Themes" 
              desc="Personalize your experience with Classic, Walnut, Neon, Emerald, Marble, and Midnight themes."
              link="Explore Themes →" onClick={() => navigate('/settings')}
            />
            <FeatureCard 
              icon="📈" bg="rgba(76,175,125,0.1)" color="var(--lp-green)" 
              title="Track Your Progress" 
              desc="Full move history, ELO rating system, game stats, and match analysis to improve your game."
              link="View Stats →" onClick={() => showToast('Stats Coming Soon')}
            />
          </div>
        </section>

        {/* SECTION 3 - MODES */}
        <section style={{ padding: '96px 64px' }} className="responsive-pad scroll-reveal">
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontFamily: '"Cinzel", serif', fontSize: '40px', color: '#fff', marginBottom: '12px' }}>Choose Your Battle</h2>
            <p style={{ color: 'var(--lp-text-secondary)' }}>Three ways to play, all in one place</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
            <div className="mode-card" style={{ 
              background: 'linear-gradient(135deg, #1A1208, #14141F)', border: '1.5px solid var(--lp-gold)',
              borderRadius: '24px', padding: '40px 32px', position: 'relative', boxShadow: '0 0 40px rgba(212,175,55,0.1)'
            }}>
              <div style={{ position: 'absolute', top: '20px', right: '20px', background: 'var(--lp-gold)', color: '#000', fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '4px' }}>MOST POPULAR</div>
              <div style={{ fontSize: '64px', marginBottom: '24px' }}>🤖</div>
              <h3 style={{ fontFamily: '"Cinzel", serif', fontSize: '28px', color: 'var(--lp-gold)', marginBottom: '16px' }}>vs AI</h3>
              <p style={{ color: 'var(--lp-text-secondary)', lineHeight: 1.6, marginBottom: '24px', minHeight: '60px' }}>Face our Stockfish engine. 5 levels from total beginner to grandmaster strength.</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
                <span className="diff-pill">Beginner</span><span className="diff-pill">Easy</span><span className="diff-pill active">Medium</span><span className="diff-pill">Hard</span><span className="diff-pill">Expert</span>
              </div>
              <button onClick={handlePlay} style={{ width: '100%', height: '48px', borderRadius: '12px', background: 'var(--lp-gold)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}>Play vs AI →</button>
            </div>

            <div className="mode-card" style={{ 
              background: 'var(--lp-bg-card)', border: '1.5px solid var(--lp-purple)', borderRadius: '24px', padding: '40px 32px'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '24px' }}>♟</div>
              <h3 style={{ fontFamily: '"Cinzel", serif', fontSize: '28px', color: 'var(--lp-purple)', marginBottom: '16px' }}>Local 2P</h3>
              <p style={{ color: 'var(--lp-text-secondary)', lineHeight: 1.6, marginBottom: '24px', minHeight: '60px' }}>Play on the same device. The board automatically orientates for comfortable pass-and-play.</p>
              <button onClick={handlePlay} style={{ width: '100%', height: '48px', borderRadius: '12px', background: 'var(--lp-purple)', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', marginTop: 'auto' }}>Play vs Friend →</button>
            </div>

            <div className="mode-card" style={{ 
              background: 'var(--lp-bg-card)', border: '1.5px dashed #60A5FA', borderRadius: '24px', padding: '40px 32px', opacity: 0.6
            }}>
              <div style={{ position: 'absolute', top: '20px', right: '20px', background: '#60A5FA', color: '#000', fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '4px' }}>COMING SOON</div>
              <div style={{ fontSize: '64px', marginBottom: '24px' }}>🌐</div>
              <h3 style={{ fontFamily: '"Cinzel", serif', fontSize: '28px', color: '#60A5FA', marginBottom: '16px' }}>Online</h3>
              <p style={{ color: 'var(--lp-text-secondary)', lineHeight: 1.6, marginBottom: '24px', minHeight: '60px' }}>Matchmake with players around the world. Ranked and unranked modes.</p>
              <button onClick={() => showToast('Waitlist Joined!')} style={{ width: '100%', height: '48px', borderRadius: '12px', background: 'transparent', border: '1.5px solid #60A5FA', color: '#60A5FA', fontWeight: 800, cursor: 'pointer', marginTop: 'auto' }}>Join Waitlist →</button>
            </div>
          </div>
        </section>

        {/* SECTION 4 - HOW IT WORKS */}
        <section style={{ padding: '96px 64px', background: '#0A0A14' }} className="responsive-pad scroll-reveal">
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontFamily: '"Cinzel", serif', fontSize: '36px', color: '#fff', marginBottom: '12px' }}>Start Playing in 3 Steps</h2>
            <p style={{ color: 'var(--lp-text-secondary)' }}>No signup required to play instantly</p>
          </div>

          <div className="steps-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px', textAlign: 'center' }}>
            <Step num="01" icon="🎮" title="Choose Mode" desc="Pick vs AI or Local 2P to start." hasArrow />
            <Step num="02" icon="⚙️" title="Set Difficulty" desc="Select your level from Beginner to Expert." hasArrow />
            <Step num="03" icon="♟" title="Play & Improve" desc="Track your moves and master the game." />
          </div>
        </section>

        {/* SECTION 5 - CTA */}
        <section style={{ padding: '96px 64px', background: 'linear-gradient(135deg, #0D0A02, #080810)', position: 'relative', textAlign: 'center' }} className="responsive-pad scroll-reveal">
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
          
          <h2 style={{ fontFamily: '"Cinzel Decorative", serif', fontSize: '52px', marginBottom: '16px', background: 'linear-gradient(135deg, #FFD700, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Ready to Play?
          </h2>
          <p style={{ color: 'var(--lp-text-secondary)', fontSize: '18px', marginBottom: '40px' }}>Join 10,000+ players. Free forever.</p>
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={handlePlay} style={{ height: '52px', padding: '0 40px', borderRadius: '12px', background: 'var(--lp-gold)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '16px' }}>Play Now — Free →</button>
            <button onClick={() => showToast('Pricing coming soon')} style={{ height: '52px', padding: '0 40px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '16px' }}>View Pricing</button>
          </div>
        </section>

        {/* SECTION 6 - FOOTER */}
        <footer style={{ background: '#060609', borderTop: '1px solid rgba(212,175,55,0.08)', padding: '64px 64px 32px' }} className="responsive-pad">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '48px', marginBottom: '64px' }}>
            <div style={{ gridColumn: '1 / -1', maxWidth: '300px' }} className="footer-brand-col">
              <div style={{ fontSize: '24px', color: 'var(--lp-gold)', fontFamily: '"Cinzel Decorative", serif', marginBottom: '16px' }}>♚ ChessMaster Pro</div>
              <p style={{ color: 'var(--lp-text-secondary)', fontSize: '14px', marginBottom: '24px' }}>Play. Learn. Dominate.</p>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              </div>
            </div>
            
            <div>
              <h4 style={{ fontFamily: '"Cinzel", serif', color: 'var(--lp-gold)', fontSize: '14px', marginBottom: '20px' }}>Play</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--lp-text-secondary)', fontSize: '14px' }}>
                <span style={{ cursor: 'pointer' }} onClick={handlePlay}>vs AI</span>
                <span style={{ cursor: 'pointer' }} onClick={handlePlay}>Local 2P</span>
                <span style={{ cursor: 'pointer' }}>Online (Soon)</span>
              </div>
            </div>

            <div>
              <h4 style={{ fontFamily: '"Cinzel", serif', color: 'var(--lp-gold)', fontSize: '14px', marginBottom: '20px' }}>Learn</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--lp-text-secondary)', fontSize: '14px' }}>
                <span style={{ cursor: 'pointer' }}>Chess Basics</span>
                <span style={{ cursor: 'pointer' }}>Openings</span>
                <span style={{ cursor: 'pointer' }}>Tactics</span>
              </div>
            </div>

            <div>
              <h4 style={{ fontFamily: '"Cinzel", serif', color: 'var(--lp-gold)', fontSize: '14px', marginBottom: '20px' }}>Company</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--lp-text-secondary)', fontSize: '14px' }}>
                <span style={{ cursor: 'pointer' }}>About</span>
                <span style={{ cursor: 'pointer' }}>Contact</span>
                <span style={{ cursor: 'pointer' }}>Terms</span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--lp-border)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: '12px', flexWrap: 'wrap' }}>
            <span>© 2026 ChessMaster Pro. Made with ❤️</span>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span>Privacy</span><span>Terms</span><span>Cookies</span>
            </div>
          </div>
        </footer>

      </main>

      <LandingPageToast show={!!toastMsg} message={toastMsg} onClose={() => setToastMsg('')} />
      <SignUpModal show={showSignUp} onClose={() => setShowSignUp(false)} onSwitchToLogin={() => { setShowSignUp(false); setShowLogin(true); }} />
      <LoginModal show={showLogin} onClose={() => setShowLogin(false)} onSwitchToSignUp={() => { setShowLogin(false); setShowSignUp(true); }} />

      <style dangerouslySetInnerHTML={{__html: `
        .feature-card { transition: all 0.3s; position: relative; overflow: hidden; }
        .feature-card:hover { transform: translateY(-6px); border-color: var(--lp-gold); box-shadow: 0 10px 30px var(--lp-gold-glow); }
        .feature-card::before { content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent); transform: skewX(-20deg); transition: 0.5s; }
        .feature-card:hover::before { left: 150%; }

        .diff-pill { padding: 4px 10px; border-radius: 12px; border: 1px solid var(--lp-border-gold); font-size: 11px; color: var(--lp-text-secondary); }
        .diff-pill.active { background: var(--lp-gold); color: #000; font-weight: 700; }

        @media (max-width: 768px) {
          .mobile-only-navbar { display: flex !important; }
          .lp-sidebar { transform: translateX(-100%); transition: transform 0.3s; width: 280px; z-index: 120; }
          .lp-sidebar.mobile-open { transform: translateX(0); }
          .lp-content { margin-top: 64px; }
          .hide-on-mobile { display: none !important; }
          .hero-grid { grid-template-columns: 1fr !important; }
          .responsive-pad { padding: 48px 24px !important; }
          .footer-brand-col { max-width: 100% !important; margin-bottom: 32px; }
        }
      `}} />
    </div>
  );
}

function StatBox({ num, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: '"Cinzel", serif', fontSize: '28px', color: 'var(--lp-gold)' }}>{num}</div>
      <div style={{ fontSize: '11px', color: 'var(--lp-text-secondary)', letterSpacing: '2px' }}>{label}</div>
    </div>
  );
}

function FeatureCard({ icon, bg, color, title, desc, link, onClick }) {
  return (
    <div className="feature-card" style={{ background: 'var(--lp-bg-card)', border: '1px solid var(--lp-border)', borderRadius: '20px', padding: '32px 24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '20px' }}>{icon}</div>
      <h3 style={{ fontFamily: '"Cinzel", serif', fontSize: '18px', marginBottom: '12px', color: 'var(--lp-text-primary)' }}>{title}</h3>
      <p style={{ color: 'var(--lp-text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px', flex: 1 }}>{desc}</p>
      <span onClick={onClick} style={{ color: color, fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>{link}</span>
    </div>
  );
}

function Step({ num, icon, title, desc, hasArrow }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <div style={{ fontFamily: '"Cinzel", serif', fontSize: '64px', color: 'var(--lp-gold)', opacity: 0.15, lineHeight: 1, marginBottom: '-20px' }}>{num}</div>
      <div style={{ fontSize: '32px', marginBottom: '16px', position: 'relative', zIndex: 1 }}>{icon}</div>
      <h3 style={{ fontFamily: '"Cinzel", serif', fontSize: '20px', marginBottom: '8px', color: 'var(--lp-text-primary)' }}>{title}</h3>
      <p style={{ fontSize: '14px', color: 'var(--lp-text-secondary)', lineHeight: 1.5 }}>{desc}</p>
      {hasArrow && <div className="hide-on-mobile" style={{ position: 'absolute', right: '-20px', top: '50%', color: 'var(--lp-border-gold)', fontSize: '24px' }}>→</div>}
    </div>
  );
}
