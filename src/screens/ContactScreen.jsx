import './HomeScreen.css';
import LightNavbar from '../components/LightNavbar';

export default function ContactScreen() {
  return (
    <div className="landing-light-root">
      <LightNavbar />
      <div className="light-page-content">
        <div className="light-page-card">
          <h1 className="light-page-title">Contact Us</h1>
          <p className="light-page-subtitle">We would love to hear your feedback, feature requests, or bug reports.</p>
          
          <form className="light-page-form" onSubmit={(e) => e.preventDefault()}>
            <input type="text" className="light-input" placeholder="Your Name" />
            <input type="email" className="light-input" placeholder="Your Email" />
            <textarea className="light-input" placeholder="Your Message" rows="5" style={{ resize: 'vertical' }}></textarea>
            <button className="btn-get-started" style={{ alignSelf: 'flex-start', marginTop: '8px' }}>
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
