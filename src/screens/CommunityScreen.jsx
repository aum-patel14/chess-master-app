import './HomeScreen.css';
import LightNavbar from '../components/LightNavbar';

export default function CommunityScreen() {
  return (
    <div className="landing-light-root">
      <LightNavbar />
      <div className="light-page-content">
        <div className="light-page-card">
          <h1 className="light-page-title">Community Leaderboard</h1>
          <p className="light-page-subtitle">See how you rank against the global chess community.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { rank: 1, name: 'Grandmaster_X', elo: 2850 },
              { rank: 2, name: 'ChessWizard', elo: 2790 },
              { rank: 3, name: 'TacticalGenius', elo: 2645 },
              { rank: 4, name: 'PawnPusher', elo: 2500 },
              { rank: 5, name: 'KnightRider', elo: 2410 },
            ].map(player => (
              <div key={player.rank} style={{ 
                display: 'flex', justifyContent: 'space-between', padding: '16px 24px', 
                background: player.rank === 1 ? 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)' : '#f9f9f9',
                borderRadius: '12px', border: player.rank === 1 ? '2px solid #e0e0e0' : '1px solid #eee',
                fontWeight: player.rank <= 3 ? '800' : '600'
              }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <span style={{ color: '#999', width: '24px' }}>#{player.rank}</span>
                  <span style={{ color: '#1a1a1a' }}>{player.name}</span>
                </div>
                <span style={{ color: '#b71c1c' }}>{player.elo}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
