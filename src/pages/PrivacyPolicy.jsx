import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './PrivacyPolicy.css';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="privacy-page">
      <div className="privacy-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <Shield size={48} className="privacy-icon" />
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last updated: May 2026</p>
      </div>

      <div className="privacy-content">
        <section className="privacy-section">
          <h2>1. Introduction</h2>
          <p>
            Welcome to <strong>ChessMaster Pro</strong>. We respect your privacy and are committed to protecting it. 
            This Privacy Policy explains our practices regarding the collection, use, and disclosure of information when you use our application.
          </p>
        </section>

        <section className="privacy-section">
          <h2>2. What Data We Collect</h2>
          <p>
            <strong>None.</strong> We do not collect, store, or transmit any personal user data. 
            When playing as a guest or offline, all gameplay data, settings, and statistics remain entirely on your local device. 
            When you choose to authenticate using Google or other providers, Firebase Authentication handles your credentials securely, 
            and we only store your Elo rating and match outcomes in our secure Cloud Database to sync your progress.
          </p>
        </section>

        <section className="privacy-section">
          <h2>3. Third-Party Services</h2>
          <p>
            ChessMaster Pro utilizes the <strong>Stockfish</strong> chess engine to power our AI opponents. 
            The Stockfish engine runs entirely offline within your browser (via WebAssembly) and does not transmit any of your gameplay data to external servers.
          </p>
        </section>

        <section className="privacy-section">
          <h2>4. Children's Privacy</h2>
          <p>
            ChessMaster Pro is a family-friendly application suitable for all ages. Because we do not actively collect personal data, 
            we inadvertently comply with all major children's privacy regulations.
          </p>
        </section>

        <section className="privacy-section">
          <h2>5. Changes to This Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. 
            You are advised to review this Privacy Policy periodically for any changes.
          </p>
        </section>

        <section className="privacy-section">
          <h2>6. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at: 
            <br/>
            <a href="mailto:contact@chessmasterpro.app" className="contact-link">contact@chessmasterpro.app</a>
          </p>
        </section>
      </div>
    </div>
  );
}
