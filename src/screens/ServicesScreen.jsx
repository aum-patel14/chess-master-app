import './HomeScreen.css';
import LightNavbar from '../components/LightNavbar';

export default function ServicesScreen() {
  return (
    <div className="landing-light-root">
      <LightNavbar />
      <div className="light-page-content">
        <div className="light-page-card">
          <h1 className="light-page-title">Our Features</h1>
          <p className="light-page-subtitle">Experience chess like never before with our cutting-edge features.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ padding: '24px', background: '#f9f9f9', borderRadius: '16px', border: '1px solid #eee' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>🤖 Grandmaster AI</h3>
              <p style={{ color: '#555', fontSize: '14px', lineHeight: '1.5' }}>
                Challenge our integrated Stockfish-powered engine. From absolute beginner to grandmaster difficulty, our AI analyzes the board in real-time to provide the perfect opponent.
              </p>
            </div>
            
            <div style={{ padding: '24px', background: '#f9f9f9', borderRadius: '16px', border: '1px solid #eee' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>👥 Local Multiplayer</h3>
              <p style={{ color: '#555', fontSize: '14px', lineHeight: '1.5' }}>
                Grab a friend and play on the same device. Our clean, responsive board layout is perfect for passing the device or playing side-by-side on a tablet.
              </p>
            </div>
            
            <div style={{ padding: '24px', background: '#f9f9f9', borderRadius: '16px', border: '1px solid #eee' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>🎨 Beautiful UI/UX</h3>
              <p style={{ color: '#555', fontSize: '14px', lineHeight: '1.5' }}>
                Enjoy smooth animations, gorgeous typography, and distraction-free layouts. We transition seamlessly from a stunning 3D landing page to a highly focused, dark-mode game board.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
