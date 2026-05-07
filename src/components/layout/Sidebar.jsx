import { useState, useRef, useEffect } from 'react';
import { Search, Play, Puzzle, BookOpen, Dumbbell, Tv, Users, MoreHorizontal, ChevronDown, 
         Globe, Bot, UserCog, BarChart2, Trophy, Dice5, History, Calendar, Zap, Shield, 
         FileText, GraduationCap, Book, Lightbulb, Presentation, Target, Network, Crown, Cpu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../ToastContext';

const MENU_DATA = {
  Play: [
    { label: 'Play Online', icon: <Globe size={18} />, path: '/play?mode=local' },
    { label: 'Play Bots', icon: <Bot size={18} />, path: '/play?mode=ai' },
    { label: 'Play AI', icon: <Cpu size={18} />, path: '/play?mode=ai' },
    { label: 'Play Coach', icon: <UserCog size={18} />, path: '/learn/lessons' },
    { divider: true },
    { label: 'Stats', icon: <BarChart2 size={18} color="#0ea5e9" />, path: '/stats' },
    { label: 'Tournaments', icon: <Trophy size={18} color="var(--gold)" />, path: '/tournaments' },
    { label: 'Variants', icon: <Dice5 size={18} color="#22c55e" />, path: '/variants' },
    { label: 'Game History', icon: <History size={18} color="#facc15" />, path: '/history' }
  ],
  Puzzles: [
    { label: 'Puzzles', icon: <Puzzle size={18} color="#f97316" />, path: '/puzzles' },
    { label: 'Daily Puzzle', icon: <Calendar size={18} color="#22c55e" />, path: '/puzzles/daily' },
    { label: 'Puzzle Rush', icon: <Zap size={18} color="#f59e0b" />, path: '/puzzles/rush' },
    { label: 'Puzzle Battle', icon: <Shield size={18} color="#22c55e" />, path: '/puzzles/battle' },
    { label: 'Custom Puzzles', icon: <FileText size={18} color="#e5e7eb" />, path: '/puzzles/custom' }
  ],
  Learn: [
    { label: 'Lessons', icon: <GraduationCap size={18} color="#0ea5e9" />, path: '/learn/lessons' },
    { label: 'Play Coach', icon: <UserCog size={18} color="#e5e7eb" />, path: '/learn/lessons' },
    { label: 'Openings', icon: <BookOpen size={18} color="#d97706" />, path: '/learn/openings' }
  ],
  Train: [
    { label: 'Courses', icon: <Book size={18} color="#0ea5e9" />, path: '/train/courses' },
    { label: 'Analysis', icon: <Search size={18} color="#94a3b8" />, path: '/train/analysis' },
    { label: 'Insights', icon: <Lightbulb size={18} color="#facc15" />, path: '/train/insights' },
    { label: 'Classroom', icon: <Presentation size={18} color="#22c55e" />, path: '/train/classroom' },
    { label: 'Endgames', icon: <Dumbbell size={18} color="#e5e7eb" />, path: '/train/endgames' },
    { label: 'Practice', icon: <Target size={18} color="#ef4444" />, path: '/train/practice' },
    { label: 'Aimchess', icon: <Network size={18} color="#8b5cf6" />, path: '/train/aimchess' }
  ],
  Community: [
    { label: 'Members', icon: <Globe size={18} color="#0ea5e9" />, path: '/community/members' },
    { label: 'Coaches', icon: <Users size={18} color="#94a3b8" />, path: '/community/coaches' },
    { divider: true },
    { label: 'Top Players', icon: <Crown size={18} color="#facc15" />, path: '/community/top-players' }
  ]
};

export default function Sidebar({ onOpenSignUp, onOpenLogin, mobileOpen, setMobileOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  
  const [activeMenu, setActiveMenu] = useState(null);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const sidebarRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNav = (path, isSoon) => {
    setActiveMenu(null);
    if (isSoon && !path) {
      showToast("Coming Soon! Stay tuned.", "coming-soon");
    } else {
      navigate(path || '/');
      if (setMobileOpen) setMobileOpen(false);
    }
  };

  const handleMouseEnter = (menuName, e) => {
    if (window.innerWidth > 900) {
      setActiveMenu(menuName);
      if (e && e.currentTarget) {
        const rect = e.currentTarget.getBoundingClientRect();
        // Adjust slightly so the first item aligns with the hovered item
        setFlyoutTop(rect.top - 12);
      }
    }
  };

  const handleMenuClick = (menuName, defaultPath) => {
    if (window.innerWidth <= 900) {
      if (activeMenu === menuName) {
        setActiveMenu(null);
      } else {
        setActiveMenu(menuName);
      }
    } else if (defaultPath) {
      handleNav(defaultPath, false);
    }
  };

  const renderMobileSubMenu = (menuName) => {
    if (window.innerWidth > 900 || activeMenu !== menuName || !MENU_DATA[menuName]) return null;
    return (
      <div className="mobile-submenu">
        {MENU_DATA[menuName].map((item, idx) => (
          item.divider ? (
            <div key={idx} className="flyout-divider" style={{ margin: '4px 12px' }} />
          ) : (
            <div 
              key={idx} 
              className="flyout-item mobile-flyout-item"
              onClick={() => handleNav(item.path, !item.path)}
            >
              <span className="flyout-icon" style={{ transform: 'scale(0.85)' }}>{item.icon}</span>
              <span style={{ fontSize: '13px' }}>{item.label}</span>
            </div>
          )
        ))}
      </div>
    );
  };

  return (
    <>
      <aside 
        ref={sidebarRef}
        className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} 
        onMouseLeave={() => setActiveMenu(null)}
      >
        <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => handleNav('/', false)}>
          <span style={{ fontSize: '24px', color: 'var(--gold)' }}>♚</span>
          <span style={{ fontFamily: '"Cinzel Decorative", cursive', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            ChessMaster Pro
          </span>
        </div>

        <div style={{ margin: '8px 12px', position: 'relative' }}>
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search"
            style={{
              width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: '6px', padding: '0 10px 0 32px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none'
            }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
          />
        </div>

        <nav style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column' }}>
          <NavItem 
            icon={<Play size={18} />} label="Play" 
            active={location.pathname === '/play' || activeMenu === 'Play'} 
            onMouseEnter={(e) => handleMouseEnter('Play', e)}
            onClick={() => handleMenuClick('Play', '/play')} 
          />
          {renderMobileSubMenu('Play')}

          <NavItem 
            icon={<Puzzle size={18} />} label="Puzzles" 
            active={activeMenu === 'Puzzles'}
            onMouseEnter={(e) => handleMouseEnter('Puzzles', e)}
            onClick={() => handleMenuClick('Puzzles')}
          />
          {renderMobileSubMenu('Puzzles')}

          <NavItem 
            icon={<BookOpen size={18} />} label="Learn" 
            active={activeMenu === 'Learn'}
            onMouseEnter={(e) => handleMouseEnter('Learn', e)}
            onClick={() => handleMenuClick('Learn')}
          />
          {renderMobileSubMenu('Learn')}

          <NavItem 
            icon={<Dumbbell size={18} />} label="Train" 
            active={activeMenu === 'Train'}
            onMouseEnter={(e) => handleMouseEnter('Train', e)}
            onClick={() => handleMenuClick('Train')}
          />
          {renderMobileSubMenu('Train')}

          <NavItem 
            icon={<Tv size={18} />} label="Watch" 
            onClick={() => handleNav('/watch', false)}
            onMouseEnter={() => setActiveMenu(null)}
          />

          <NavItem 
            icon={<Users size={18} />} label="Community" 
            active={activeMenu === 'Community'}
            onMouseEnter={(e) => handleMouseEnter('Community', e)}
            onClick={() => handleMenuClick('Community')}
          />
          {renderMobileSubMenu('Community')}
          
          <div style={{ height: '1px', background: 'var(--border)', margin: '8px 12px' }} />
          
          <NavItem 
            icon={<MoreHorizontal size={18} />} label="More" 
            onClick={() => handleNav('', true)}
            onMouseEnter={() => setActiveMenu(null)}
          />
        </nav>

        <div style={{ marginTop: 'auto', padding: '12px' }}>
          <button onClick={onOpenSignUp} className="sidebar-btn-primary">Sign Up</button>
          <button onClick={onOpenLogin} className="sidebar-btn-ghost">Log In</button>

          <div style={{ marginTop: '12px', padding: '0 4px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <span>🌐</span><span>English</span><ChevronDown size={14} />
          </div>

          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', padding: '0 4px' }}>
            <div className="pill">📱 App Store</div>
            <div className="pill">🤖 Google Play</div>
          </div>

          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px', marginBottom: '8px' }}>
            © 2026 ChessMaster Pro
          </div>
        </div>

        {/* FLYOUT MENU (Desktop Only) */}
        {activeMenu && MENU_DATA[activeMenu] && window.innerWidth > 900 && (
          <div className="sidebar-flyout" style={{ top: `${flyoutTop}px` }}>
            {MENU_DATA[activeMenu].map((item, idx) => (
              item.divider ? (
                <div key={idx} className="flyout-divider" />
              ) : (
                <div 
                  key={idx} 
                  className="flyout-item"
                  onClick={() => handleNav(item.path, !item.path)}
                >
                  <span className="flyout-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              )
            ))}
          </div>
        )}
      </aside>

      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 190 }}
        />
      )}
    </>
  );
}

function NavItem({ icon, label, active, onClick, onMouseEnter }) {
  return (
    <div 
      className={`nav-item ${active ? 'active' : ''}`} 
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
    </div>
  );
}
