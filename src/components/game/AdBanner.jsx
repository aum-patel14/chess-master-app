import './AdBanner.css';
import { useGame } from '../../context/GameContext';
import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';

export default function AdBanner() {
  const { isPremium, upgradeToPremium } = useGame();
  const [closed, setClosed] = useState(false);

  // If user is premium or banner manually closed, do not render
  if (isPremium || closed) return null;

  return (
    <div className="ad-banner-outer-container">
      <div className="ad-banner-leaderboard">
        <button className="ad-close-button" onClick={() => setClosed(true)} title="Hide ad">
          <X size={12} />
        </button>
        <span className="ad-sponsored-tag">SPONSORED AD</span>
        
        <div className="ad-banner-content">
          <div className="ad-badge">PRO</div>
          <p className="ad-headline">
            Tired of ads and daily limits? <strong>Upgrade to Premium</strong> for unlimited analysis, custom piece sets, and unlimited puzzles!
          </p>
          <button className="ad-action-button" onClick={upgradeToPremium}>
            <Sparkles size={14} style={{ marginRight: '6px' }} />
            Go Pro
          </button>
        </div>
      </div>
    </div>
  );
}
