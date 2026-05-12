import './App.css';
import { GameProvider } from './context/GameContext';
import { ToastProvider } from './components/ToastContext';
import { AuthProvider } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import DemoPage from './pages/DemoPage';
import SettingsScreen from './screens/SettingsScreen';
import GameHistoryPage from './pages/GameHistoryPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import SplashScreen from './components/SplashScreen';
import Onboarding from './components/Onboarding';
import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem('onboarded'));

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="app-root">
      {showOnboarding && !showSplash && <Onboarding onFinish={() => setShowOnboarding(false)} />}
      <AuthProvider>
        <GameProvider>
          <ToastProvider>
            <HashRouter>
              {showSplash ? (
                <SplashScreen />
              ) : (
                <AppShell>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/play" element={<GamePage />} />
                  
                  {/* Demo Pages for Sidebar Navigation */}
                  <Route path="/puzzles" element={<DemoPage />} />
                  <Route path="/puzzles/daily" element={<DemoPage />} />
                  <Route path="/puzzles/rush" element={<DemoPage />} />
                  <Route path="/puzzles/battle" element={<DemoPage />} />
                  <Route path="/puzzles/custom" element={<DemoPage />} />
                  
                  <Route path="/learn" element={<DemoPage />} />
                  <Route path="/learn/lessons" element={<DemoPage />} />
                  <Route path="/learn/openings" element={<DemoPage />} />
                  
                  <Route path="/train" element={<DemoPage />} />
                  <Route path="/train/courses" element={<DemoPage />} />
                  <Route path="/train/analysis" element={<DemoPage />} />
                  <Route path="/train/insights" element={<DemoPage />} />
                  <Route path="/train/classroom" element={<DemoPage />} />
                  <Route path="/train/endgames" element={<DemoPage />} />
                  <Route path="/train/practice" element={<DemoPage />} />
                  <Route path="/train/aimchess" element={<DemoPage />} />
                  
                  <Route path="/watch" element={<DemoPage />} />
                  
                  <Route path="/community" element={<DemoPage />} />
                  <Route path="/community/members" element={<DemoPage />} />
                  <Route path="/community/coaches" element={<DemoPage />} />
                  <Route path="/community/top-players" element={<DemoPage />} />
                  
                  <Route path="/stats" element={<DemoPage />} />
                  <Route path="/tournaments" element={<DemoPage />} />
                  <Route path="/variants" element={<DemoPage />} />
                  <Route path="/history" element={<GameHistoryPage />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />

                  <Route path="/settings" element={<SettingsScreen />} />
                  <Route path="*" element={<HomePage />} />
                </Routes>
              </AppShell>
            )}
            </HashRouter>
          </ToastProvider>
        </GameProvider>
      </AuthProvider>
    </div>
  );
}
