import './HomeScreen.css';
import LightNavbar from '../components/LightNavbar';
import { useGame } from '../context/GameContext';

export default function PuzzlesScreen() {
  const { startNewGame, dispatch } = useGame();

  const handlePlayPuzzle = (fen) => {
    startNewGame({ mode: 'local', fen });
    dispatch({ type: 'SET_MODE', payload: 'local' });
  };

  return (
    <div className="landing-light-root">
      <LightNavbar />
      <div className="light-page-content">
        <div className="light-page-card" style={{ maxWidth: '800px' }}>
          <h1 className="light-page-title">Chess Puzzles</h1>
          <p className="light-page-subtitle">Sharpen your tactics with daily puzzles and challenges.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            {[
              { title: 'Mate in 1', elo: '800 - 1200', color: '#10B981', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4' }, // Scholar's mate setup
              { title: 'Pin & Skewer', elo: '1200 - 1600', color: '#3B82F6', fen: 'rnbqk1nr/ppp2ppp/8/3p4/1b1P4/2N5/PPP2PPP/R1BQKBNR w KQkq - 2 5' },
              { title: 'Endgame Magic', elo: '1600 - 2000', color: '#8B5CF6', fen: '8/8/8/8/8/4k3/R7/4K3 w - - 0 1' },
              { title: 'Grandmaster Test', elo: '2000+', color: '#EF4444', fen: 'r3r1k1/pp3ppp/2pq4/3p4/3Pn3/2NQPN2/PP3PPP/R4RK1 w - - 3 15' }
            ].map((puzzle, i) => (
              <div key={i} style={{ 
                padding: '24px', background: '#f9f9f9', borderRadius: '16px', 
                border: '1px solid #eee', cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
              }} className="puzzle-card-hover">
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: `${puzzle.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '20px' }}>🧩</span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: '#1a1a1a' }}>{puzzle.title}</h3>
                <p style={{ color: puzzle.color, fontWeight: '700', fontSize: '13px' }}>Rating: {puzzle.elo}</p>
                <button 
                  className="btn-get-started" 
                  onClick={() => handlePlayPuzzle(puzzle.fen)}
                  style={{ marginTop: '16px', width: '100%', padding: '10px', fontSize: '14px' }}
                >
                  Play Demo
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .puzzle-card-hover:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0,0,0,0.05) !important; border-color: #ddd !important; }
      `}} />
    </div>
  );
}
