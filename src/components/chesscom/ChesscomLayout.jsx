import { useState, useEffect, useRef } from 'react';
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
import { supabase } from '../../services/supabase';
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
              <div className="cc-flyout-content">
                <span className="cc-flyout-label">
                  {item.label}
                  {item.soon && <span className="cc-flyout-soon">Soon</span>}
                </span>
                {item.desc && <span className="cc-flyout-desc">{item.desc}</span>}
              </div>
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
  const [dailyStreak, setDailyStreak] = useState(0);

  const hoverTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = (sectionId) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredNav(sectionId);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredNav(null);
    }, 150);
  };

  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('puzzle_ratings')
            .select('daily_streak_days')
            .eq('user_id', user.id)
            .maybeSingle();

          if (data && !error) {
            setDailyStreak(data.daily_streak_days || 0);
          }
        } else {
          const guestStreak = parseInt(localStorage.getItem('guest_daily_streak') || '0', 10);
          setDailyStreak(guestStreak);
        }
      } catch (err) {
        console.error('Error fetching layout daily streak:', err);
      }
    };

    fetchStreak();

    // Re-fetch when the window gets focus (e.g. after user solves a puzzle in another tab/view)
    const onFocus = () => fetchStreak();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

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
        onMouseEnter={() => handleMouseEnter(section.id)}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className={`cc-nav-link${isActive || isHovered ? ' active' : ''}`}
          onClick={() => handleNavItem({ path: section.path, soon: false })}
        >
          <Icon size={18} strokeWidth={2} />
          {section.id === 'puzzles' && dailyStreak > 0 ? `${section.label} 🔥 ${dailyStreak}` : section.label}
        </div>
        {section.items?.length > 0 && isHovered && (
          <FlyoutMenu
            items={section.items}
            onSelect={(item) => {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
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
                    <span>{section.id === 'puzzles' && dailyStreak > 0 ? `${section.label} 🔥 ${dailyStreak}` : section.label}</span>
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
