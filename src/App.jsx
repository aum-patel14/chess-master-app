import './App.css';
import { lazy, Suspense, useState, useEffect } from 'react';
import { MotionConfig, AnimatePresence } from 'framer-motion';
import { GameProvider } from './context/GameContext';
import { ToastProvider } from './hooks/useToast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import SplashScreen from './components/SplashScreen';
import Onboarding from './components/Onboarding';
import BottomNav from './components/BottomNav';
import QuickPlayFAB from './components/QuickPlayFAB';
import ShortcutsModal from './components/ShortcutsModal';
import ErrorBoundary from './components/ErrorBoundary';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

function PlayRedirect() {
  const loc = useLocation();
  return <Navigate to={`/game${loc.search}`} replace />;
}

const HomePage = lazy(() => import('./pages/HomePage'));
const GamePage = lazy(() => import('./pages/GamePage'));
const PuzzlePage = lazy(() => import('./pages/PuzzlePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'));
const LearnPage = lazy(() => import('./pages/LearnPage'));
const GameHistoryPage = lazy(() => import('./pages/GameHistoryPage'));
const TournamentsPage = lazy(() => import('./pages/TournamentsPage'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const DemoPage = lazy(() => import('./pages/DemoPage'));

const suspenseFallback = (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a14', color: '#d4af37', fontSize: '2rem' }}>♛</div>
);

function AuthConsumerBanner() {
  const { userData } = useAuth();
  if (userData?.isGuest) {
    return (
      <div style={{ background: '#3b82f6', color: '#fff', textAlign: 'center', padding: '6px 16px', fontSize: '13px', fontWeight: 600, display: 'flex', justifyContent: 'center', gap: '8px', zIndex: 100, position: 'relative' }}>
        <span>Playing as Guest — Sign up to save your progress</span>
      </div>
    );
  }
  return null;
}

function RouteSwitch() {
  const location = useLocation();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const r = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        if (!isMobile) setShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobile]);

  return (
    <>
      <AuthConsumerBanner />
      <AnimatePresence mode="wait">
        <Suspense fallback={suspenseFallback}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<ErrorBoundary><HomePage /></ErrorBoundary>} />
            <Route path="/game" element={<ErrorBoundary><GamePage /></ErrorBoundary>} />
            <Route path="/play" element={<PlayRedirect />} />
            <Route path="/puzzles" element={<ErrorBoundary><PuzzlePage /></ErrorBoundary>} />
            <Route path="/learn" element={<ErrorBoundary><LearnPage /></ErrorBoundary>} />
            <Route path="/leaderboard" element={<ErrorBoundary><LeaderboardPage /></ErrorBoundary>} />
            <Route path="/stats" element={<ErrorBoundary><StatsPage /></ErrorBoundary>} />
            <Route path="/achievements" element={<ErrorBoundary><AchievementsPage /></ErrorBoundary>} />
            <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
            <Route path="/history" element={<ErrorBoundary><GameHistoryPage /></ErrorBoundary>} />
            <Route path="/tournaments" element={<ErrorBoundary><TournamentsPage /></ErrorBoundary>} />
            <Route path="/privacy" element={<ErrorBoundary><PrivacyPolicy /></ErrorBoundary>} />
            <Route path="/watch" element={<ErrorBoundary><DemoPage /></ErrorBoundary>} />
            <Route path="/train/*" element={<ErrorBoundary><DemoPage /></ErrorBoundary>} />
            <Route path="/community/*" element={<ErrorBoundary><DemoPage /></ErrorBoundary>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
      <BottomNav />
      <QuickPlayFAB />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} isMobile={isMobile} />
      {!isMobile && (
        <button
          type="button"
          onClick={() => setShortcutsOpen(true)}
          style={{
            position: 'fixed',
            bottom: 24,
            left: 24,
            zIndex: 90,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '1px solid rgba(212,175,55,0.35)',
            background: '#1a1a2e',
            color: '#d4af37',
            fontWeight: 800,
            cursor: 'pointer',
          }}
          aria-label="Keyboard shortcuts"
        >
          ?
        </button>
      )}
    </>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem('chess_onboarded'));

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="app-root">
      <MotionConfig reducedMotion="user">
        {showOnboarding && !showSplash && <Onboarding onFinish={() => setShowOnboarding(false)} />}
        <AuthProvider>
          <GameProvider>
            <ToastProvider>
              <HashRouter>
                {showSplash ? (
                  <SplashScreen />
                ) : (
                  <AppShell>
                    <RouteSwitch />
                  </AppShell>
                )}
              </HashRouter>
            </ToastProvider>
          </GameProvider>
        </AuthProvider>
      </MotionConfig>
    </div>
  );
}
