import {
  initStockfish as initServiceStockfish,
  getStockfishReady,
  getStockfishWorker,
  getBestMove as serviceBestMove,
  evaluatePosition as serviceEvaluatePosition,
  getRandomLegalMove,
} from '../services/stockfishService';

export const DIFFICULTY_CONFIG = {
  1: { label: 'Level 1' },
  2: { label: 'Level 2' },
  3: { label: 'Level 3' },
  4: { label: 'Level 4' },
  5: { label: 'Level 5' },
  6: { label: 'Level 6' },
  7: { label: 'Level 7' },
  8: { label: 'Level 8' },
  9: { label: 'Level 9' },
  10: { label: 'Level 10' },
};

const toServiceDifficulty = (level) => {
  const n = Number(level) || 3;
  if (n <= 1) return 1;
  if (n <= 2) return 2;
  if (n <= 5) return 3;
  if (n <= 8) return 4;
  return 5;
};

let currentDifficulty = 3;
let readyOverride = false;

export const stockfishEngine = {
  failed: false,
  isThinking: false,

  get worker() {
    return getStockfishWorker();
  },

  get isReady() {
    return readyOverride || getStockfishReady();
  },

  set isReady(value) {
    readyOverride = Boolean(value);
  },

  async init() {
    const ok = await initServiceStockfish();
    this.failed = !ok;
    this.isReady = ok;
    return ok;
  },

  setDifficulty(level) {
    currentDifficulty = toServiceDifficulty(level);
  },

  async getBestMove(fen, level = null) {
    const effectiveLevel = level == null ? currentDifficulty : toServiceDifficulty(level);
    this.isThinking = true;
    try {
      return await serviceBestMove(fen, effectiveLevel);
    } finally {
      this.isThinking = false;
    }
  },

  async evaluatePosition(fen, depth = 10) {
    return await serviceEvaluatePosition(fen, depth);
  },
};

export const initStockfish = () => stockfishEngine.init();
export { getStockfishReady, getRandomLegalMove };
