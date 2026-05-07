import { Bell, Menu } from 'lucide-react';

export function TopBar({ onOpenMobileMenu }) {
  return (
    <header className="topbar">
      <button className="mobile-menu-btn" onClick={onOpenMobileMenu} style={{ display: 'none' }}>
        <Menu size={20} color="var(--text-primary)" />
      </button>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button style={{ 
          width: '34px', height: '34px', borderRadius: '6px', background: 'transparent', 
          border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Bell size={18} />
        </button>

        <div style={{ 
          width: '34px', height: '34px', borderRadius: '50%', background: 'var(--bg-card)', 
          border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', cursor: 'pointer'
        }}>
          ♟
        </div>
      </div>
    </header>
  );
}
