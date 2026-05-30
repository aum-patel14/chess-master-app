import './UpgradeModal.css';
import { X, Check, Crown } from 'lucide-react';

export default function UpgradeModal({ show, onClose, onUpgrade, reason }) {
  if (!show) return null;

  return (
    <div className="upgrade-modal-overlay">
      <div className="upgrade-modal-card">
        <button className="upgrade-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="upgrade-header">
          <div className="upgrade-crown-icon">
            <Crown size={40} className="glow-icon" />
          </div>
          <h2 className="upgrade-title font-cinzel">UPGRADE TO PREMIUM</h2>
          {reason ? (
            <p className="upgrade-reason-alert">{reason}</p>
          ) : (
            <p className="upgrade-subtitle">Get the ultimate chess experience with pro features</p>
          )}
        </div>

        <div className="upgrade-perks-list">
          <div className="perk-item">
            <div className="perk-check"><Check size={14} /></div>
            <span className="perk-text"><strong>Unlimited Game Analysis</strong> (Free: 3/day)</span>
          </div>
          <div className="perk-item">
            <div className="perk-check"><Check size={14} /></div>
            <span className="perk-text"><strong>All Board Themes</strong> (Unlock Wood, Midnight, Ocean)</span>
          </div>
          <div className="perk-item">
            <div className="perk-check"><Check size={14} /></div>
            <span className="perk-text"><strong>All Custom Piece Sets</strong> (Unlock Premium piece designs)</span>
          </div>
          <div className="perk-item">
            <div className="perk-check"><Check size={14} /></div>
            <span className="perk-text"><strong>Unlimited Puzzles</strong> (Free: 10/day)</span>
          </div>
          <div className="perk-item">
            <div className="perk-check"><Check size={14} /></div>
            <span className="perk-text"><strong>Export PGN & Share Games</strong> with friends</span>
          </div>
          <div className="perk-item">
            <div className="perk-check"><Check size={14} /></div>
            <span className="perk-text"><strong>Remove all Ads</strong> for clean focus</span>
          </div>
        </div>

        <div className="upgrade-pricing-container">
          <div className="pricing-option popular">
            <div className="pricing-badge">BEST VALUE</div>
            <span className="pricing-duration">12 Months</span>
            <span className="pricing-price">$59.99<span className="price-suffix">/year</span></span>
            <span className="pricing-savings">Save 37% ($5.00/mo)</span>
          </div>

          <div className="pricing-option">
            <span className="pricing-duration">Monthly</span>
            <span className="pricing-price">$7.99<span className="price-suffix">/mo</span></span>
            <span className="pricing-savings">Flexible billing</span>
          </div>
        </div>

        <div className="upgrade-action-area">
          <button className="upgrade-submit-btn font-cinzel" onClick={onUpgrade}>
            Start 7-Day Free Trial
          </button>
          <button className="upgrade-cancel-btn" onClick={onClose}>
            Maybe later
          </button>
          <p className="upgrade-trust-line">Cancel anytime · Secure payment</p>
        </div>
      </div>
    </div>
  );
}
