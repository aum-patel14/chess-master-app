import './chesscom.css';

const LEVELS = [
  { level: 1, diff: 'beginner', label: 'Beginner', elo: 400 },
  { level: 2, diff: 'easy', label: 'Easy', elo: 800 },
  { level: 3, diff: 'medium', label: 'Medium', elo: 1200 },
  { level: 4, diff: 'hard', label: 'Hard', elo: 1800 },
  { level: 5, diff: 'master', label: 'Master', elo: '2500+' },
];

export default function EngineDifficultyBar({ value, onChange, disabled = false }) {
  const selected = Number(value) || 3;

  return (
    <div className="cc-engine-bar" role="group" aria-label="Engine difficulty">
      {LEVELS.map((lvl) => (
        <button
          key={lvl.level}
          type="button"
          data-diff={lvl.diff}
          className={`cc-engine-btn${selected === lvl.level ? ' active' : ''}`}
          disabled={disabled}
          onClick={() => onChange(lvl.level)}
          title={`${lvl.label} (~${lvl.elo} Elo)`}
        >
          <span className="cc-engine-label">{lvl.label}</span>
          <span className="cc-engine-elo">{lvl.elo}</span>
        </button>
      ))}
    </div>
  );
}
