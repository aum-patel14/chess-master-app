import { NavLink } from 'react-router-dom';
import { Home, Play, Puzzle, BookOpen, Settings } from 'lucide-react';

const tabs = [
  { to: '/', label: 'Home', icon: <Home size={20} /> },
  { to: '/game', label: 'Play', icon: <Play size={20} /> },
  { to: '/puzzles', label: 'Puzzles', icon: <Puzzle size={20} /> },
  { to: '/learn', label: 'Learn', icon: <BookOpen size={20} /> },
  { to: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

export default function BottomNav() {
  return (
    <nav
      className="bottom-nav"
      style={{
        display: 'none',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: '#1a1a2e',
        borderTop: '1px solid rgba(212,175,55,0.2)',
        zIndex: 100,
      }}
    >
      <style>{`
        @media (max-width: 767px) {
          .bottom-nav { display: grid !important; grid-template-columns: repeat(5, 1fr); align-items: center; }
        }
      `}</style>
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            textDecoration: 'none',
            color: isActive ? '#d4af37' : '#666',
            minHeight: '44px',
          })}
        >
          {t.icon}
          <span style={{ fontSize: '10px', fontWeight: 600 }}>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
