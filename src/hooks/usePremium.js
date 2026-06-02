import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocalStorage } from './useLocalStorage';

/**
 * Custom Hook for Premium Subscription Feature Gating
 * Returns active tier, tier booleans, feature checking function, and Upgrade Modal controls.
 */
export function usePremium() {
  const { userData } = useAuth();
  const [localPremiumMock] = useLocalStorage('chess_premium_mock', false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [highlightedFeature, setHighlightedFeature] = useState('');

  // Determine active tier based on logged in user profile or local mockup toggle
  const tier = useMemo(() => {
    if (localPremiumMock) return 'diamond'; // Unlock everything for testing
    if (userData && userData.subscription_tier) {
      return userData.subscription_tier.toLowerCase();
    }
    return 'free';
  }, [userData, localPremiumMock]);

  const isSilver = useMemo(() => ['silver', 'gold', 'diamond'].includes(tier), [tier]);
  const isGold = useMemo(() => ['gold', 'diamond'].includes(tier), [tier]);
  const isDiamond = useMemo(() => tier === 'diamond', [tier]);

  /**
   * Validates if a feature is unlocked for the current user's tier.
   * If not unlocked and triggerModal is true, opens the upgrade modal.
   */
  const checkFeature = (feature, triggerModal = true) => {
    let allowed = false;

    switch (feature) {
      case 'unlimited_puzzles':
        allowed = isSilver;
        break;
      case 'game_analysis':
        allowed = isSilver; // Silver gets basic, Diamond get unlimited
        break;
      case 'opening_explorer':
        allowed = isGold;
        break;
      case 'insights':
        allowed = isGold;
        break;
      case 'puzzle_rush_unlimited':
        allowed = isGold;
        break;
      case 'cloud_analysis':
        allowed = isDiamond;
        break;
      case 'all_themes':
        allowed = isSilver;
        break;
      case 'all_bots':
        allowed = isSilver;
        break;
      default:
        allowed = false;
    }

    if (!allowed && triggerModal) {
      setHighlightedFeature(feature);
      setShowUpgradeModal(true);
    }

    return allowed;
  };

  const triggerUpgradeModal = (feature = '') => {
    setHighlightedFeature(feature);
    setShowUpgradeModal(true);
  };

  return {
    tier,
    isSilver,
    isGold,
    isDiamond,
    checkFeature,
    showUpgradeModal,
    setShowUpgradeModal,
    highlightedFeature,
    setHighlightedFeature,
    triggerUpgradeModal
  };
}
export default usePremium;
