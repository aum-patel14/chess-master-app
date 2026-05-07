import './TimerDisplay.css';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TimerDisplay({ seconds, isActive }) {
  const isLow = seconds < 30;
  return (
    <div className={`timer ${isActive ? 'timer-active' : ''} ${isLow ? 'timer-low' : ''}`}>
      ⏱ {formatTime(seconds)}
    </div>
  );
}
