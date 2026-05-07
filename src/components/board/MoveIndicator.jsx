import './MoveIndicator.css';

export default function MoveIndicator({ hasCapture, themeAccent }) {
  if (hasCapture) {
    return (
      <div className="move-capture-ring" style={{ '--accent': themeAccent }}>
        <div className="capture-ring-inner" />
      </div>
    );
  }

  return (
    <div className="move-dot" style={{ '--accent': themeAccent }} />
  );
}
