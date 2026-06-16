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
  LogOut,
  Trophy,
  TrendingUp,
  User,
  Settings,
} from 'lucide-react';
import { CHESSCOM_NAV } from '../../data/chesscomNav';
import { SignUpModal, LoginModal } from '../Modals';
import ShortcutsModal from '../ShortcutsModal';
import { useAuth } from '../../context/AuthContext';
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
    <div className="cc-flyout cc-nav-flyout">
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

function HelpFlyoutMenu({ onSelectShortcuts, onNavigate, onToast }) {
  const items = [
    { icon: 'ℹ️', label: 'Help Center', desc: 'FAQs and support articles', action: () => onToast('Help center coming soon!') },
    { icon: '⌨️', label: 'Shortcuts', desc: 'Keyboard hotkeys list', action: onSelectShortcuts },
    { icon: '🐛', label: 'Report a Bug', desc: 'Submit issues to developers', action: () => onToast('Bug report coming soon!') },
    { icon: '📖', label: 'Chess Terms', desc: 'Glossary of chess definitions', action: () => onNavigate('/other') }
  ];
  return (
    <div className="cc-flyout cc-help-flyout">
      <div className="cc-flyout-inner">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            className="cc-flyout-item"
            onClick={item.action}
          >
            <span className="cc-flyout-icon" aria-hidden="true">{item.icon}</span>
            <div className="cc-flyout-content">
              <span className="cc-flyout-label">{item.label}</span>
              {item.desc && <span className="cc-flyout-desc">{item.desc}</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProfileFlyoutMenu({ userData, logout, onNavigate, onShowLogin, onShowSignUp }) {
  const isGuest = !userData || userData.isGuest;

  if (isGuest) {
    return (
      <div className="cc-flyout cc-profile-flyout">
        <div className="cc-flyout-inner">
          <button
            type="button"
            className="cc-flyout-item"
            onClick={onShowLogin}
          >
            <span className="cc-flyout-icon">🔑</span>
            <div className="cc-flyout-content">
              <span className="cc-flyout-label">Log In</span>
              <span className="cc-flyout-desc">Access your saved games</span>
            </div>
          </button>
          <button
            type="button"
            className="cc-flyout-item"
            onClick={onShowSignUp}
          >
            <span className="cc-flyout-icon">✨</span>
            <div className="cc-flyout-content">
              <span className="cc-flyout-label" style={{ color: 'var(--cc-green)' }}>Sign Up</span>
              <span className="cc-flyout-desc">Create free rating profile</span>
            </div>
          </button>
          <div className="cc-flyout-sep" />
          <button
            type="button"
            className="cc-flyout-item"
            onClick={() => onNavigate('/settings')}
          >
            <span className="cc-flyout-icon">⚙️</span>
            <div className="cc-flyout-content">
              <span className="cc-flyout-label">Settings</span>
              <span className="cc-flyout-desc">Board themes & settings</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cc-flyout cc-profile-flyout">
      <div className="cc-flyout-inner">
        <button
          type="button"
          className="cc-flyout-item"
          onClick={() => onNavigate(`/player/${userData.username}`)}
        >
          <span className="cc-flyout-icon">👤</span>
          <div className="cc-flyout-content">
            <span className="cc-flyout-label">My Profile</span>
            <span className="cc-flyout-desc">View your rating cards</span>
          </div>
        </button>
        <button
          type="button"
          className="cc-flyout-item"
          onClick={() => onNavigate('/stats')}
        >
          <span className="cc-flyout-icon">📈</span>
          <div className="cc-flyout-content">
            <span className="cc-flyout-label">Stats</span>
            <span className="cc-flyout-desc">Rating graphs & summary</span>
          </div>
        </button>
        <button
          type="button"
          className="cc-flyout-item"
          onClick={() => onNavigate('/achievements')}
        >
          <span className="cc-flyout-icon">🏅</span>
          <div className="cc-flyout-content">
            <span className="cc-flyout-label">Achievements</span>
            <span className="cc-flyout-desc">Trophies & milestones</span>
          </div>
        </button>
        <button
          type="button"
          className="cc-flyout-item"
          onClick={() => onNavigate('/settings')}
        >
          <span className="cc-flyout-icon">⚙️</span>
          <div className="cc-flyout-content">
            <span className="cc-flyout-label">Settings</span>
            <span className="cc-flyout-desc">Customize sound & board</span>
          </div>
        </button>
        <div className="cc-flyout-sep" />
        <button
          type="button"
          className="cc-flyout-item"
          onClick={logout}
        >
          <span className="cc-flyout-icon" style={{ color: '#f87171' }}>🚪</span>
          <div className="cc-flyout-content">
            <span className="cc-flyout-label" style={{ color: '#f87171' }}>Log Out</span>
            <span className="cc-flyout-desc">End your active session</span>
          </div>
        </button>
      </div>
    </div>
  );
}

function SearchFlyout({ value, onChange, onSearch, onClose }) {
  return (
    <div className="cc-flyout cc-search-flyout">
      <div className="cc-flyout-inner" style={{ padding: '12px 16px', minWidth: '220px' }}>
        <div className="cc-search-wrap" style={{ margin: 0 }}>
          <Search size={14} className="cc-search-icon" />
          <input
            type="search"
            className="cc-sidebar-search"
            placeholder="Search..."
            value={value}
            onChange={onChange}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSearch();
                onClose();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ChesscomLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSignUp, setShowSignUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [dailyStreak, setDailyStreak] = useState(0);

  const isGuest = !userData || userData.isGuest;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cc_sidebar_collapsed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('cc_sidebar_collapsed', String(isCollapsed));
    document.documentElement.style.setProperty('--cc-sidebar-width', isCollapsed ? '60px' : '170px');
  }, [isCollapsed]);

  const enterTimeoutRef = useRef(null);
  const leaveTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = (menuId) => {
    if (window.innerWidth <= 900) return; // Only flyout on desktop
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
    }
    enterTimeoutRef.current = setTimeout(() => {
      setHoveredMenu(menuId);
    }, 120); // 120ms enter debounce
  };

  const handleMouseLeave = () => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredMenu(null);
    }, 150); // 150ms leave debounce
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

    const onFocus = () => fetchStreak();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const showToast = (msg) => setToast(msg);

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Logged out successfully!');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

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
    const isHovered = hoveredMenu === section.id;

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
          title={isCollapsed ? section.label : undefined}
        >
          <Icon size={18} strokeWidth={2} />
          {!isCollapsed && (section.id === 'puzzles' && dailyStreak > 0 ? `${section.label} 🔥 ${dailyStreak}` : section.label)}
          {isCollapsed && dailyStreak > 0 && section.id === 'puzzles' && (
            <span className="cc-collapsed-streak" style={{ fontSize: '10px', marginLeft: '-2px' }}>🔥</span>
          )}
        </div>
        {section.items?.length > 0 && isHovered && (
          <FlyoutMenu
            items={section.items}
            onSelect={(item) => {
              setHoveredMenu(null);
              handleNavItem(item);
            }}
          />
        )}
      </div>
    );
  };

  const sidebarBottom = (
    <div className="cc-sidebar-bottom">
      {isCollapsed ? (
        <div className="cc-sidebar-bottom-collapsed-group">
          {/* SEARCH FLYOUT */}
          <div
            className="cc-bottom-nav-item"
            onMouseEnter={() => handleMouseEnter('search')}
            onMouseLeave={handleMouseLeave}
          >
            <button 
              type="button" 
              className={`cc-collapsed-btn${hoveredMenu === 'search' ? ' active' : ''}`}
              title="Search"
            >
              <Search size={16} />
            </button>
            {hoveredMenu === 'search' && (
              <SearchFlyout
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onSearch={() => showToast(`Searching for "${searchQuery}"...`)}
                onClose={() => setHoveredMenu(null)}
              />
            )}
          </div>

          {/* HELP FLYOUT */}
          <div
            className="cc-bottom-nav-item"
            onMouseEnter={() => handleMouseEnter('help')}
            onMouseLeave={handleMouseLeave}
          >
            <button 
              type="button" 
              className={`cc-collapsed-btn${hoveredMenu === 'help' ? ' active' : ''}`}
              title="Help & Support"
            >
              <HelpCircle size={16} />
            </button>
            {hoveredMenu === 'help' && (
              <HelpFlyoutMenu
                onSelectShortcuts={() => { setShortcutsOpen(true); setHoveredMenu(null); }}
                onNavigate={(path) => { navigate(path); setHoveredMenu(null); }}
                onToast={showToast}
              />
            )}
          </div>

          {/* PROFILE FLYOUT */}
          <div
            className="cc-bottom-nav-item"
            onMouseEnter={() => handleMouseEnter('profile')}
            onMouseLeave={handleMouseLeave}
          >
            <button 
              type="button" 
              className={`cc-collapsed-btn cc-collapsed-profile-btn${hoveredMenu === 'profile' ? ' active' : ''}`}
              title={isGuest ? 'Guest Profile' : userData?.username}
            >
              {isGuest ? (
                <span style={{ fontSize: '14px' }}>👤</span>
              ) : userData?.avatar_url ? (
                <img src={userData.avatar_url} alt="Avatar" className="cc-collapsed-avatar" />
              ) : (
                <span className="cc-avatar-initial">{userData?.username?.[0]?.toUpperCase() || 'P'}</span>
              )}
            </button>
            {hoveredMenu === 'profile' && (
              <ProfileFlyoutMenu
                userData={userData}
                logout={handleLogout}
                onNavigate={(path) => { navigate(path); setHoveredMenu(null); }}
                onShowLogin={() => { setShowLogin(true); setHoveredMenu(null); }}
                onShowSignUp={() => { setShowSignUp(true); setHoveredMenu(null); }}
              />
            )}
          </div>
        </div>
      ) : (
        <>
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

          {isGuest ? (
            <div className="cc-guest-bottom-actions">
              <button type="button" className="cc-btn-signup" onClick={() => setShowSignUp(true)}>
                Sign Up
              </button>
              <button type="button" className="cc-btn-login" onClick={() => setShowLogin(true)}>
                Log In
              </button>
            </div>
          ) : (
            /* Logged In User Profile Card */
            <div
              className="cc-bottom-nav-item cc-expanded-profile-item"
              onMouseEnter={() => handleMouseEnter('profile')}
              onMouseLeave={handleMouseLeave}
            >
              <div className={`cc-profile-card${hoveredMenu === 'profile' ? ' active' : ''}`}>
                <div className="cc-profile-card-avatar">
                  {userData?.avatar_url ? (
                    <img src={userData.avatar_url} alt="Avatar" className="cc-avatar-img" />
                  ) : (
                    <span className="cc-avatar-initial">{userData?.username?.[0]?.toUpperCase() || 'P'}</span>
                  )}
                </div>
                <div className="cc-profile-card-info">
                  <span className="cc-profile-username">{userData?.username}</span>
                  <span className="cc-profile-rating">⚡ {userData?.rating || 1200}</span>
                </div>
              </div>
              {hoveredMenu === 'profile' && (
                <ProfileFlyoutMenu
                  userData={userData}
                  logout={handleLogout}
                  onNavigate={(path) => { navigate(path); setHoveredMenu(null); }}
                  onShowLogin={() => { setShowLogin(true); setHoveredMenu(null); }}
                  onShowSignUp={() => { setShowSignUp(true); setHoveredMenu(null); }}
                />
              )}
            </div>
          )}

          {/* Expanded Help and Support link */}
          <div
            className="cc-bottom-nav-item cc-expanded-help-item"
            onMouseEnter={() => handleMouseEnter('help')}
            onMouseLeave={handleMouseLeave}
          >
            <span className={`cc-help-link${hoveredMenu === 'help' ? ' active' : ''}`}>
              <HelpCircle size={14} /> Help &amp; Support
            </span>
            {hoveredMenu === 'help' && (
              <HelpFlyoutMenu
                onSelectShortcuts={() => { setShortcutsOpen(true); setHoveredMenu(null); }}
                onNavigate={(path) => { navigate(path); setHoveredMenu(null); }}
                onToast={showToast}
              />
            )}
          </div>

          <span className="cc-help-link">
            <Globe size={14} /> English
          </span>
        </>
      )}

      {/* Sidebar Expand/Collapse Toggle Button */}
      <div className="cc-sidebar-toggle-row">
        <button 
          type="button" 
          className="cc-sidebar-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <span className="cc-toggle-arrows">{isCollapsed ? '»' : '«'}</span>
          {!isCollapsed && <span className="cc-toggle-text">Collapse Menu</span>}
        </button>
      </div>
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
        {isGuest ? (
          <button type="button" className="cc-mobile-login" onClick={() => setShowLogin(true)}>
            Log In
          </button>
        ) : (
          <span className="cc-mobile-user" onClick={() => navigate(`/player/${userData.username}`)} style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            {userData.username}
          </span>
        )}
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

      <aside className={`cc-sidebar${isCollapsed ? ' cc-sidebar--collapsed' : ''}`}>
        <div className="cc-logo" onClick={() => navigate('/')}>
          <div className="cc-logo-icon">♞</div>
          {!isCollapsed && <span><em>Chess</em>Master</span>}
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
      <ShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        isMobile={isMobile}
      />
    </div>
  );
}
