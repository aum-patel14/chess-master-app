import { useState, useRef, useCallback, useEffect } from 'react';

export const useChessClock = (base, increment) => {
  const [whiteTime, setWhiteTime] = useState(base);
  const [blackTime, setBlackTime] = useState(base);
  const [activeColor, setActiveColor] = useState(null);
  const intervalRef = useRef(null);
  const lastTickRef = useRef(Date.now());

  // Reset clock when base or increment changes (e.g. new game setup)
  useEffect(() => {
    setWhiteTime(base);
    setBlackTime(base);
    setActiveColor(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [base, increment]);

  const start = useCallback((color) => {
    setActiveColor(color);
    lastTickRef.current = Date.now();
  }, []);

  const switchClock = useCallback((movedColor) => {
    const addTo = movedColor === 'w' ? setWhiteTime : setBlackTime;
    addTo(t => t + increment);
    const next = movedColor === 'w' ? 'b' : 'w';
    setActiveColor(next);
    lastTickRef.current = Date.now();
  }, [increment]);

  const stop = useCallback(() => {
    setActiveColor(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (!activeColor) return;
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      if (activeColor === 'w') setWhiteTime(t => Math.max(0, t - elapsed));
      else setBlackTime(t => Math.max(0, t - elapsed));
    }, 100);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeColor]);

  const reset = useCallback(() => {
    setWhiteTime(base);
    setBlackTime(base);
    setActiveColor(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [base]);

  const formatTime = (seconds) => {
    if (seconds <= 0) return '0:00.0';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (seconds < 10) {
      const tenths = Math.floor((seconds % 1) * 10);
      return `0:0${s}.${tenths}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return { whiteTime, blackTime, formatTime, start, switchClock, stop, reset, activeColor };
};

export default useChessClock;
