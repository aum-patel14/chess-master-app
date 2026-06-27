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
import { useGame } from '../../context/GameContext';
import { supabase } from '../../services/supabase';
import './ChesscomLayout.css';

const NAV_ICONS = {
  play: Gamepad2,
  puzzles: Puzzle,
  learn: GraduationCap,
  train: Dumbbell,
  watch: Binoculars,
  community: Users,
  settings: Settings,
};

function SubFlyoutMenu({ items, onSelect }) {
  return (
    <div className="cc-sub-flyout">
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

function FlyoutMenu({ items, hoveredSubSection, setHoveredSubSection, onSelect }) {
  return (
    <div className="cc-flyout cc-nav-flyout">
      <div className="cc-flyout-inner">
        {items.map((item) => {
          if (item.isSubSection) {
            const isSubHovered = hoveredSubSection === item.subSectionId;
            return (
              <div
                key={item.label}
                onMouseEnter={() => setHoveredSubSection(item.subSectionId)}
                style={{ position: 'relative' }}
              >
                <button
                  type="button"
                  className={`cc-flyout-item cc-flyout-subsection-btn${isSubHovered ? ' active' : ''}`}
                  onClick={() => onSelect(item)}
                >
                  <span className="cc-flyout-icon" aria-hidden="true">{item.icon}</span>
                  <div className="cc-flyout-content">
                    <span className="cc-flyout-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      {item.label}
                      <span className="cc-flyout-arrow" style={{ fontSize: '10px', marginLeft: '6px', opacity: 0.6 }}>»</span>
                    </span>
                    {item.desc && <span className="cc-flyout-desc">{item.desc}</span>}
                  </div>
                </button>
                {isSubHovered && item.items && (
                  <SubFlyoutMenu
                    items={item.items}
                    onSelect={onSelect}
                  />
                )}
              </div>
            );
          }

          return (
            <div
              key={item.label}
              onMouseEnter={() => setHoveredSubSection(null)}
            >
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
          );
        })}
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
  const { state } = useGame();
  const theme = state?.theme || 'classic';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const [mobileSubExpanded, setMobileSubExpanded] = useState(null);
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [hoveredSubSection, setHoveredSubSection] = useState(null);
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

  useEffect(() => {
    if (location.pathname.startsWith('/game')) {
      setIsCollapsed(true);
    }
  }, [location.pathname]);

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
      setHoveredSubSection(null);
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
      setHoveredSubSection(null);
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
          <span className={isCollapsed ? 'sr-only' : ''} style={isCollapsed ? { position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 } : {}}>
            {section.id === 'puzzles' && dailyStreak > 0 ? `${section.label} 🔥 ${dailyStreak}` : section.label}
          </span>
          {isCollapsed && dailyStreak > 0 && section.id === 'puzzles' && (
            <span className="cc-collapsed-streak" style={{ fontSize: '10px', marginLeft: '-2px' }}>🔥</span>
          )}
        </div>
        {section.items?.length > 0 && isHovered && (
          <FlyoutMenu
            items={section.items}
            hoveredSubSection={hoveredSubSection}
            setHoveredSubSection={setHoveredSubSection}
            onSelect={(item) => {
              setHoveredMenu(null);
              setHoveredSubSection(null);
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

    </div>
  );

  return (
    <div className={`cc-layout theme-${theme}`}>
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
        <div className="cc-mobile-overlay" onClick={() => { setMobileOpen(false); setMobileExpanded(null); setMobileSubExpanded(null); }}>
          <aside className="cc-mobile-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="cc-logo" onClick={() => { setMobileOpen(false); setMobileExpanded(null); setMobileSubExpanded(null); navigate('/'); }}>
              <div className="cc-logo-icon">♞</div>
              <span><em>Chess</em>Master</span>
            </div>
            <nav className="cc-nav">
              {CHESSCOM_NAV.map((section) => (
                <div key={section.id} className="cc-mobile-nav-section">
                  <div
                    className="cc-mobile-nav-parent"
                    onClick={() => {
                      setMobileExpanded(mobileExpanded === section.id ? null : section.id);
                      setMobileSubExpanded(null);
                    }}
                  >
                    <span>{section.id === 'puzzles' && dailyStreak > 0 ? `${section.label} 🔥 ${dailyStreak}` : section.label}</span>
                    <span>{mobileExpanded === section.id ? '▾' : '▸'}</span>
                  </div>
                  {mobileExpanded === section.id && section.items?.map((item) => {
                    const isSubExpanded = mobileSubExpanded === item.subSectionId;
                    return (
                      <div key={item.label} className="cc-mobile-sub-section" style={{ paddingLeft: '12px' }}>
                        <div
                          className={`cc-mobile-nav-subparent${isSubExpanded ? ' active' : ''}`}
                          onClick={() => {
                            if (item.isSubSection) {
                              setMobileSubExpanded(isSubExpanded ? null : item.subSectionId);
                            } else {
                              setMobileOpen(false);
                              handleNavItem(item);
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            color: 'var(--cc-text3)',
                            cursor: 'pointer',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '15px' }}>{item.icon}</span>
                            <span>{item.label}</span>
                          </div>
                          {item.isSubSection && (
                            <span style={{ fontSize: '10px', opacity: 0.6 }}>{isSubExpanded ? '▾' : '▸'}</span>
                          )}
                        </div>
                        {item.isSubSection && isSubExpanded && item.items?.map((subItem) => (
                          <button
                            key={subItem.label}
                            type="button"
                            className="cc-flyout-item cc-flyout-item--mobile"
                            onClick={() => { setMobileOpen(false); handleNavItem(subItem); }}
                            style={{
                              paddingLeft: '32px',
                              fontSize: '13px',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--cc-text2)',
                              width: '100%',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              paddingTop: '6px',
                              paddingBottom: '6px'
                            }}
                          >
                            <span className="cc-flyout-icon" style={{ fontSize: '14px' }}>{subItem.icon}</span>
                            <div className="cc-flyout-content">
                              <span className="cc-flyout-label" style={{ fontSize: '13px', fontWeight: '500' }}>
                                {subItem.label}
                                {subItem.soon && <span className="cc-flyout-soon" style={{ fontSize: '8px', marginLeft: '6px' }}>Soon</span>}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    );
                  })}
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
        <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
          <button 
            type="button" 
            className="cc-sidebar-toggle-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{ width: isCollapsed ? '40px' : '90%', justifyContent: 'center', padding: '8px 0', borderRadius: '8px' }}
            title={isCollapsed ? "Expand Menu" : "Collapse Menu"}
          >
            <span className="cc-toggle-arrows" style={{ marginRight: isCollapsed ? '0' : '8px' }}>{isCollapsed ? '»' : '«'}</span>
            {!isCollapsed && <span className="cc-toggle-text">Collapse Menu</span>}
          </button>
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
