import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Gamepad2,
  Puzzle,
  GraduationCap,
  Dumbbell,
  Binoculars,
  Users,
  MoreHorizontal,
  Menu,
  Search,
  HelpCircle,
  Globe,
} from 'lucide-react';
import { CHESSCOM_NAV } from '../../data/chesscomNav';
import { SignUpModal, LoginModal } from '../Modals';
import './ChesscomLayout.css';

const NAV_ICONS = {
  play: Gamepad2,
  puzzles: Puzzle,
  learn: GraduationCap,
  train: Dumbbell,
  watch: Binoculars,
  community: Users,
  other: MoreHorizontal,
};

function FlyoutMenu({ items, onSelect }) {
  return (
    <div className="cc-flyout">
      <div className="cc-flyout-inner">
        {items.map((item) => (
          <div key={item.label}>
            <button
              type="button"
              className="cc-flyout-item"
              onClick={() => onSelect(item)}
            >
              <span className="cc-flyout-icon" aria-hidden="true">{item.icon}</span>
              <span className="cc-flyout-label">
                {item.label}
                {item.soon && <span className="cc-flyout-soon">Soon</span>}
              </span>
            </button>
            {item.separatorAfter && <div className="cc-flyout-sep" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChesscomLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const [hoveredNav, setHoveredNav] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSignUp, setShowSignUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => setToast(msg);

  const handleNavItem = (item) => {
    if (item.soon) {
      showToast('Coming soon!');
      return;
    }
    if (item.state) {
      navigate(item.path, { state: item.state });
    } else {
      navigate(item.path);
    }
  };

  const renderNavLink = (section) => {
    const Icon = NAV_ICONS[section.id] || Gamepad2;
    const isActive = location.pathname === section.path;
    const isHovered = hoveredNav === section.id;

    return (
      <div
        key={section.id}
        className={`cc-nav-item${isHovered ? ' cc-nav-item--open' : ''}`}
        onMouseEnter={() => setHoveredNav(section.id)}
        onMouseLeave={() => setHoveredNav(null)}
      >
        <div
          className={`cc-nav-link${isActive || isHovered ? ' active' : ''}`}
          onClick={() => handleNavItem({ path: section.path, soon: false })}
        >
          <Icon size={18} strokeWidth={2} />
          {section.label}
        </div>
        {section.items?.length > 0 && isHovered && (
          <FlyoutMenu
            items={section.items}
            onSelect={(item) => {
              setHoveredNav(null);
              handleNavItem(item);
            }}
          />
        )}
      </div>
    );
  };

  const sidebarBottom = (
    <div className="cc-sidebar-bottom">
      <div className="cc-search-wrap">
        <Search size={14} className="cc-search-icon" />
        <input
          type="search"
          className="cc-sidebar-search"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchQuery.trim()) {
              showToast(`Searching for "${searchQuery}"...`);
            }
          }}
        />
      </div>
      <button type="button" className="cc-btn-signup" onClick={() => setShowSignUp(true)}>
        Sign Up
      </button>
      <button type="button" className="cc-btn-login" onClick={() => setShowLogin(true)}>
        Log In
      </button>
      <span className="cc-help-link" onClick={() => showToast('Help center coming soon!')}>
        <HelpCircle size={14} /> Help &amp; Support
      </span>
      <span className="cc-help-link">
        <Globe size={14} /> English
      </span>
    </div>
  );

  return (
    <div className="cc-layout">
      <div className="cc-mobile-header">
        <button type="button" className="cc-mobile-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Menu">
          <Menu size={22} />
        </button>
        <span className="cc-mobile-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          ChessMaster
        </span>
        <button type="button" className="cc-mobile-login" onClick={() => setShowLogin(true)}>
          Log In
        </button>
      </div>

      {mobileOpen && (
        <div className="cc-mobile-overlay" onClick={() => setMobileOpen(false)}>
          <aside className="cc-mobile-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="cc-logo" onClick={() => { setMobileOpen(false); navigate('/'); }}>
              <div className="cc-logo-icon">♞</div>
              <span><em>Chess</em>Master</span>
            </div>
            <nav className="cc-nav">
              {CHESSCOM_NAV.map((section) => (
                <div key={section.id} className="cc-mobile-nav-section">
                  <div
                    className="cc-mobile-nav-parent"
                    onClick={() => setMobileExpanded(mobileExpanded === section.id ? null : section.id)}
                  >
                    <span>{section.label}</span>
                    <span>{mobileExpanded === section.id ? '▾' : '▸'}</span>
                  </div>
                  {mobileExpanded === section.id && section.items?.map((item) => (
                    <div key={item.label}>
                      <button
                        type="button"
                        className="cc-flyout-item cc-flyout-item--mobile"
                        onClick={() => { setMobileOpen(false); handleNavItem(item); }}
                      >
                        <span className="cc-flyout-icon">{item.icon}</span>
                        <span className="cc-flyout-label">{item.label}</span>
                      </button>
                      {item.separatorAfter && <div className="cc-flyout-sep" />}
                    </div>
                  ))}
                </div>
              ))}
            </nav>
            {sidebarBottom}
          </aside>
        </div>
      )}

      <aside className="cc-sidebar">
        <div className="cc-logo" onClick={() => navigate('/')}>
          <div className="cc-logo-icon">♞</div>
          <span>ChessMaster</span>
        </div>
        <nav className="cc-nav">
          {CHESSCOM_NAV.map((section) => renderNavLink(section))}
        </nav>
        {sidebarBottom}
      </aside>

      <main className="cc-main">{children}</main>

      {toast && (
        <div className="cc-toast" onClick={() => setToast('')}>
          {toast}
        </div>
      )}

      <SignUpModal
        show={showSignUp}
        onClose={() => setShowSignUp(false)}
        onSwitchToLogin={() => { setShowSignUp(false); setShowLogin(true); }}
      />
      <LoginModal
        show={showLogin}
        onClose={() => setShowLogin(false)}
        onSwitchToSignUp={() => { setShowLogin(false); setShowSignUp(true); }}
      />
    </div>
  );
}
