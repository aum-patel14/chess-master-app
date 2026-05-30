import { useState } from 'react';
import Sidebar from './Sidebar';
import { TopBar } from './TopBar';
import AdBanner from '../game/AdBanner';
import { SignUpModal, LoginModal } from '../modals/Modals';
import './AppShell.css';

export default function AppShell({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="app-shell" style={{ '--sidebar-width': isExpanded ? '220px' : '64px' }}>
      <Sidebar 
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(prev => !prev)}
        onOpenSignUp={() => setShowSignUp(true)}
        onOpenLogin={() => setShowLogin(true)}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />
      
      <div className="main-area">
        <TopBar 
          onOpenMobileMenu={() => setMobileMenuOpen(prev => !prev)} 
          mobileMenuOpen={mobileMenuOpen}
        />
        <main className="page-content" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {children}
        </main>
        <AdBanner />
      </div>

      <SignUpModal show={showSignUp} onClose={() => setShowSignUp(false)} onSwitchToLogin={() => { setShowSignUp(false); setShowLogin(true); }} />
      <LoginModal show={showLogin} onClose={() => setShowLogin(false)} onSwitchToSignUp={() => { setShowLogin(false); setShowSignUp(true); }} />
    </div>
  );
}
