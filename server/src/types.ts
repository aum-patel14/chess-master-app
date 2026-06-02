// TypeScript definitions for ChessMaster Pro real-time multiplayer sockets

export interface GlickoStats {
  rating: number;
  rd: number;
  volatility: number;
}

export interface ClientPlayer {
  id: string; // Supabase user ID
  username: string;
  rating: number;
  rd: number;
  volatility: number;
  socketId: string;
}

export interface RoomState {
  code: string;
  timeControl: number; // base seconds, e.g., 600
  increment: number; // increment seconds, e.g., 5
  white: ClientPlayer;
  black: ClientPlayer;
  rated: boolean;
  fen: string;
  history: Array<{
    from: string;
    to: string;
    promotion?: string;
    san: string;
  }>;
  whiteTime: number; // remaining seconds (decisecond precision)
  blackTime: number; // remaining seconds
  lastMoveTime: number; // epoch timestamp of last move
  inactivePlayer: 'w' | 'b' | null;
  disconnectTimeout: NodeJS.Timeout | null;
  rematchRequestedBy: string | null; // socket ID
}

export interface MatchmakePlayer {
  socketId: string;
  userId: string;
  username: string;
  rating: number;
  rd: number;
  volatility: number;
  timeControl: number;
  increment: number;
  rated: boolean;
  joinedAt: number; // Epoch timestamp
}

// Sockets Event Signatures
export interface ClientToServerEvents {
  'join-queue': (payload: {
    userId: string;
    username: string;
    timeControl: number;
    increment: number;
    rated: boolean;
  }) => void;
  'leave-queue': () => void;
  'make-move': (payload: {
    roomCode: string;
    from: string;
    to: string;
    promotion?: string;
  }) => void;
  'offer-draw': (payload: { roomCode: string }) => void;
  'accept-draw': (payload: { roomCode: string }) => void;
  'decline-draw': (payload: { roomCode: string }) => void;
  'resign': (payload: { roomCode: string }) => void;
  'request-rematch': (payload: { roomCode: string }) => void;
  'accept-rematch': (payload: { roomCode: string }) => void;
  'chat-message': (payload: { roomCode: string; text: string; senderName: string }) => void;
}

export interface ServerToClientEvents {
  'game-start': (payload: {
    color: 'w' | 'b';
    opponentName: string;
    opponentRating: number;
    timeControl: number;
    increment: number;
    roomCode: string;
  }) => void;
  'move-made': (payload: {
    from: string;
    to: string;
    promotion?: string;
    san: string;
    fen: string;
    clockWhite: number;
    clockBlack: number;
  }) => void;
  'game-over': (payload: {
    result: 'win' | 'loss' | 'draw';
    reason: 'checkmate' | 'stalemate' | 'draw-agreement' | 'resignation' | 'timeout' | 'disconnect-timeout' | 'threefold' | 'insufficient' | '50-move';
    winnerColor: 'w' | 'b' | null;
    ratingChangeWhite?: number;
    ratingChangeBlack?: number;
  }) => void;
  'draw-offered': () => void;
  'draw-declined': () => void;
  'opponent-disconnected': (payload: { secondsToReconnect: number }) => void;
  'opponent-reconnected': () => void;
  'chat-message-received': (payload: { id: number; text: string; senderName: string; senderSocket: string }) => void;
  'rematch-requested': () => void;
  'error-msg': (message: string) => void;
}
