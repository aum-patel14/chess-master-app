import './MoveIndicator.css';

export default function MoveIndicator({ hasCapture }) {
  return (
    <div className={`move-indicator ${hasCapture ? 'capture' : 'empty'}`} />
  );
}
