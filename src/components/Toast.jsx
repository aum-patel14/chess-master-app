import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function Toast({ message, show, onClose }) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(() => onClose(), 3000);
      return () => clearTimeout(t);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
      background: 'var(--lp-bg-card)', border: '1px solid var(--lp-border-gold)',
      borderRadius: '12px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      animation: 'fadeInUp 0.3s ease-out'
    }}>
      <Clock size={20} color="var(--lp-gold)" />
      <span style={{ color: 'var(--lp-text-primary)', fontSize: '14px', fontWeight: 500 }}>
        {message}
      </span>
    </div>
  );
}
