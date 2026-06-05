import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../Navbar';
import Drawer from '../Drawer';
import AdBanner from '../game/AdBanner';
import { SignUpModal, LoginModal } from '../modals/Modals';
import './AppShell.css';

export default function AppShell({ children }) {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const isLandingPage = location.pathname === '/';

  if (isLandingPage) {
    return (
      <div className="app-shell landing-shell" style={{ height: '100vh', overflow: 'hidden' }}>
        <main style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Navbar 
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenSignUp={() => setShowSignUp(true)}
        onOpenLogin={() => setShowLogin(true)}
      />
      
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenSignUp={() => setShowSignUp(true)}
        onOpenLogin={() => setShowLogin(true)}
      />
      
      <div className="main-area">
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
