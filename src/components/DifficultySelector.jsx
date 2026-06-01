import { DIFFICULTY_CONFIG } from '../services/stockfishService';

const STARS = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];
const COLORS = {
  1: '#4ade80',
  2: '#86efac',
  3: '#e2b04a',
  4: '#f97316',
  5: '#ef4444',
};

export function DifficultySelector({
  value,
  onChange,
  isPremium = false,
  onUpgradeClick,
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      {Object.entries(DIFFICULTY_CONFIG).map(([lvl, cfg]) => {
        const level = Number(lvl);
        const locked = !isPremium && level >= 4;
        const active = value === level;

        return (
          <div
            key={lvl}
            role="button"
            tabIndex={0}
            onClick={() => (locked ? onUpgradeClick?.() : onChange(level))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                locked ? onUpgradeClick?.() : onChange(level);
              }
            }}
            style={{
              position: 'relative',
              width: '110px',
              padding: '14px 10px',
              borderRadius: '12px',
              cursor: locked ? 'not-allowed' : 'pointer',
              textAlign: 'center',
              border: active
                ? `2px solid ${COLORS[level]}`
                : '1px solid rgba(255,255,255,0.12)',
              background: active ? `${COLORS[level]}18` : 'rgba(255,255,255,0.04)',
              opacity: locked ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
          >
            {locked && (
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  fontSize: '12px',
                  opacity: 0.8,
                }}
              >
                🔒
              </div>
            )}
            <div
              style={{
                fontSize: '13px',
                color: COLORS[level],
                marginBottom: '4px',
                letterSpacing: '1px',
              }}
            >
              {STARS[level]}
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'white',
                marginBottom: '2px',
              }}
            >
              {cfg.label}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.4)',
                marginBottom: '4px',
              }}
            >
              {cfg.elo} Elo
            </div>
            <div
              style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.35)',
                lineHeight: 1.3,
              }}
            >
              {cfg.description}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DifficultySelector;
