import { useEffect, useState } from 'react';
import { evaluatePosition } from '../../services/stockfishService';
import './chesscom.css';

export default function EvalBar({ fen, flipped = false }) {
  const [pct, setPct] = useState(50);
  const [label, setLabel] = useState('0.0');

  useEffect(() => {
    let cancelled = false;
    evaluatePosition(fen, 10).then((ev) => {
      if (cancelled) return;
      const score = ev.score ?? 0;
      if (Math.abs(score) >= 99) {
        setPct(score > 0 ? 92 : 8);
        setLabel(`M${Math.abs(Math.round(score))}`);
        return;
      }
      const clamped = Math.max(-5, Math.min(5, score));
      const whitePct = 50 + clamped * 9;
      setPct(Math.min(95, Math.max(5, whitePct)));
      setLabel(score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1));
    });
    return () => {
      cancelled = true;
    };
  }, [fen]);

  const displayPct = flipped ? 100 - pct : pct;

  return (
    <div className="cc-eval-bar" title={`Eval: ${label}`}>
      <div className="cc-eval-black" style={{ height: `${100 - displayPct}%` }} />
      <div className="cc-eval-white" style={{ height: `${displayPct}%` }} />
      <span className="cc-eval-label">{label}</span>
    </div>
  );
}
