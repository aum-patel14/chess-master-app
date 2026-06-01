import { useState, useRef, useCallback, useEffect } from 'react';

const safeNum = (n, fallback = 600) => {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

export const useChessClock = (base, increment) => {
  const safeBase = safeNum(base);
  const safeInc = Number.isFinite(Number(increment)) && Number(increment) >= 0
    ? Number(increment)
    : 0;

  const [whiteTime, setWhiteTime] = useState(safeBase);
  const [blackTime, setBlackTime] = useState(safeBase);
  const [activeColor, setActiveColor] = useState(null);
  const intervalRef = useRef(null);
  const lastTickRef = useRef(Date.now());

  // Reset clock when base or increment changes (e.g. new game setup)
  useEffect(() => {
    const b = safeNum(base);
    setWhiteTime(b);
    setBlackTime(b);
    setActiveColor(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [base, increment]);

  const start = useCallback((color) => {
    setActiveColor(color);
    lastTickRef.current = Date.now();
  }, []);

  const switchClock = useCallback((movedColor) => {
    const addTo = movedColor === 'w' ? setWhiteTime : setBlackTime;
    addTo((t) => safeNum(safeNum(t, safeBase) + safeInc, safeBase));
    const next = movedColor === 'w' ? 'b' : 'w';
    setActiveColor(next);
    lastTickRef.current = Date.now();
  }, [safeInc, safeBase]);

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
    const b = safeNum(base);
    setWhiteTime(b);
    setBlackTime(b);
    setActiveColor(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [base]);

  const formatTime = (seconds) => {
    const sec = safeNum(seconds, 0);
    if (sec <= 0) return '0:00.0';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    if (sec < 10) {
      const tenths = Math.floor((sec % 1) * 10);
      return `0:0${s}.${tenths}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return { whiteTime, blackTime, formatTime, start, switchClock, stop, reset, activeColor };
};

export default useChessClock;
