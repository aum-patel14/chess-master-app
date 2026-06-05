import { useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';

interface NavbarProps {
  onOpenDrawer: () => void;
  onOpenSignUp: () => void;
  onOpenLogin: () => void;
}

export default function Navbar({ onOpenDrawer, onOpenSignUp, onOpenLogin }: NavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { label: 'Play', path: '/game' },
    { label: 'Puzzles', path: '/puzzles' },
    { label: 'Learn', path: '/learn' },
    { label: 'Train', path: '/train' },
    { label: 'Watch', path: '/watch' },
    { label: 'Community', path: '/community' },
  ];

  const handleNav = (path: string) => {
    navigate(path);
  };

  return (
    <header
      style={{
        height: '56px',
        background: '#1a1a1a',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid #333333',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* CSS Styles for responsive visibility & button states */}
      <style>{`
        .nav-mobile-menu-btn {
          display: flex;
          background: transparent;
          border: none;
          color: #ffffff;
          cursor: pointer;
          padding: 6px;
        }
        .nav-desktop-links {
          display: none;
          align-items: center;
          gap: 20px;
          height: 100%;
        }
        .nav-desktop-link-item {
          color: #aaaaaa;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          height: 100%;
          display: flex;
          align-items: center;
          position: relative;
          padding: 0 4px;
          transition: color 0.2s;
        }
        .nav-desktop-link-item:hover {
          color: #ffffff;
        }
        .nav-desktop-link-item.active {
          color: #ffffff;
        }
        .nav-desktop-link-item.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 3px;
          background: #6bbd44;
          border-radius: 2px 2px 0 0;
        }
        
        .navbar-auth-btn-green {
          background: #6bbd44;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          width: 80px;
          height: 32px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .navbar-auth-btn-green:hover {
          background: #78d24c;
        }
        
        .navbar-auth-btn-grey {
          background: #3a3a3a;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          width: 80px;
          height: 32px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .navbar-auth-btn-grey:hover {
          background: #464646;
        }

        @media (min-width: 768px) {
          .nav-mobile-menu-btn {
            display: none !important;
          }
          .nav-desktop-links {
            display: flex !important;
          }
        }
      `}</style>

      {/* LEFT: Mobile Hamburger, Desktop Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', height: '100%' }}>
        <button
          className="nav-mobile-menu-btn"
          onClick={onOpenDrawer}
          aria-label="Open navigation menu"
        >
          <Menu size={24} />
        </button>

        {/* LOGO */}
        <div
          onClick={() => handleNav('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '18px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <span style={{ color: '#d4af37', fontSize: '20px' }}>♟</span>
          <span className="font-cinzel">ChessMaster Pro</span>
        </div>
      </div>

      {/* CENTER: Desktop Nav Links */}
      <nav className="nav-desktop-links">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path || (link.path === '/game' && location.pathname.startsWith('/game'));
          return (
            <div
              key={link.label}
              onClick={() => handleNav(link.path)}
              className={`nav-desktop-link-item ${isActive ? 'active' : ''}`}
            >
              {link.label}
            </div>
          );
        })}
      </nav>

      {/* RIGHT: Login / Signup buttons */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          className="navbar-auth-btn-grey"
          onClick={onOpenLogin}
        >
          Log In
        </button>
        <button
          className="navbar-auth-btn-green"
          onClick={onOpenSignUp}
        >
          Sign Up
        </button>
      </div>
    </header>
  );
}
