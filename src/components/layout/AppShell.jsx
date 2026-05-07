import { useState } from 'react';
import Sidebar from './Sidebar';
import { TopBar } from './TopBar';
import { SignUpModal, LoginModal } from '../modals/Modals';
import './AppShell.css';

export default function AppShell({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar 
        onOpenSignUp={() => setShowSignUp(true)}
        onOpenLogin={() => setShowLogin(true)}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />
      
      <div className="main-area">
        <TopBar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="page-content">
          {children}
        </main>
      </div>

      <SignUpModal show={showSignUp} onClose={() => setShowSignUp(false)} onSwitchToLogin={() => { setShowSignUp(false); setShowLogin(true); }} />
      <LoginModal show={showLogin} onClose={() => setShowLogin(false)} onSwitchToSignUp={() => { setShowLogin(false); setShowSignUp(true); }} />
    </div>
  );
}
