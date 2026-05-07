import './HomeScreen.css';
import LightNavbar from '../components/LightNavbar';
import { useGame } from '../context/GameContext';

export default function LearnScreen() {
  const { startNewGame, dispatch } = useGame();

  const handlePlayLesson = (fen) => {
    startNewGame({ mode: 'local', fen });
    dispatch({ type: 'SET_MODE', payload: 'local' });
  };

  return (
    <div className="landing-light-root">
      <LightNavbar />
      <div className="light-page-content">
        <div className="light-page-card" style={{ maxWidth: '800px' }}>
          <h1 className="light-page-title">Learn Chess</h1>
          <p className="light-page-subtitle">Master the fundamentals and advanced strategies.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              { title: 'The Rules of Chess', desc: 'Learn how pieces move, castling, and en passant.', icon: '📖', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
              { title: 'Opening Principles', desc: 'Control the center, develop pieces, and get your king to safety.', icon: '🎯', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3' },
              { title: 'Basic Checkmates', desc: 'Master the ladder mate, King & Queen, and King & Rook endgames.', icon: '👑', fen: '8/8/8/8/8/k7/8/K6R w - - 0 1' }
            ].map((lesson, i) => (
              <div key={i} style={{ 
                display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', 
                background: '#f9f9f9', borderRadius: '16px', border: '1px solid #eee',
                cursor: 'pointer', transition: 'all 0.2s', flexWrap: 'wrap'
              }} className="lesson-card-hover">
                <div style={{ fontSize: '32px', background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #ddd' }}>
                  {lesson.icon}
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px', color: '#1a1a1a' }}>{lesson.title}</h3>
                  <p style={{ color: '#666', fontSize: '14px' }}>{lesson.desc}</p>
                </div>
                <button 
                  className="btn-get-started" 
                  onClick={() => handlePlayLesson(lesson.fen)}
                  style={{ padding: '12px 24px', fontSize: '14px' }}
                >
                  Start Demo
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .lesson-card-hover:hover { transform: translateX(4px); box-shadow: 0 4px 15px rgba(0,0,0,0.05) !important; border-color: #ddd !important; }
      `}} />
    </div>
  );
}
