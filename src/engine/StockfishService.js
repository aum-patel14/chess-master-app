import {
  initStockfish,
  getBestMove as sfGetBestMove,
  getRandomLegalMove,
  evaluatePosition,
  destroyStockfish,
  getStockfishReady,
  getStockfishWorker,
  DIFFICULTY_CONFIG,
} from '../services/stockfishService';

/** @deprecated Use stockfishService directly; kept for AnalysisPanel and hints */
export class StockfishService {
  constructor() {
    this.isReady = false;
    this.failed = false;
    this.worker = null;
    this.isThinking = false;
    this.pendingResolve = null;
    this._init();
  }

  _init() {
    initStockfish().then((ok) => {
      this.isReady = ok;
      this.failed = !ok;
      this.worker = getStockfishWorker();
    });
  }

  get difficultySettings() {
    const out = {};
    for (const [lvl, cfg] of Object.entries(DIFFICULTY_CONFIG)) {
      out[lvl] = {
        depth: cfg.depth,
        movetime: cfg.movetime,
        skillLevel: cfg.skill,
      };
    }
    return out;
  }

  getBestMove(fen, difficultyLevel) {
    return sfGetBestMove(fen, Number(difficultyLevel)).catch(() => null);
  }

  evaluatePosition(fen, depth = 10) {
    return evaluatePosition(fen, depth);
  }

  terminate() {
    destroyStockfish();
    this.isReady = false;
    this.failed = true;
    this.worker = null;
  }
}

export const stockfishEngine = new StockfishService();

export {
  initStockfish,
  getRandomLegalMove,
  DIFFICULTY_CONFIG,
  getStockfishReady,
};
