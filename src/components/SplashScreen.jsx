import './SplashScreen.css';

export default function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-inner">
        <div className="splash-chess-icon">♟</div>
        <h1 className="splash-title">ChessMaster Pro</h1>
        <div className="splash-loader">
          <div className="loader-track">
            <div className="loader-bar" />
          </div>
        </div>
        <p className="splash-sub">Loading the board...</p>
      </div>
    </div>
  );
}
