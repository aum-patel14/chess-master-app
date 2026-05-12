import React, { useEffect, useState } from 'react';
import './AchievementToast.css';
import { ACHIEVEMENTS } from '../utils/achievements';

export default function AchievementToast({ unlockedIds }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (unlockedIds && unlockedIds.length > 0) {
      const newToasts = unlockedIds.map(id => {
        const ach = ACHIEVEMENTS.find(a => a.id === id);
        return { id: Date.now() + Math.random(), ach };
      });
      
      setToasts(prev => [...prev, ...newToasts]);
    }
  }, [unlockedIds]);

  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts(prev => prev.slice(1));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="achievement-toast-container">
      {toasts.map(toast => toast.ach && (
        <div key={toast.id} className="achievement-toast slide-up">
          <div className="achievement-icon">{toast.ach.icon}</div>
          <div className="achievement-content">
            <span className="achievement-title">Achievement Unlocked!</span>
            <span className="achievement-desc">{toast.ach.title}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
