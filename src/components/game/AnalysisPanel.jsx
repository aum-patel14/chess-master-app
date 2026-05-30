import './AnalysisPanel.css';
import { useEffect, useState, useRef } from 'react';
import { stockfishEngine } from '../../engine/StockfishService';
import { Award, Zap, AlertCircle, HelpCircle, Check, X, ShieldAlert, Sparkles } from 'lucide-react';

export default function AnalysisPanel({ history, onJumpToMove, onSelectArrow, onCloseAnalysis }) {
  const [analyzingIdx, setAnalyzingIdx] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [accuracies, setAccuracies] = useState({ w: 0, b: 0 });
  const [counts, setCounts] = useState({
    w: { brilliant: 0, good: 0, neutral: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
    b: { brilliant: 0, good: 0, neutral: 0, inaccuracy: 0, mistake: 0, blunder: 0 }
  });

  const abortRef = useRef(false);

  // Run analysis loop
  useEffect(() => {
    abortRef.current = false;
    async function runAnalysis() {
      const results = [];
      let previousScore = 0.0; // Assume starting position is balanced (0.0)

      for (let i = 0; i < history.length; i++) {
        if (abortRef.current) return;
        setAnalyzingIdx(i + 1);

        const move = history[i];
        
        // We evaluate the FEN *before* the move to see what Stockfish recommends!
        const fenBefore = i === 0 
          ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' 
          : history[i - 1].fen;

        const evalBefore = await stockfishEngine.evaluatePosition(fenBefore, 10);
        const evalAfter = await stockfishEngine.evaluatePosition(move.fen, 10);

        // Diff the score (normalized so white is positive, black is negative)
        const activeColor = move.color; // 'w' or 'b'
        const scoreBefore = evalBefore.score;
        const scoreAfter = evalAfter.score;
        
        // Loss represents how much evaluation dropped for the active player
        let loss = 0;
        if (activeColor === 'w') {
          loss = scoreBefore - scoreAfter;
        } else {
          loss = scoreAfter - scoreBefore; // positive drops are bad
        }

        // Move Classifications
        let classification = 'Neutral';
        let badge = '?.';
        let badgeClass = 'neutral-badge';

        if (loss <= -0.5) {
          classification = 'Brilliant';
          badge = '!!';
          badgeClass = 'brilliant-badge';
        } else if (loss <= 0.08) {
          classification = 'Good';
          badge = '!';
          badgeClass = 'good-badge';
        } else if (loss <= 0.25) {
          classification = 'Neutral';
          badge = ' ';
          badgeClass = 'neutral-badge';
        } else if (loss <= 0.5) {
          classification = 'Inaccuracy';
          badge = '?!';
          badgeClass = 'inaccuracy-badge';
        } else if (loss <= 1.5) {
          classification = 'Mistake';
          badge = '?';
          badgeClass = 'mistake-badge';
        } else {
          classification = 'Blunder';
          badge = '??';
          badgeClass = 'blunder-badge';
        }

        // Save result
        results.push({
          num: Math.floor(i / 2) + 1,
          san: move.san,
          color: move.color,
          fen: move.fen,
          score: scoreAfter,
          bestMove: evalBefore.bestMove,
          classification,
          badge,
          badgeClass,
          loss
        });
      }

      if (abortRef.current) return;

      // Compute final summaries & accuracies
      calculateSummaries(results);
      setAnalysisResults(results);
      setIsDone(true);
    }

    if (history.length > 0) {
      runAnalysis();
    } else {
      setIsDone(true);
    }

    return () => {
      abortRef.current = true;
    };
  }, [history]);

  const calculateSummaries = (results) => {
    const wCounts = { brilliant: 0, good: 0, neutral: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    const bCounts = { brilliant: 0, good: 0, neutral: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    
    let wTotalScore = 0;
    let bTotalScore = 0;
    let wMoves = 0;
    let bMoves = 0;

    results.forEach(res => {
      const c = res.color === 'w' ? wCounts : bCounts;
      
      // Calculate move accuracy based on centipawn loss (sigmoid curve)
      const moveAccuracy = Math.max(0, Math.min(100, Math.round(100 * Math.exp(-2.0 * Math.max(0, res.loss)))));

      if (res.color === 'w') {
        wTotalScore += moveAccuracy;
        wMoves++;
      } else {
        bTotalScore += moveAccuracy;
        bMoves++;
      }

      switch (res.classification) {
        case 'Brilliant': c.brilliant++; break;
        case 'Good': c.good++; break;
        case 'Neutral': c.neutral++; break;
        case 'Inaccuracy': c.inaccuracy++; break;
        case 'Mistake': c.mistake++; break;
        case 'Blunder': c.blunder++; break;
      }
    });

    const wAcc = wMoves > 0 ? Math.round(wTotalScore / wMoves) : 100;
    const bAcc = bMoves > 0 ? Math.round(bTotalScore / bMoves) : 100;

    setAccuracies({ w: wAcc, b: bAcc });
    setCounts({ w: wCounts, b: bCounts });
  };

  const handleRowClick = (res, idx) => {
    onJumpToMove(idx);
    
    // Draw SVG arrow showing Stockfish's suggested best move
    if (res.bestMove) {
      const bestMoveFrom = res.bestMove.substring(0, 2);
      const bestMoveTo = res.bestMove.substring(2, 4);
      onSelectArrow({ from: bestMoveFrom, to: bestMoveTo });
    } else {
      onSelectArrow(null);
    }
  };

  // Group pairs for display
  const pairs = [];
  for (let i = 0; i < analysisResults.length; i += 2) {
    pairs.push({
      num: Math.floor(i / 2) + 1,
      white: analysisResults[i],
      black: analysisResults[i + 1],
      whiteIndex: i,
      blackIndex: i + 1
    });
  }

  const progressPercent = history.length > 0 ? Math.round((analyzingIdx / history.length) * 100) : 0;

  if (!isDone) {
    return (
      <div className="analysis-panel-loading-container">
        <Sparkles size={36} className="analysis-glow-icon" />
        <h3 className="font-cinzel">Stockfish Analyzing...</h3>
        <p className="loading-subtitle">Computing move accuracy and blunders</p>
        <div className="analysis-progress-bar-bg">
          <div className="analysis-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="loading-counter">{analyzingIdx} / {history.length} moves</span>
      </div>
    );
  }

  return (
    <div className="analysis-panel-container">
      {/* HEADER SECTION */}
      <div className="analysis-panel-header font-cinzel">
        GAME ANALYSIS
      </div>

      {/* ACCURACIES SUMMARY */}
      <div className="analysis-accuracy-card">
        <div className="accuracies-row">
          <div className="accuracy-badge white">
            <span className="accuracy-label">WHITE</span>
            <span className="accuracy-percent">{accuracies.w}%</span>
          </div>
          <div className="accuracy-badge black">
            <span className="accuracy-label">BLACK</span>
            <span className="accuracy-percent">{accuracies.b}%</span>
          </div>
        </div>

        {/* Quality breakdown lists */}
        <div className="quality-lists-container">
          <div className="quality-player-column">
            <div className="quality-summary-item"><span className="quality-badge brilliant-badge">!!</span> <span>{counts.w.brilliant} Brilliant</span></div>
            <div className="quality-summary-item"><span className="quality-badge good-badge">!</span> <span>{counts.w.good} Good</span></div>
            <div className="quality-summary-item"><span className="quality-badge inaccuracy-badge">?!</span> <span>{counts.w.inaccuracy} Inaccuracy</span></div>
            <div className="quality-summary-item"><span className="quality-badge mistake-badge">?</span> <span>{counts.w.mistake} Mistake</span></div>
            <div className="quality-summary-item"><span className="quality-badge blunder-badge">??</span> <span>{counts.w.blunder} Blunder</span></div>
          </div>
          <div className="quality-player-column">
            <div className="quality-summary-item"><span className="quality-badge brilliant-badge">!!</span> <span>{counts.b.brilliant} Brilliant</span></div>
            <div className="quality-summary-item"><span className="quality-badge good-badge">!</span> <span>{counts.b.good} Good</span></div>
            <div className="quality-summary-item"><span className="quality-badge inaccuracy-badge">?!</span> <span>{counts.b.inaccuracy} Inaccuracy</span></div>
            <div className="quality-summary-item"><span className="quality-badge mistake-badge">?</span> <span>{counts.b.mistake} Mistake</span></div>
            <div className="quality-summary-item"><span className="quality-badge blunder-badge">??</span> <span>{counts.b.blunder} Blunder</span></div>
          </div>
        </div>
      </div>

      {/* MOVE LIST ROW */}
      <div className="analysis-moves-scroll">
        {pairs.length === 0 ? (
          <div className="analysis-empty">No moves analyzed</div>
        ) : (
          <div className="analysis-moves-table">
            {pairs.map((pair, i) => (
              <div key={i} className={`analysis-moves-row ${i % 2 === 0 ? 'even' : 'odd'}`}>
                <div className="analysis-col-num">{pair.num}.</div>
                
                {/* White Move cell */}
                <div 
                  className="analysis-col-san white"
                  onClick={() => handleRowClick(pair.white, pair.whiteIndex)}
                >
                  <span className="san-text">{pair.white.san}</span>
                  <span className={`analysis-move-badge ${pair.white.badgeClass}`}>{pair.white.badge}</span>
                </div>

                {/* Black Move cell */}
                {pair.black ? (
                  <div 
                    className="analysis-col-san black"
                    onClick={() => handleRowClick(pair.black, pair.blackIndex)}
                  >
                    <span className="san-text">{pair.black.san}</span>
                    <span className={`analysis-move-badge ${pair.black.badgeClass}`}>{pair.black.badge}</span>
                  </div>
                ) : (
                  <div className="analysis-col-san black empty" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CLOSE BUTTON */}
      <button className="analysis-close-btn font-cinzel" onClick={onCloseAnalysis}>
        Exit Analysis
      </button>
    </div>
  );
}
