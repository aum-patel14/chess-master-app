import React, { useState, useEffect } from 'react';

const DotAnimation = () => {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const i = setInterval(
      () => setDots((d) => (d.length >= 3 ? '' : d + '.')),
      400
    );
    return () => clearInterval(i);
  }, []);
  return <span>{dots}</span>;
};

const ThinkingDots = () => (
  <span style={{ color: '#e2b04a' }}>
    thinking
    <span style={{ display: 'inline-block', width: '24px', textAlign: 'left' }}>
      <DotAnimation />
    </span>
  </span>
);

export function AiStatusBar({ isThinking, isSimpleMode, difficulty, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: '#374151',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          flexShrink: 0,
        }}
      >
        ♟
      </div>
      <div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'white',
            lineHeight: 1,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.4)',
            marginTop: '2px',
            height: '14px',
          }}
        >
          {isThinking ? (
            <ThinkingDots />
          ) : isSimpleMode ? (
            <span style={{ color: '#f97316' }}>Simple mode</span>
          ) : (
            <span>Level {difficulty}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default AiStatusBar;
