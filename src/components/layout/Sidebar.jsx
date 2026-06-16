import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Trophy, BarChart2, Settings, BookOpen, Puzzle, ChevronLeft, ChevronRight, Menu, MoreHorizontal, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Sidebar.css';

export default function Sidebar({ isExpanded, onToggle, mobileOpen, setMobileOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (path) => {
    navigate(path);
    if (setMobileOpen) setMobileOpen(false);
  };

  const navItems = [
    { label: 'Home', icon: <Home size={20} />, path: '/' },
    { 
      label: 'Play', 
      icon: <span style={{ fontSize: '20px', fontWeight: 'bold', lineHeight: 1 }}>♞</span>, 
      path: '/play',
      subItems: [
        { label: 'Play Online Lobby', desc: 'Match with players', path: '/play' },
        { label: 'Play vs Computer', desc: 'Challenge Stockfish AI', path: '/game' },
        { label: 'Custom Game Codes', desc: 'Join or invite friends', path: '/play' }
      ]
    },
    { 
      label: 'Puzzles', 
      icon: <Puzzle size={20} />, 
      path: '/puzzles',
      subItems: [
        { label: 'Puzzles Hub', desc: 'Lifetime tactics tracker', path: '/puzzles' },
        { label: 'Rated Tactics', desc: 'Glicko-2 ratings solver', path: '/puzzles/rated' },
        { label: 'Daily Puzzle', desc: 'Streaks and calendar solves', path: '/puzzles/daily' },
        { label: 'Puzzle Streak', desc: 'Endless high score climber', path: '/puzzles/streak' }
      ]
    },
    { 
      label: 'Learn', 
      icon: <BookOpen size={20} />, 
      path: '/learn',
      subItems: [
        { label: 'Academy Hub', desc: 'Structured learning courses', path: '/learn' },
        { label: 'Generate Lesson', desc: 'AI custom lesson builder', path: '/admin/generate' }
      ]
    },
    { 
      label: 'Tournaments', 
      icon: <Swords size={20} />, 
      path: '/tournaments',
      subItems: [
        { label: 'Tournaments Hub', desc: 'Arena and Swiss list', path: '/tournaments' },
        { label: 'Create Arena', desc: 'Host community matches', path: '/tournaments/create' }
      ]
    },
    { 
      label: 'Leaderboard', 
      icon: <Trophy size={20} />, 
      path: '/leaderboard',
      subItems: [
        { label: 'Leaderboard', desc: 'Global rankings', path: '/leaderboard' },
        { label: 'Rating Stats', desc: 'Track your rating history', path: '/stats' }
      ]
    },
    { label: 'Settings', icon: <Settings size={20} />, path: '/settings' },
    { 
      label: 'Other', 
      icon: <MoreHorizontal size={20} />, 
      path: '/other',
      subItems: [
        { label: 'Themes Shop', desc: 'Custom pieces and boards', path: '/shop' },
        { label: 'Premium Tiers', desc: 'Upgrade for cloud engines', path: '/premium' },
        { label: 'Watch Live', desc: 'Spectate live demo games', path: '/watch' },
        { label: 'Game History', desc: 'View past chess archives', path: '/history' }
      ]
    }
  ];

  const SidebarContent = (
    <div className={`sidebar-inner ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* BRAND HEADER */}
      <div 
        onClick={() => handleNav('/')}
        className="sidebar-brand-container"
      >
        <span className="sidebar-brand-logo font-cinzel">♚</span>
        {isExpanded && (
          <span className="sidebar-brand-text font-cinzel">
            ChessMaster Pro
          </span>
        )}
      </div>

      {/* NAV ITEMS */}
      <nav className="sidebar-nav">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || (item.path === '/game' && location.pathname.startsWith('/game'));
          return (
            <div key={item.label} className="sidebar-btn-container">
              <button
                onClick={() => handleNav(item.path)}
                className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                {isExpanded && (
                  <span className="sidebar-nav-text">
                    {item.label}
                  </span>
                )}
              </button>
              
              {/* Flyout Sub-menu (Desktop-only via CSS) */}
              {item.subItems && (
                <div className="sidebar-flyout-menu">
                  {item.subItems.map(sub => (
                    <button
                      key={sub.label}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNav(sub.path);
                      }}
                      className="sidebar-flyout-item"
                    >
                      <span className="sidebar-flyout-item-title">{sub.label}</span>
                      <span className="sidebar-flyout-item-desc">{sub.desc}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Tooltip (only when collapsed and no subItems show) */}
              {!isExpanded && !item.subItems && (
                <div className="sidebar-tooltip">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* FOOTER TOGGLE BUTTON */}
      <div className="sidebar-footer">
        <button className="sidebar-toggle-btn" onClick={onToggle}>
          {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`sidebar desktop-only ${isExpanded ? 'expanded' : 'collapsed'}`}>
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
              className="mobile-sidebar-overlay mobile-only"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="mobile-sidebar-aside mobile-only"
            >
              <div className="sidebar-inner expanded">
                <div 
                  onClick={() => handleNav('/')}
                  className="sidebar-brand-container"
                >
                  <span className="sidebar-brand-logo font-cinzel">♚</span>
                  <span className="sidebar-brand-text font-cinzel">ChessMaster Pro</span>
                </div>
                <nav className="sidebar-nav">
                  {navItems.map(item => {
                    const isActive = location.pathname === item.path || (item.path === '/game' && location.pathname.startsWith('/game'));
                    return (
                      <button
                        key={item.label}
                        onClick={() => handleNav(item.path)}
                        className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                      >
                        <span className="sidebar-nav-icon">{item.icon}</span>
                        <span className="sidebar-nav-text">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
