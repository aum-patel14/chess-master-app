import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Search, HelpCircle, Globe } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSignUp: () => void;
  onOpenLogin: () => void;
}

export default function Drawer({ isOpen, onClose, onOpenSignUp, onOpenLogin }: DrawerProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Menu items list matching Chess.com Mobile Nav exactly
  const menuItems = [
    { label: 'Play', path: '/game', icon: '♟' },
    { label: 'Puzzles', path: '/puzzles', icon: '🧩' },
    { label: 'Learn', path: '/learn', icon: '🎓' },
    { label: 'Train', path: '/train', icon: '💪' },
    { label: 'Watch', path: '/watch', icon: '👁' },
    { label: 'Community', path: '/community', icon: '👥' },
    { label: 'Other', path: '/other', icon: '···' },
  ];

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleLinkClick = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleAction = (callback: () => void) => {
    callback();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {styleTag}

      {/* Overlay backdrop */}
      <div
        className="drawer-overlay-backdrop"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(2px)',
          animation: 'fade-in-backdrop 0.22s ease-out forwards',
        }}
      />

      {/* Drawer slide-in panel */}
      <div
        className="drawer-slide-panel"
        style={{
          position: 'relative',
          width: '280px',
          height: '100%',
          background: '#1a1a1a',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 0 20px rgba(0,0,0,0.5)',
          overflowY: 'auto',
          animation: 'slide-in-drawer 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Drawer header / close button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderBottom: '1px solid #333333',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', fontWeight: 800, fontSize: '16px' }}>
            <span style={{ color: '#d4af37' }}>♟</span> Menu
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#aaaaaa',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu Items List */}
        <nav style={{ display: 'flex', flexDirection: 'column', padding: '8px 0' }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/game' && location.pathname.startsWith('/game'));
            return (
              <div
                key={item.label}
                onClick={() => handleLinkClick(item.path)}
                className={`drawer-menu-item ${isActive ? 'active' : ''}`}
                style={{
                  height: '56px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  cursor: 'pointer',
                  borderLeft: isActive ? '3px solid #6bbd44' : '3px solid transparent',
                  background: isActive ? '#262626' : 'transparent',
                  color: isActive ? '#ffffff' : '#aaaaaa',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {/* Icon Column (28px left margin / spacing style) */}
                <span
                  style={{
                    width: '28px',
                    fontSize: item.icon === '···' ? '20px' : '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px',
                  }}
                >
                  {item.icon}
                </span>
                <span style={{ fontSize: '18px', fontWeight: 500 }}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </nav>

        {/* Divider */}
        <div style={{ height: '1px', background: '#333333', margin: '8px 16px' }} />

        {/* Bottom Section (Search, Buttons, Support, Lang) */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: 'auto' }}>
          {/* Search Input bar */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#888888',
              }}
            />
            <input
              type="text"
              placeholder="Search"
              style={{
                width: '100%',
                height: '36px',
                background: '#2a2a2a',
                border: '1px solid #3d3d3d',
                borderRadius: '6px',
                paddingLeft: '34px',
                paddingRight: '12px',
                fontSize: '14px',
                color: '#ffffff',
                outline: 'none',
              }}
            />
          </div>

          {/* Auth shortcuts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => handleAction(onOpenSignUp)}
              style={{
                width: '100%',
                height: '48px',
                background: '#6bbd44',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              Sign Up
            </button>
            <button
              onClick={() => handleAction(onOpenLogin)}
              style={{
                width: '100%',
                height: '48px',
                background: '#3a3a3a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              Log In
            </button>
          </div>

          {/* Help & Language */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#aaaaaa', marginTop: '8px' }}>
            <div
              onClick={() => handleLinkClick('/settings')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 0' }}
            >
              <HelpCircle size={18} />
              <span>Help & Support</span>
            </div>
            <div
              onClick={() => handleAction(() => alert('Language switcher coming soon!'))}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 0' }}
            >
              <Globe size={18} />
              <span>English (US)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Injected keyframes and class selectors for animation/hovers
const styleTag = (
  <style>{`
    @keyframes fade-in-backdrop {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slide-in-drawer {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }
    .drawer-menu-item:hover {
      background: #2a2a2a !important;
      color: #ffffff !important;
    }
  `}</style>
);
