import { Bell, Menu } from 'lucide-react';

export function TopBar({ onOpenMobileMenu }) {
  return (
    <header className="topbar">
      <button className="mobile-menu-btn" onClick={onOpenMobileMenu} style={{ display: 'none' }}>
        <Menu size={20} color="var(--text-primary)" />
      </button>

      <div className="mobile-logo" style={{ display: 'none', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 'bold' }}>
        <span style={{ color: 'var(--gold)' }}>♚</span> ChessMaster Pro
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className="icon-btn-wrapper">
          <button className="small-icon-btn" style={{ 
            width: '34px', height: '34px', borderRadius: '6px', background: 'transparent', 
            border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Bell size={18} />
          </button>
        </div>

        <div className="icon-btn-wrapper">
          <button className="small-icon-btn" style={{ 
            width: '34px', height: '34px', borderRadius: '50%', background: 'var(--bg-card)', 
            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', cursor: 'pointer', color: 'var(--text-primary)'
          }}>
            ♟
          </button>
        </div>
      </div>
    </header>
  );
}
