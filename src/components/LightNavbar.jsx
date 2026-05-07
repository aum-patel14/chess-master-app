import { useGame } from '../context/GameContext';
import { useNavigate } from 'react-router-dom';

export default function LightNavbar() {
  const { dispatch } = useGame();
  const navigate = useNavigate();

  const handleNav = (e, path) => {
    e.preventDefault();
    navigate(path);
  };

  return (
    <nav className="light-navbar">
      <div className="light-logo" onClick={(e) => handleNav(e, '/')} style={{ cursor: 'pointer' }}>
        <span className="logo-icon">♙</span> LOGO
      </div>
      <div className="light-nav-links">
        <a href="#" onClick={(e) => handleNav(e, '/')}>About</a>
        <a href="#" onClick={(e) => handleNav(e, '/')}>Services</a>
        <a href="#" onClick={(e) => handleNav(e, '/')}>Contact</a>
        <a href="#" onClick={(e) => handleNav(e, '/')}>Community</a>
      </div>
      <button className="light-signup-btn" onClick={() => handleNav({ preventDefault: () => {} }, '/settings')}>
        Settings
      </button>
    </nav>
  );
}
