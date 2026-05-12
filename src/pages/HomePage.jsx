import './HomePage.css';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';

export default function HomePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  return (
    <div className="home-page">
      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-left">
            <h1>Play Chess Online on the #1 Platform!</h1>
            <p>Join 10,000+ players. Challenge AI, play friends, and master chess — completely free.</p>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <button className="btn-hero" onClick={() => navigate('/play?mode=local')}>Get Started →</button>
              <button className="btn-hero secondary" onClick={() => navigate('/play?mode=ai')}>Play AI</button>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-board-preview">
              {/* Simple Board Visualizer */}
              <div className="preview-board">
                {Array.from({length: 64}).map((_, i) => {
                  const row = Math.floor(i / 8);
                  const col = i % 8;
                  const isDark = (row + col) % 2 === 1;
                  return (
                    <div key={i} className={`preview-square ${isDark ? 'dark' : 'light'}`}>
                      {i === 4 && '♚'}
                      {i === 60 && '♔'}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE 1 */}
      <section className="feature-section">
        <div className="feature-image">
          <img src="/images/lessons.png" alt="Chess Lessons" className="feature-img" />
        </div>
        <div className="feature-text">
          <h2>Improve Your Game with Lessons</h2>
          <p>Learn with quick, fun lessons designed for all levels.</p>
          <button className="btn-feature green" onClick={() => showToast('Coming soon', 'coming-soon')}>Start a Lesson →</button>
        </div>
      </section>

      {/* FEATURE 2 */}
      <section className="feature-section alt">
        <div className="feature-text">
          <h2>Play Chess Bots</h2>
          <p>Play against AI with unique personalities and skill levels.</p>
          <button className="btn-feature outline" onClick={() => navigate('/play')}>Challenge a Bot →</button>
        </div>
        <div className="feature-image">
          <img src="/images/bots.png" alt="Chess Bots" className="feature-img" />
        </div>
      </section>

      {/* FEATURE 3 */}
      <section className="feature-section">
        <div className="feature-image">
          <img src="/images/puzzles.png" alt="Chess Puzzles" className="feature-img" />
        </div>
        <div className="feature-text">
          <h2>Level Up with Chess Puzzles</h2>
          <p>Sharpen your skills with thousands of tactical puzzles.</p>
          <button className="btn-feature outline" onClick={() => showToast('Coming soon', 'coming-soon')}>Solve a Puzzle →</button>
        </div>
      </section>

      {/* APP DOWNLOAD */}
      <section className="app-download-section">
        <h3>Play Anywhere with the ChessMaster Pro App</h3>
        <div className="app-buttons">
          <button className="app-btn">📱 Download on App Store</button>
          <button className="app-btn">🤖 Get it on Google Play</button>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta-section">
        <h2>Learn, Play, and Have Fun!</h2>
        <button className="btn-cta" onClick={() => navigate('/play')}>Get Started →</button>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-col">
            <h4>Company</h4>
            <span>Support</span><span>About</span><span>Jobs</span><span>Blog</span>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <span>User Agreement</span><span>Privacy</span><span>Cookies</span>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <span>Chess Terms</span><span>Cheating Policy</span>
          </div>
          <div className="footer-col">
            <h4>Social</h4>
            <span>Twitter</span><span>YouTube</span><span>Instagram</span><span>Discord</span>
          </div>
          <div className="footer-col">
            <h4>App</h4>
            <span>App Store</span><span>Google Play</span>
          </div>
        </div>
        <div className="footer-bottom">
          ChessMaster Pro © 2026
        </div>
      </footer>
    </div>
  );
}
