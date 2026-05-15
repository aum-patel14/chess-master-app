import React, { useState } from 'react';
import './Onboarding.css';

const SLIDES = [
  {
    icon: '♚',
    title: 'Welcome to ChessMaster Pro',
    desc: 'The most beautiful chess game on mobile',
  },
  {
    icon: '🤖',
    title: 'Challenge Powerful AI',
    desc: '5 difficulty levels from beginner to grandmaster',
    preview: (
      <div className="onboarding-preview">
        <div className="diff-pill">Beginner</div>
        <div className="diff-pill">Easy</div>
        <div className="diff-pill active">Medium</div>
        <div className="diff-pill">Hard</div>
        <div className="diff-pill">Expert</div>
      </div>
    )
  },
  {
    icon: '🎨',
    title: 'Make It Yours',
    desc: '6 stunning board themes to choose from',
    preview: (
      <div className="onboarding-preview themes">
        <div className="theme-circle" style={{ background: '#c4a028' }}></div>
        <div className="theme-circle" style={{ background: '#c47a28' }}></div>
        <div className="theme-circle" style={{ background: '#4488ff' }}></div>
        <div className="theme-circle" style={{ background: '#888888' }}></div>
        <div className="theme-circle" style={{ background: '#2d9e6a' }}></div>
        <div className="theme-circle" style={{ background: '#8866ff' }}></div>
      </div>
    )
  }
];

export default function Onboarding({ onFinish }) {
  const [slide, setSlide] = useState(0);

  const handleNext = () => {
    if (slide < SLIDES.length - 1) {
      setSlide(slide + 1);
    } else {
      finish();
    }
  };

  const finish = () => {
    localStorage.setItem('onboarded', 'true');
    localStorage.setItem('chess_onboarded', 'true');
    onFinish();
  };

  const currentSlide = SLIDES[slide];

  return (
    <div className="onboarding-root">
      <div className="onboarding-content">
        <div className="onboarding-icon slide-in-bottom" key={slide + 'icon'}>
          {currentSlide.icon}
        </div>
        
        <h1 className="onboarding-title slide-in-bottom delay-1" key={slide + 'title'}>
          {currentSlide.title}
        </h1>
        
        <p className="onboarding-desc slide-in-bottom delay-2" key={slide + 'desc'}>
          {currentSlide.desc}
        </p>

        {currentSlide.preview && (
          <div className="slide-in-bottom delay-3" key={slide + 'prev'}>
            {currentSlide.preview}
          </div>
        )}
      </div>

      <div className="onboarding-footer">
        <div className="onboarding-dots">
          {SLIDES.map((_, i) => (
            <div key={i} className={`onboarding-dot ${i === slide ? 'active' : ''}`} />
          ))}
        </div>

        <div className="onboarding-actions">
          <button className="onboarding-skip" onClick={finish}>Skip</button>
          <button className="onboarding-next" onClick={handleNext}>
            {slide === SLIDES.length - 1 ? "Let's Play" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
