import './HomeScreen.css';
import { useGame } from '../context/GameContext';
import LightNavbar from '../components/LightNavbar';

export default function SettingsScreen() {
  const { state, dispatch, boardThemes } = useGame();

  const toggle = (type) => dispatch({ type });

  return (
    <div className="landing-light-root">
      <LightNavbar />
      
      <div className="light-page-content">
        <div className="light-page-card" style={{ maxWidth: '700px' }}>
          <h1 className="light-page-title">Settings</h1>
          <p className="light-page-subtitle">Customize your chess experience.</p>
          
          <div className="light-page-form">
            
            {/* Board Themes */}
            <div className="config-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: '#1a1a1a' }}>♟ Board Theme</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px', width: '100%' }}>
                {Object.entries(boardThemes).map(([id, theme]) => (
                  <button
                    key={id}
                    onClick={() => dispatch({ type: 'SET_THEME', payload: id })}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                      padding: '12px', background: state.theme === id ? '#f0f0f0' : 'transparent',
                      border: state.theme === id ? '2px solid #1a1a1a' : '1px solid #ddd',
                      borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ width: '40px', height: '40px', display: 'flex', flexWrap: 'wrap', borderRadius: '4px', overflow: 'hidden', border: '1px solid #ccc' }}>
                      <div style={{ width: '50%', height: '50%', background: theme.light }}></div>
                      <div style={{ width: '50%', height: '50%', background: theme.dark }}></div>
                      <div style={{ width: '50%', height: '50%', background: theme.dark }}></div>
                      <div style={{ width: '50%', height: '50%', background: theme.light }}></div>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: state.theme === id ? '#1a1a1a' : '#666' }}>{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preferences */}
            <div className="config-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: '#1a1a1a' }}>⚙️ Preferences</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                {[
                  { label: '🔊 Sound Effects', desc: 'Move, capture, and win sounds', stateVal: state.soundEnabled, type: 'TOGGLE_SOUND' },
                  { label: '✨ Animations', desc: 'Piece entrance animations', stateVal: state.animationsEnabled, type: 'TOGGLE_ANIMATIONS' },
                  { label: '🔡 Coordinates', desc: 'Show rank and file labels', stateVal: state.showCoords, type: 'TOGGLE_COORDS' }
                ].map((pref, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: '#1a1a1a', fontSize: '14px' }}>{pref.label}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>{pref.desc}</div>
                    </div>
                    <button 
                      onClick={() => toggle(pref.type)}
                      style={{
                        width: '44px', height: '24px', borderRadius: '12px',
                        background: pref.stateVal ? '#b71c1c' : '#ddd',
                        border: 'none', cursor: 'pointer', position: 'relative', transition: 'all 0.2s'
                      }}
                    >
                      <div style={{
                        width: '20px', height: '20px', background: '#fff', borderRadius: '50%',
                        position: 'absolute', top: '2px', left: pref.stateVal ? '22px' : '2px',
                        transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Difficulty */}
            <div className="config-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: '#1a1a1a' }}>🤖 Default AI Difficulty</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#888' }}>Beginner</span>
                <input
                  type="range" min={1} max={5}
                  value={state.aiDifficulty}
                  onChange={e => dispatch({ type: 'SET_DIFFICULTY', payload: parseInt(e.target.value) })}
                  style={{ flex: 1, accentColor: '#b71c1c' }}
                />
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#888' }}>Expert</span>
              </div>
              <div style={{ textAlign: 'center', width: '100%', fontSize: '14px', fontWeight: '700', color: '#1a1a1a', marginTop: '12px' }}>
                Level {state.aiDifficulty} — {['', 'Beginner 🌱', 'Easy 😊', 'Medium 🧠', 'Hard 🔥', 'Expert 💀'][state.aiDifficulty]}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
