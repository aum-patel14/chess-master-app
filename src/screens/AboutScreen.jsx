import './HomeScreen.css';
import LightNavbar from '../components/LightNavbar';

export default function AboutScreen() {
  return (
    <div className="landing-light-root">
      <LightNavbar />
      <div className="light-page-content">
        <div className="light-page-card">
          <h1 className="light-page-title">About CHESS Game</h1>
          <p className="light-page-subtitle">
            Welcome to the most elegant and clean way to play chess. We believe that strategy games deserve a premium aesthetic. 
            Whether you are a grandmaster or just learning the basics, our platform provides a beautiful environment to sharpen your mind.
          </p>
          <p className="light-page-subtitle" style={{marginBottom: 0}}>
            Our mission is to bring the classic game of kings into the modern era with sleek 3D graphics, robust AI opponents, and an unmatched user experience.
          </p>
        </div>
      </div>
    </div>
  );
}
