import { Search, Play, Puzzle, BookOpen, Swords, Tv, Users, MoreHorizontal, Globe } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Sidebar({ onToast, onOpenSignUp, onOpenLogin, mobileOpen, setMobileOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (path, isSoon) => {
    if (isSoon) {
      onToast("Coming Soon! Stay tuned.");
    } else {
      navigate(path);
      if (setMobileOpen) setMobileOpen(false);
    }
  };

  return (
    <aside className={`lp-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Top Section */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--lp-border-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '28px', color: 'var(--lp-gold)', textShadow: '0 0 10px var(--lp-gold-glow)' }}>♚</span>
        <span style={{ 
          fontFamily: '"Cinzel Decorative", serif', fontSize: '15px', letterSpacing: '0.5px',
          background: 'linear-gradient(135deg, #FFD700 0%, #D4AF37 45%, #B8860B 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>
          ChessMaster Pro
        </span>
      </div>

      {/* Search */}
      <div style={{ margin: '12px 12px 4px', position: 'relative' }}>
        <Search size={16} color="var(--lp-text-secondary)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
        <input 
          type="text" 
          placeholder="Search..."
          style={{
            width: '100%', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--lp-border)', paddingLeft: '34px', color: 'var(--lp-text-primary)',
            fontSize: '13px', outline: 'none'
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--lp-gold)'; e.target.style.boxShadow = '0 0 0 2px var(--lp-gold-glow)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--lp-border)'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Navigation Links */}
      <nav style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <SidebarLink icon={<Play size={20} color="var(--lp-gold)" />} label="Play" active={location.pathname === '/play'} onClick={() => handleNav('/play', false)} />
        <SidebarLink icon={<Puzzle size={20} color="var(--lp-purple)" />} label="Puzzles" onClick={() => handleNav('', true)} />
        <SidebarLink icon={<BookOpen size={20} color="#60A5FA" />} label="Learn" onClick={() => handleNav('', true)} />
        <SidebarLink icon={<Swords size={20} color="var(--lp-red)" />} label="Compete" onClick={() => handleNav('', true)} />
        <SidebarLink icon={<Tv size={20} color="#EC4899" />} label="Watch" onClick={() => handleNav('', true)} />
        <SidebarLink icon={<Users size={20} color="var(--lp-green)" />} label="Community" onClick={() => handleNav('', true)} />
        <SidebarLink icon={<MoreHorizontal size={20} color="var(--lp-text-secondary)" />} label="More" onClick={() => handleNav('', true)} />
      </nav>

      <div style={{ height: '1px', background: 'var(--lp-border)', margin: '8px 12px' }} />

      {/* Bottom Section */}
      <div style={{ marginTop: 'auto', padding: '16px 12px' }}>
        <button 
          onClick={onOpenSignUp}
          style={{
            width: '100%', height: '40px', borderRadius: '8px', background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
            color: '#000', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.target.style.transform = 'scale(1.02)'; e.target.style.filter = 'brightness(1.1)'; }}
          onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; e.target.style.filter = 'brightness(1)'; }}
        >
          Sign Up — Free
        </button>
        <button 
          onClick={onOpenLogin}
          style={{
            width: '100%', height: '40px', marginTop: '8px', borderRadius: '8px', background: 'transparent',
            border: '1px solid rgba(212,175,55,0.3)', color: 'var(--lp-gold)', fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.target.style.background = 'var(--lp-gold-glow)'; }}
          onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
        >
          Log In
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '16px 0', cursor: 'pointer' }}>
          <Globe size={14} color="var(--lp-text-secondary)" />
          <span style={{ fontSize: '12px', color: 'var(--lp-text-secondary)' }}>English ▾</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--lp-text-secondary)', border: '1px solid var(--lp-border)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>App Store</div>
          <div style={{ fontSize: '11px', color: 'var(--lp-text-secondary)', border: '1px solid var(--lp-border)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>Google Play</div>
        </div>

        <div style={{ fontSize: '11px', color: '#555', textAlign: 'center' }}>
          © 2026 ChessMaster Pro
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      style={{
        width: '100%', height: '44px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '12px',
        borderRadius: '8px', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
        background: active ? 'var(--lp-gold-glow)' : 'transparent',
        borderLeft: active ? '3px solid var(--lp-gold)' : '3px solid transparent',
        color: active ? 'var(--lp-gold)' : 'var(--lp-text-secondary)',
      }}
      onMouseEnter={(e) => { 
        if(!active) {
          e.currentTarget.style.background = 'var(--lp-bg-hover)'; 
          e.currentTarget.style.color = 'var(--lp-gold)';
          e.currentTarget.style.transform = 'translateX(4px)';
        }
      }}
      onMouseLeave={(e) => { 
        if(!active) {
          e.currentTarget.style.background = 'transparent'; 
          e.currentTarget.style.color = 'var(--lp-text-secondary)';
          e.currentTarget.style.transform = 'translateX(0)';
        }
      }}
    >
      {icon}
      <span style={{ fontSize: '14px', fontWeight: 500 }}>{label}</span>
    </button>
  );
}
