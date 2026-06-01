import { DIFFICULTY_CONFIG } from '../services/stockfishService';
import './DifficultySelector.css';

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
  const selected = Number(value) || 3;

  return (
    <div className="difficulty-selector" role="group" aria-label="Engine difficulty">
      {Object.entries(DIFFICULTY_CONFIG).map(([lvl, cfg]) => {
        const level = Number(lvl);
        const locked = !isPremium && level >= 4;
        const active = selected === level;
        const color = COLORS[level];

        const handleClick = () => {
          if (locked) {
            onUpgradeClick?.();
            return;
          }
          onChange(level);
        };

        return (
          <button
            key={lvl}
            type="button"
            className={[
              'difficulty-selector__card',
              active ? 'difficulty-selector__card--active' : '',
              locked ? 'difficulty-selector__card--locked' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              borderColor: active ? color : undefined,
              background: active ? `${color}18` : undefined,
            }}
            onClick={handleClick}
            aria-pressed={active}
            aria-label={`${cfg.label}, ${cfg.elo} Elo`}
          >
            {locked && <span className="difficulty-selector__lock">🔒</span>}
            <span className="difficulty-selector__stars" style={{ color }}>
              {STARS[level]}
            </span>
            <span className="difficulty-selector__label">{cfg.label}</span>
            <span className="difficulty-selector__elo">{cfg.elo} Elo</span>
            <span className="difficulty-selector__desc">{cfg.description}</span>
          </button>
        );
      })}
    </div>
  );
}

export default DifficultySelector;
