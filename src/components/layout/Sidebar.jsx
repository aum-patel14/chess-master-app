import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Play, Puzzle, BookOpen, Trophy, BarChart2, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (path) => {
    navigate(path);
    if (setMobileOpen) setMobileOpen(false);
  };

  const navItems = [
    { label: 'Home', icon: <Home size={20} />, path: '/' },
    { label: 'Play', icon: <Play size={20} />, path: '/game' },
    { label: 'Puzzles', icon: <Puzzle size={20} />, path: '/puzzles' },
    { label: 'Learn', icon: <BookOpen size={20} />, path: '/learn' },
    { label: 'Leaderboard', icon: <Trophy size={20} />, path: '/leaderboard' },
    { label: 'Stats', icon: <BarChart2 size={20} />, path: '/stats' },
    { label: 'Settings', icon: <Settings size={20} />, path: '/settings' }
  ];

  const SidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1a1a2e' }}>
      <div 
        onClick={() => handleNav('/')}
        style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid rgba(212,175,55,0.2)' }}
      >
        <span style={{ fontSize: '28px', color: '#d4af37' }}>♚</span>
        <span style={{ fontFamily: '"Cinzel", serif', fontSize: '16px', fontWeight: 700, color: '#e8e8e8' }}>
          ChessMaster Pro
        </span>
      </div>

      <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {navItems.map(item => {
          const isActive = location.pathname === item.path || (item.path === '/game' && location.pathname.startsWith('/game'));
          return (
            <button
              key={item.label}
              onClick={() => handleNav(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', width: '100%', height: '44px',
                padding: '0 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: isActive ? 'rgba(212,175,55,0.1)' : 'transparent',
                color: isActive ? '#d4af37' : '#e8e8e8',
                borderLeft: isActive ? '3px solid #d4af37' : '3px solid transparent',
                transition: 'background 200ms ease',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(212,175,55,0.08)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              {item.icon}
              <span style={{ fontSize: '15px', fontWeight: 500 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (handled by CSS .sidebar if not mobile) */}
      <aside className="sidebar desktop-only">
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen && setMobileOpen(false)}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000
              }}
              className="mobile-only"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px',
                zIndex: 1001, boxShadow: '4px 0 20px rgba(0,0,0,0.5)'
              }}
              className="mobile-only"
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <style>{`
        @media (max-width: 900px) {
          .desktop-only { display: none !important; }
        }
        @media (min-width: 901px) {
          .mobile-only { display: none !important; }
        }
      `}</style>
    </>
  );
}
