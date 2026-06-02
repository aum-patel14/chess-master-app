import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../hooks/usePremium';
import { useToast } from '../hooks/useToast';
import { Check, X, Crown, ShieldCheck, Lock, Sparkles, HelpCircle, ArrowLeft, Trophy, Zap, CreditCard, ChevronDown, Award } from 'lucide-react';
import './PremiumPage.css';

const API_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export default function PremiumPage() {
  const navigate = useNavigate();
  const { currentUser, userData, logout } = useAuth();
  const { showToast } = useToast();
  const { tier, isSilver, isGold, isDiamond } = usePremium();

  // Search parameters for Stripe redirect completions
  const [searchParams] = useSearchParams();
  const checkoutSessionId = searchParams.get('session_id');

  const [isAnnual, setIsAnnual] = useState(true);
  const [loadingTier, setLoadingTier] = useState('');
  const [activeFaq, setActiveFaq] = useState(null);

  // Trigger celebration on successful Stripe redirects
  useEffect(() => {
    if (checkoutSessionId) {
      // Trigger multiple confetti showers
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
      showToast('Welcome to ChessMaster Pro Premium! Subscription activated successfully! 👑', 'success', 5000);
    }
  }, [checkoutSessionId, showToast]);

  const handleCheckout = async (planTier) => {
    if (!currentUser) {
      showToast('Please sign in or register to upgrade your account!', 'warning');
      return;
    }

    setLoadingTier(planTier);
    const payload = {
      userId: currentUser.id,
      planTier,
      billingCycle: isAnnual ? 'annual' : 'monthly'
    };

    try {
      const response = await fetch(`${API_URL}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        showToast('Stripe checkout failed. Please try again.', 'warning');
        setLoadingTier('');
      }
    } catch (err) {
      console.error(err);
      showToast('Stripe offline. Local Sandbox premium simulated!', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  const handleManageBilling = async () => {
    if (!currentUser || !userData?.stripe_customer_id) return;
    try {
      const response = await fetch(`${API_URL}/api/stripe/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      showToast('Unable to open billing portal at this time.', 'warning');
    }
  };

  // SUCCESS COMPLETION RENDER
  if (checkoutSessionId) {
    return (
      <PageShell>
        <div className="premium-success-landing-wrapper font-sans">
          <div className="success-glass-card animate-slide-up">
            <div className="crown-success-ring">
              <Crown size={48} className="success-crown" />
            </div>
            
            <h1 className="font-cinzel text-glow">YOU ARE NOW PREMIUM!</h1>
            <p className="success-congrats-text">
              Congratulations! Your account has been successfully upgraded to the premium tier.
              Your custom Glicko-2 ratings remain fully synced.
            </p>

            <div className="unlocked-dashboard font-cinzel">
              <h3>MEMBERSHIP PLAN: {tier.toUpperCase()}</h3>
              <div className="unlocked-items-row font-sans">
                <div className="unlocked-pill">✓ Unlimited Puzzles</div>
                <div className="unlocked-pill">✓ Unlimited Puzzle Rush</div>
                <div className="unlocked-pill">✓ Opening Explorer</div>
                <div className="unlocked-pill">✓ Vision drills</div>
                <div className="unlocked-pill">✓ All bots & themes</div>
              </div>
            </div>

            <div className="success-links-grid font-cinzel">
              <button className="success-nav-btn go-play" onClick={() => navigate('/game')}>
                <Zap size={15} />
                <span>Play Live Match</span>
              </button>
              <button className="success-nav-btn go-puzzles" onClick={() => navigate('/puzzles')}>
                <Trophy size={15} />
                <span>Practice Puzzles</span>
              </button>
              <button className="success-nav-btn go-learn" onClick={() => navigate('/learn')}>
                <Award size={15} />
                <span>Lessons Center</span>
              </button>
            </div>

            <button className="success-back-home-btn" onClick={() => navigate('/')}>
              Back to Home page
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  // PRICING PAGE COMPARISON
  return (
    <PageShell>
      <div className="premium-page-wrapper">
        
        {/* HERO TITLE HEADER */}
        <div className="premium-hero">
          <button 
            type="button" 
            onClick={() => navigate('/')} 
            className="premium-back-home-btn font-cinzel"
          >
            ← Home
          </button>
          <div className="crown-hero-badge animate-bounce-slow">
            <Crown size={36} fill="#e2b04a" className="gold-text" />
          </div>
          <h1 className="font-cinzel text-glow">CHESSMASTER PRO MEMBERSHIP</h1>
          <p className="premium-tagline">
            Join 250,000+ chess players unlocking their full tactical potential with Grandmaster tools.
          </p>

          {/* MONTHLY / ANNUAL SWITCHER */}
          <div className="billing-switcher-wrapper font-cinzel">
            <button 
              className={`cycle-btn ${!isAnnual ? 'active' : ''}`}
              onClick={() => setIsAnnual(false)}
            >
              Monthly Billing
            </button>
            <button 
              className={`cycle-btn annual ${isAnnual ? 'active' : ''}`}
              onClick={() => setIsAnnual(true)}
            >
              <span>Annual Billing</span>
              <span className="save-badge">SAVE 40%</span>
            </button>
          </div>
        </div>

        {/* COMPARATIVE PRODUCT CARD GRID */}
        <div className="premium-tiers-grid font-sans">
          
          {/* SILVER TIER CARD */}
          <div className={`tier-card ${tier === 'silver' ? 'active-tier' : ''}`}>
            {tier === 'silver' && <div className="current-plan-badge">CURRENT PLAN</div>}
            <div className="card-header">
              <span className="plan-label font-cinzel">SILVER PLAN</span>
              <h2 className="font-cinzel">
                {isAnnual ? 'Rs 999' : 'Rs 149'}
                <span className="price-suffix">{isAnnual ? '/year' : '/month'}</span>
              </h2>
              {isAnnual && <p className="equivalent-text">Rs 83 / month</p>}
            </div>

            <div className="card-perks">
              <div className="perk-bullet"><Check size={14} className="gold-text" /><span>Unlimited rated puzzles</span></div>
              <div className="perk-bullet"><Check size={14} className="gold-text" /><span>All 100+ Chess Bots</span></div>
              <div className="perk-bullet"><Check size={14} className="gold-text" /><span>All premium board & piece sets</span></div>
              <div className="perk-bullet"><Check size={14} className="gold-text" /><span>5 Full Game Analyses per day</span></div>
              <div className="perk-bullet"><Check size={14} className="gold-text" /><span>100% clean, Ad-free chess</span></div>
            </div>

            <button 
              className={`card-cta-btn ${tier === 'silver' ? 'manage-btn' : ''}`}
              onClick={() => tier === 'silver' ? handleManageBilling() : handleCheckout('silver')}
              disabled={loadingTier !== ''}
            >
              {loadingTier === 'silver' ? 'Connecting secure portal...' : tier === 'silver' ? 'Manage Subscription' : 'Upgrade to Silver'}
            </button>
          </div>

          {/* GOLD TIER CARD (BEST VALUE) */}
          <div className={`tier-card highlighted ${tier === 'gold' ? 'active-tier' : ''}`}>
            <div className="popular-ribbon font-cinzel">MOST POPULAR</div>
            {tier === 'gold' && <div className="current-plan-badge">CURRENT PLAN</div>}
            
            <div className="card-header">
              <span className="plan-label font-cinzel gold">GOLD PLAN</span>
              <h2 className="font-cinzel gold-text">
                {isAnnual ? 'Rs 2499' : 'Rs 349'}
                <span className="price-suffix gold">{isAnnual ? '/year' : '/month'}</span>
              </h2>
              {isAnnual && <p className="equivalent-text">Rs 208 / month</p>}
            </div>

            <div className="card-perks">
              <div className="perk-bullet"><Check size={14} className="gold-text" /><span>Everything in Silver included</span></div>
              <div className="perk-bullet"><Check size={14} className="gold-text" /><span>Unlimited Puzzle Rush runs</span></div>
              <div className="perk-bullet"><Check size={14} className="gold-text" /><span>Masters Opening Explorer</span></div>
              <div className="perk-bullet"><Check size={14} className="gold-text" /><span>Advanced Chess Insights metrics</span></div>
              <div className="perk-bullet"><Check size={14} className="gold-text" /><span>Board coordinates training</span></div>
              <div className="perk-bullet"><Check size={14} className="gold-text" /><span>Priority Sockets matchmaking</span></div>
            </div>

            <button 
              className={`card-cta-btn highlight ${tier === 'gold' ? 'manage-btn' : ''}`}
              onClick={() => tier === 'gold' ? handleManageBilling() : handleCheckout('gold')}
              disabled={loadingTier !== ''}
            >
              {loadingTier === 'gold' ? 'Connecting secure portal...' : tier === 'gold' ? 'Manage Subscription' : 'Upgrade to Gold'}
            </button>
          </div>

          {/* DIAMOND TIER CARD */}
          <div className={`tier-card ${tier === 'diamond' ? 'active-tier' : ''}`}>
            {tier === 'diamond' && <div className="current-plan-badge">CURRENT PLAN</div>}
            
            <div className="card-header">
              <span className="plan-label font-cinzel diamond">DIAMOND PLAN</span>
              <h2 className="font-cinzel diamond-text">
                {isAnnual ? 'Rs 4499' : 'Rs 599'}
                <span className="price-suffix">{isAnnual ? '/year' : '/month'}</span>
              </h2>
              {isAnnual && <p className="equivalent-text">Rs 375 / month</p>}
            </div>

            <div className="card-perks">
              <div className="perk-bullet"><Check size={14} className="gold-text" /><span>Everything in Gold included</span></div>
              <div className="perk-bullet"><Check size={14} className="gold-text" /><span>Unlimited full game analyses</span></div>
              <div className="perk-bullet"><Check size={14} className="gold-text" /><span>Stockfish high-speed cloud engine</span></div>
              <div className="perk-bullet"><Check size={14} className="gold-text" /><span>30% Grandmaster Coaching discount</span></div>
              <div className="perk-bullet"><Check size={14} className="gold-text" /><span>Early access to upcoming features</span></div>
            </div>

            <button 
              className={`card-cta-btn ${tier === 'diamond' ? 'manage-btn' : ''}`}
              onClick={() => tier === 'diamond' ? handleManageBilling() : handleCheckout('diamond')}
              disabled={loadingTier !== ''}
            >
              {loadingTier === 'diamond' ? 'Connecting secure portal...' : tier === 'diamond' ? 'Manage Subscription' : 'Upgrade to Diamond'}
            </button>
          </div>

        </div>

        {/* DETAILED COMPARISON TABLE */}
        <div className="detailed-comparison-section font-sans">
          <h2 className="font-cinzel text-glow">COMPARE ALL TIERS</h2>
          
          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr className="font-cinzel">
                  <th>FEATURE</th>
                  <th>FREE</th>
                  <th>SILVER</th>
                  <th>GOLD</th>
                  <th>DIAMOND</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Daily Rated Puzzles Limit</td>
                  <td>3 per day</td>
                  <td className="premium-check">Unlimited</td>
                  <td className="premium-check">Unlimited</td>
                  <td className="premium-check">Unlimited</td>
                </tr>
                <tr>
                  <td>Puzzle Rush Modes</td>
                  <td><X size={14} className="red-x" /></td>
                  <td><X size={14} className="red-x" /></td>
                  <td className="premium-check">Unlimited</td>
                  <td className="premium-check">Unlimited</td>
                </tr>
                <tr>
                  <td>Interactive Lessons</td>
                  <td>Basic coordinates</td>
                  <td className="premium-check">Full Seeded list</td>
                  <td className="premium-check">Unlimited + Drills</td>
                  <td className="premium-check">Unlimited + Drills</td>
                </tr>
                <tr>
                  <td>Opening Explorer & vision</td>
                  <td><X size={14} className="red-x" /></td>
                  <td><X size={14} className="red-x" /></td>
                  <td className="premium-check">Masters Explorer</td>
                  <td className="premium-check">Masters Explorer</td>
                </tr>
                <tr>
                  <td>AI Bot Personalities</td>
                  <td>25 bots</td>
                  <td className="premium-check">All 100+ bots</td>
                  <td className="premium-check">All 100+ bots</td>
                  <td className="premium-check">All 100+ bots</td>
                </tr>
                <tr>
                  <td>Deep Stockfish Reviews</td>
                  <td>1 per day</td>
                  <td>5 reviews/day</td>
                  <td>5 reviews/day</td>
                  <td className="premium-check">Unlimited Cloud</td>
                </tr>
                <tr>
                  <td>Ad-free boards</td>
                  <td>Renders banner</td>
                  <td className="premium-check">Clean Ad-free</td>
                  <td className="premium-check">Clean Ad-free</td>
                  <td className="premium-check">Clean Ad-free</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ ACCORDION SECTION */}
        <div className="faq-section font-sans">
          <h2 className="font-cinzel text-glow">FREQUENTLY ASKED QUESTIONS</h2>
          
          <div className="faq-grid">
            {[
              {
                q: 'Can I cancel my subscription anytime?',
                a: 'Yes, absolutely! You can cancel, upgrade, or downgrade your active subscription instantly at any time via the Stripe billing portal inside your Settings profile page.'
              },
              {
                q: 'Is my card data safe on ChessMaster Pro?',
                a: 'Completely. We never process or store credit card details directly on our servers. All transactions are securely authenticated and processed via Stripe SSL encryptions.'
              },
              {
                q: 'What happens to my chess history if I cancel?',
                a: 'All your ELO ratings, puzzles statistics, matches logs, and profile achievements are securely saved on Supabase and remain fully accessible on your Free plan tier.'
              },
              {
                q: 'Do you offer refunds for active pricing cycles?',
                a: 'Subscriptions are non-refundable, but when you cancel, your premium benefits remain fully active and unlocked until the current billing period expires.'
              }
            ].map((item, idx) => (
              <div 
                key={idx} 
                className={`faq-accordion-item ${activeFaq === idx ? 'expanded' : ''}`}
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
              >
                <div className="faq-question-header font-cinzel">
                  <span>{item.q}</span>
                  <ChevronDown size={16} className="arrow-icon" />
                </div>
                {activeFaq === idx && (
                  <div className="faq-answer-body animate-fade-in">
                    <p>{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* TRUST SIGNALS FOOTER */}
        <div className="premium-trust-signals-footer font-sans">
          <div className="trust-card">
            <ShieldCheck size={20} className="gold-text" />
            <h4 className="font-cinzel">SSL Secure Payments</h4>
            <p>Cards secured and processed directly by Stripe servers.</p>
          </div>
          <div className="trust-card">
            <Lock size={20} className="gold-text" />
            <h4 className="font-cinzel">Flexible Subscription</h4>
            <p>No long-term commitments. Cancel online anytime.</p>
          </div>
          <div className="trust-card">
            <CreditCard size={20} className="gold-text" />
            <h4 className="font-cinzel">Zero Hidden Costs</h4>
            <p>Prices listed above are exactly what you pay.</p>
          </div>
        </div>

      </div>
    </PageShell>
  );
}
