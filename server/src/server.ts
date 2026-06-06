import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { Chess } from 'chess.js';
import { createClient } from '@supabase/supabase-js';
import { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  RoomState, 
  MatchmakePlayer,
  ClientPlayer,
  PuzzleBattleRoomState,
  PuzzleBattlePlayer
} from './types.js';
import { calculateGlicko2Update } from './glicko2.js';

dotenv.config();

import stripeRouter from './stripe.js';
import { getFirestoreUser, updateFirestoreUser, saveGameToFirestore } from './db.js';

const app = express();
app.use(cors());

// Configure express JSON parser to skip Stripe webhook to prevent conflicts with raw body parsing
app.use((req, res, next) => {
  if (req.originalUrl && req.originalUrl.startsWith('/api/stripe/webhook')) {
    next();
  } else {
    express.json({
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      }
    })(req, res, next);
  }
});

app.use('/api/stripe', stripeRouter);

const PORT = process.env.PORT || 3001;
const httpServer = createServer(app);

// 1. SUPABASE SERVICE CLIENT (Bypasses RLS to write scores, ratings, and finished games)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase: any = null;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    'WARNING: Supabase credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are missing. Running in mock/fallback mode.'
  );
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}

// 2. SOCKET SERVER INITIALIZATION
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 3. SERVER MEMORY STATE
const rooms = new Map<string, RoomState>(); // roomCode => RoomState
const activePlayers = new Map<string, { roomCode: string; color: 'w' | 'b'; opponentSocketId: string | null }>(); // socketId => player
const queue: MatchmakePlayer[] = []; // Matchmaking queue

// Puzzle Battles States
const puzzleRooms = new Map<string, PuzzleBattleRoomState>(); // roomCode => PuzzleBattleRoomState
const activePuzzlePlayers = new Map<string, { roomCode: string; playerIndex: 0 | 1 }>(); // socketId => player
const puzzleQueue: Array<{ socketId: string; userId: string; username: string; rating: number; joinedAt: number }> = [];

// 4. PERIODIC MATCHMAKING TICK (Every 1 second)
setInterval(() => {
  if (queue.length < 2) return;

  const now = Date.now();
  const matchedIndices = new Set<number>();

  for (let i = 0; i < queue.length; i++) {
    if (matchedIndices.has(i)) continue;
    const playerA = queue[i];

    for (let j = i + 1; j < queue.length; j++) {
      if (matchedIndices.has(j)) continue;
      const playerB = queue[j];

      // Match only if matchmaking settings are identical
      if (
        playerA.timeControl !== playerB.timeControl ||
        playerA.increment !== playerB.increment ||
        playerA.rated !== playerB.rated
      ) {
        continue;
      }

      // Calculate elapsed wait times
      const waitA = (now - playerA.joinedAt) / 1000;
      const waitB = (now - playerB.joinedAt) / 1000;

      // Determine ELO search windows based on wait times (±100 -> ±200 -> anyone)
      const rangeA = waitA < 10 ? 100 : waitA < 30 ? 200 : 99999;
      const rangeB = waitB < 10 ? 100 : waitB < 30 ? 200 : 99999;

      const ratingDiff = Math.abs(playerA.rating - playerB.rating);

      // Verify that BOTH players fit within each other's allowed ELO search margin
      if (ratingDiff <= rangeA && ratingDiff <= rangeB) {
        // MATCH MADE!
        matchedIndices.add(i);
        matchedIndices.add(j);

        createMultiplayerMatch(playerA, playerB);
        break;
      }
    }
  }

  // Clear matched players from queue (reverse loop to preserve indices)
  const sortedIndices = Array.from(matchedIndices).sort((a, b) => b - a);
  for (const idx of sortedIndices) {
    queue.splice(idx, 1);
  }
}, 1000);

// Puzzle Matchmaking tick (Every 1 second)
setInterval(async () => {
  if (puzzleQueue.length < 2) return;

  const now = Date.now();
  const matchedIndices = new Set<number>();

  for (let i = 0; i < puzzleQueue.length; i++) {
    if (matchedIndices.has(i)) continue;
    const playerA = puzzleQueue[i];

    for (let j = i + 1; j < puzzleQueue.length; j++) {
      if (matchedIndices.has(j)) continue;
      const playerB = puzzleQueue[j];

      // Calculate elapsed wait times
      const waitA = (now - playerA.joinedAt) / 1000;
      const waitB = (now - playerB.joinedAt) / 1000;

      // Search range
      const rangeA = waitA < 10 ? 150 : waitA < 30 ? 300 : 99999;
      const rangeB = waitB < 10 ? 150 : waitB < 30 ? 300 : 99999;

      const ratingDiff = Math.abs(playerA.rating - playerB.rating);

      if (ratingDiff <= rangeA && ratingDiff <= rangeB) {
        matchedIndices.add(i);
        matchedIndices.add(j);

        await createPuzzleBattleMatch(playerA, playerB);
        break;
      }
    }
  }

  const sortedIndices = Array.from(matchedIndices).sort((a, b) => b - a);
  for (const idx of sortedIndices) {
    puzzleQueue.splice(idx, 1);
  }
}, 1000);

// Helper: Create a Puzzle Battle Match
async function createPuzzleBattleMatch(
  playerA: { socketId: string; userId: string; username: string; rating: number },
  playerB: { socketId: string; userId: string; username: string; rating: number }
) {
  const roomCode = 'P_' + generateRoomCode();
  
  // Fetch 15 puzzles from Supabase puzzles table
  let dbPuzzles: any[] = [];
  try {
    const avgRating = Math.round((playerA.rating + playerB.rating) / 2);
    if (supabase) {
      const { data } = await supabase
        .from('puzzles')
        .select('*')
        .gte('rating', avgRating - 300)
        .lte('rating', avgRating + 400)
        .limit(15);
        
      if (data && data.length >= 5) {
        dbPuzzles = data;
      }
    }
  } catch (err) {
    console.error('[Puzzle Sockets] Failed to load puzzles from database:', err);
  }

  // Fallback to local curated puzzles if DB is empty or fails
  if (dbPuzzles.length < 5) {
    dbPuzzles = [
      { id: "puz001", fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", moves: ["f3e5", "d8g5", "e5f7"], rating: 1200, themes: ["fork"] },
      { id: "puz002", fen: "6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1", moves: ["e1e8"], rating: 800, themes: ["mate"] },
      { id: "puz003", fen: "r3k2r/pppq1ppp/2np1n2/2b1p1B1/2B1P3/2NP1N2/PPP1QPPP/R3K2R b KQkq - 0 1", moves: ["f6e4"], rating: 1000, themes: ["pin"] },
      { id: "puz004", fen: "2k5/8/8/8/8/q7/2R5/2K5 w - - 0 1", moves: ["c2a2"], rating: 1100, themes: ["skewer"] },
      { id: "extra002", fen: "3r2k1/pp3ppp/8/8/8/8/Pq3PPP/4Q1K1 w - - 0 1", moves: ["e1e8", "d8e8"], rating: 900, themes: ["mate"] },
      { id: "extra004", fen: "6k1/5ppp/8/3p4/8/1q6/2R5/2K5 w - - 0 1", moves: ["c2c8"], rating: 800, themes: ["mate"] },
      { id: "extra010", fen: "6k1/R4ppp/8/8/8/8/1r3PPP/5GK1 w - - 0 1", moves: ["a7a8", "b2b8", "a8b8"], rating: 900, themes: ["mate"] }
    ];
  }

  // Shuffle & ensure we have exactly 15 puzzles by looping if necessary
  const puzzlesList: any[] = [];
  while (puzzlesList.length < 15) {
    const remaining: number = 15 - puzzlesList.length;
    const chunk: any[] = dbPuzzles.slice(0, remaining).map(p => ({
      id: p.id,
      fen: p.fen,
      moves: Array.isArray(p.moves) ? p.moves : [p.moves],
      rating: p.rating,
      themes: Array.isArray(p.themes) ? p.themes : [p.themes]
    }));
    puzzlesList.push(...chunk);
  }

  const p1: PuzzleBattlePlayer = {
    id: playerA.userId,
    username: playerA.username,
    rating: playerA.rating,
    socketId: playerA.socketId,
    score: 0,
    puzzleIndex: 0,
    wrongAttempts: 0
  };

  const p2: PuzzleBattlePlayer = {
    id: playerB.userId,
    username: playerB.username,
    rating: playerB.rating,
    socketId: playerB.socketId,
    score: 0,
    puzzleIndex: 0,
    wrongAttempts: 0
  };

  const duration = 180000; // 3 minutes in ms

  const roomState: PuzzleBattleRoomState = {
    code: roomCode,
    players: [p1, p2],
    puzzles: puzzlesList,
    startTime: Date.now(),
    duration,
    status: 'playing'
  };

  puzzleRooms.set(roomCode, roomState);
  activePuzzlePlayers.set(playerA.socketId, { roomCode, playerIndex: 0 });
  activePuzzlePlayers.set(playerB.socketId, { roomCode, playerIndex: 1 });

  // Join sockets to room
  const sA = io.sockets.sockets.get(playerA.socketId);
  const sB = io.sockets.sockets.get(playerB.socketId);
  if (sA) sA.join(roomCode);
  if (sB) sB.join(roomCode);

  // Notify clients
  io.to(playerA.socketId).emit('puzzle-battle-start', {
    roomCode,
    opponentName: playerB.username,
    opponentRating: playerB.rating,
    puzzles: puzzlesList,
    duration
  });

  io.to(playerB.socketId).emit('puzzle-battle-start', {
    roomCode,
    opponentName: playerA.username,
    opponentRating: playerA.rating,
    puzzles: puzzlesList,
    duration
  });

  console.log(`[Puzzle Battle] Room ${roomCode} started: ${playerA.username} vs ${playerB.username}`);

  // Setup 3-minute end timer
  setTimeout(() => {
    const room = puzzleRooms.get(roomCode);
    if (room && room.status === 'playing') {
      endPuzzleBattle(room, 'time-up');
    }
  }, duration);
}

function endPuzzleBattle(room: PuzzleBattleRoomState, reason: 'time-up' | 'all-solved' | 'opponent-left', leftSocketId?: string) {
  room.status = 'ended';

  const [p1, p2] = room.players;
  let r1: 'win' | 'loss' | 'draw' = 'draw';
  let r2: 'win' | 'loss' | 'draw' = 'draw';

  if (reason === 'opponent-left' && leftSocketId) {
    if (p1.socketId === leftSocketId) {
      r1 = 'loss';
      r2 = 'win';
    } else {
      r1 = 'win';
      r2 = 'loss';
    }
  } else {
    if (p1.score > p2.score) {
      r1 = 'win';
      r2 = 'loss';
    } else if (p2.score > p1.score) {
      r1 = 'loss';
      r2 = 'win';
    }
  }

  // Emit outcomes to both players
  io.to(p1.socketId).emit('puzzle-battle-over', {
    result: r1,
    reason,
    finalScore: p1.score,
    opponentScore: p2.score
  });

  io.to(p2.socketId).emit('puzzle-battle-over', {
    result: r2,
    reason,
    finalScore: p2.score,
    opponentScore: p1.score
  });

  // Cleanup
  activePuzzlePlayers.delete(p1.socketId);
  activePuzzlePlayers.delete(p2.socketId);
  puzzleRooms.delete(room.code);

  console.log(`[Puzzle Battle] Room ${room.code} ended. Reason: ${reason}. Final scores: ${p1.username} ${p1.score} - ${p2.username} ${p2.score}`);
}

// Helper: Create a room and spawn matchmaking game
function createMultiplayerMatch(playerA: MatchmakePlayer, playerB: MatchmakePlayer) {
  const roomCode = generateRoomCode();
  const whiteIsA = Math.random() > 0.5;

  const whitePlayer: ClientPlayer = {
    id: whiteIsA ? playerA.userId : playerB.userId,
    username: whiteIsA ? playerA.username : playerB.username,
    rating: whiteIsA ? playerA.rating : playerB.rating,
    rd: whiteIsA ? playerA.rd : playerB.rd,
    volatility: whiteIsA ? playerA.volatility : playerB.volatility,
    socketId: whiteIsA ? playerA.socketId : playerB.socketId
  };

  const blackPlayer: ClientPlayer = {
    id: whiteIsA ? playerB.userId : playerA.userId,
    username: whiteIsA ? playerB.username : playerA.username,
    rating: whiteIsA ? playerB.rating : playerA.rating,
    rd: whiteIsA ? playerB.rd : playerA.rd,
    volatility: whiteIsA ? playerB.volatility : playerA.volatility,
    socketId: whiteIsA ? playerB.socketId : playerA.socketId
  };

  const roomState: RoomState = {
    code: roomCode,
    timeControl: playerA.timeControl,
    increment: playerA.increment,
    white: whitePlayer,
    black: blackPlayer,
    rated: playerA.rated,
    fen: new Chess().fen(),
    history: [],
    whiteTime: playerA.timeControl,
    blackTime: playerA.timeControl,
    lastMoveTime: Date.now(),
    inactivePlayer: null,
    disconnectTimeout: null,
    rematchRequestedBy: null
  };

  rooms.set(roomCode, roomState);

  // Link players in socket mapping
  activePlayers.set(whitePlayer.socketId, { roomCode, color: 'w', opponentSocketId: blackPlayer.socketId });
  activePlayers.set(blackPlayer.socketId, { roomCode, color: 'b', opponentSocketId: whitePlayer.socketId });

  // Join sockets to room
  const whiteSocket = io.sockets.sockets.get(whitePlayer.socketId);
  const blackSocket = io.sockets.sockets.get(blackPlayer.socketId);
  if (whiteSocket) whiteSocket.join(roomCode);
  if (blackSocket) blackSocket.join(roomCode);

  // Notify clients
  io.to(whitePlayer.socketId).emit('game-start', {
    color: 'w',
    opponentName: blackPlayer.username,
    opponentRating: blackPlayer.rating,
    timeControl: roomState.timeControl,
    increment: roomState.increment,
    roomCode
  });

  io.to(blackPlayer.socketId).emit('game-start', {
    color: 'b',
    opponentName: whitePlayer.username,
    opponentRating: whitePlayer.rating,
    timeControl: roomState.timeControl,
    increment: roomState.increment,
    roomCode
  });

  console.log(`[Matchmaker] Room ${roomCode} created: ${whitePlayer.username} vs ${blackPlayer.username}`);
}

// 5. GAME OVER END ENGINE & GLICKO-2 CALCULATIONS
async function resolveGameOver(
  room: RoomState,
  result: 'win' | 'loss' | 'draw',
  reason: 'checkmate' | 'stalemate' | 'draw-agreement' | 'resignation' | 'timeout' | 'disconnect-timeout' | 'threefold' | 'insufficient' | '50-move',
  winnerColor: 'w' | 'b' | null
) {
  if (room.disconnectTimeout) {
    clearTimeout(room.disconnectTimeout);
    room.disconnectTimeout = null;
  }

  let ratingChangeWhite = 0;
  let ratingChangeBlack = 0;

  // Process Glicko-2 rating changes only if match is rated
  if (room.rated) {
    try {
      const timeControlCategory = getRatingCategory(room.timeControl);
      
      const whiteGlicko = { rating: room.white.rating, rd: room.white.rd, volatility: room.white.volatility };
      const blackGlicko = { rating: room.black.rating, rd: room.black.rd, volatility: room.black.volatility };

      let whiteOutcome = 0.5;
      if (result === 'win' && winnerColor === 'w') whiteOutcome = 1;
      if (result === 'loss' && winnerColor === 'b') whiteOutcome = 0;

      const newWhiteGlicko = calculateGlicko2Update(whiteGlicko, blackGlicko, whiteOutcome);
      const newBlackGlicko = calculateGlicko2Update(blackGlicko, whiteGlicko, 1 - whiteOutcome);

      ratingChangeWhite = newWhiteGlicko.rating - room.white.rating;
      ratingChangeBlack = newBlackGlicko.rating - room.black.rating;

      // Update ratings inside Firestore
      try {
        const whiteUserDoc = await getFirestoreUser(room.white.id);
        const whiteRatings = whiteUserDoc?.ratings || { bullet: 1200, blitz: 1200, rapid: 1200, classical: 1200, puzzle: 1200 };
        whiteRatings[timeControlCategory] = Math.round(newWhiteGlicko.rating);
        whiteRatings.rd = Math.round(newWhiteGlicko.rd);
        whiteRatings.volatility = newWhiteGlicko.volatility;
        await updateFirestoreUser(room.white.id, {
          rating: Math.round(newWhiteGlicko.rating),
          ratings: whiteRatings
        });

        const blackUserDoc = await getFirestoreUser(room.black.id);
        const blackRatings = blackUserDoc?.ratings || { bullet: 1200, blitz: 1200, rapid: 1200, classical: 1200, puzzle: 1200 };
        blackRatings[timeControlCategory] = Math.round(newBlackGlicko.rating);
        blackRatings.rd = Math.round(newBlackGlicko.rd);
        blackRatings.volatility = newBlackGlicko.volatility;
        await updateFirestoreUser(room.black.id, {
          rating: Math.round(newBlackGlicko.rating),
          ratings: blackRatings
        });
      } catch (err) {
        console.error('[Firestore Update] Error updating ratings on game over:', err);
      }

      // Update ratings inside Supabase if client is available
      if (supabase) {
        try {
          await supabase
            .from('ratings')
            .update({
              rating: newWhiteGlicko.rating,
              rd: newWhiteGlicko.rd,
              volatility: newWhiteGlicko.volatility,
              games_played: room.white.rd === 350 ? 1 : 1
            })
            .eq('user_id', room.white.id)
            .eq('time_control', timeControlCategory);

          await supabase
            .from('ratings')
            .update({
              rating: newBlackGlicko.rating,
              rd: newBlackGlicko.rd,
              volatility: newBlackGlicko.volatility
            })
            .eq('user_id', room.black.id)
            .eq('time_control', timeControlCategory);

          // Increment games played in Supabase
          await supabase.rpc('increment_games_played', { uid: room.white.id, tc: timeControlCategory });
          await supabase.rpc('increment_games_played', { uid: room.black.id, tc: timeControlCategory });
        } catch (err) {
          console.warn('[Supabase Update] Failed updating ratings:', err);
        }
      }

    } catch (err) {
      console.error('[Glicko Engine] Error calculating rating updates:', err);
    }
  }

  // Generate PGN
  const pgn = buildPgn(room, result, reason);

  // Save game record in Firestore
  const gameData = {
    userId: room.white.id,
    white_id: room.white.id,
    black_id: room.black.id,
    white: { username: room.white.username },
    black: { username: room.black.username },
    pgn: pgn,
    result: result === 'draw' ? '1/2-1/2' : winnerColor === 'w' ? '1-0' : '0-1',
    time_control: `${room.timeControl / 60}+${room.increment}`,
    rated: room.rated,
    created_at: new Date().toISOString(),
    timestamp: new Date().toISOString()
  };
  await saveGameToFirestore(gameData);

  // Save game record in Supabase if client is available
  if (supabase) {
    try {
      await supabase.from('games').insert({
        white_id: room.white.id,
        black_id: room.black.id,
        pgn: pgn,
        result: result === 'draw' ? '1/2-1/2' : winnerColor === 'w' ? '1-0' : '0-1',
        time_control: `${room.timeControl / 60}+${room.increment}`,
        rated: room.rated
      });
    } catch (err) {
      console.error('[Supabase Save] Failed saving PGN to DB:', err);
    }
  }

  // Notify clients
  io.to(room.code).emit('game-over', {
    result,
    reason,
    winnerColor,
    ratingChangeWhite,
    ratingChangeBlack
  });

  // Clean active session links
  activePlayers.delete(room.white.socketId);
  activePlayers.delete(room.black.socketId);
  rooms.delete(room.code);
  console.log(`[Game Room] Room ${room.code} terminated. Reason: ${reason}`);
}

// 6. MAIN SOCKET LISTENERS DEFINITIONS
io.on('connection', (socket: Socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Join matchmaking queue
  socket.on('join-queue', async ({ userId, username, timeControl, increment, rated }) => {
    // Clear references
    removeFromQueue(socket.id);
    handleSocketCleanup(socket.id);

    try {
      const tcCategory = getRatingCategory(timeControl);
      let rating = 1200;
      let rd = 350;
      let volatility = 0.06;

      // Try fetching from Firestore first
      const firestoreUser = await getFirestoreUser(userId);
      if (firestoreUser) {
        rating = firestoreUser.ratings?.[tcCategory] ?? firestoreUser.rating ?? 1200;
        rd = firestoreUser.ratings?.rd ?? 350;
        volatility = firestoreUser.ratings?.volatility ?? 0.06;
      } else if (supabase) {
        // Fall back to Supabase
        try {
          const { data: ratingDetails } = await supabase
            .from('ratings')
            .select('rating, rd, volatility')
            .eq('user_id', userId)
            .eq('time_control', tcCategory)
            .single();

          if (ratingDetails) {
            rating = ratingDetails.rating ?? 1200;
            rd = ratingDetails.rd ?? 350;
            volatility = ratingDetails.volatility ?? 0.06;
          }
        } catch (err) {
          console.warn('[Supabase Fetch] Failed fetching user ratings:', err);
        }
      }

      const playerEntry: MatchmakePlayer = {
        socketId: socket.id,
        userId,
        username,
        rating,
        rd,
        volatility,
        timeControl,
        increment,
        rated,
        joinedAt: Date.now()
      };

      queue.push(playerEntry);
      console.log(`[Matchmaker] Enqueued player ${username} (${rating} ELO, ${timeControl}s)`);
    } catch (e) {
      socket.emit('error-msg', 'Failed to retrieve profile ratings for matchmaking.');
    }
  });

  // Leave matchmaking queue
  socket.on('leave-queue', () => {
    removeFromQueue(socket.id);
    socket.emit('error-msg', 'Matchmaking queue cancelled.');
  });

  // Make move relay with server-side validation
  socket.on('make-move', ({ roomCode, from, to, promotion }) => {
    const player = activePlayers.get(socket.id);
    if (!player || player.roomCode !== roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    const chess = new Chess(room.fen);
    const activeColor = chess.turn();

    // Verify turn order
    if (activeColor !== player.color) {
      socket.emit('error-msg', 'It is not your turn!');
      return;
    }

    try {
      // Validate move via chess.js
      const moveResult = chess.move({ from, to, promotion });
      if (!moveResult) {
        socket.emit('error-msg', 'Illegal move attempted.');
        return;
      }

      // Computeprecise clock elapsed time with lag compensation
      const now = Date.now();
      const elapsed = (now - room.lastMoveTime) / 1000;
      room.lastMoveTime = now;

      // Deduct spent time (lag compensation: capping subtraction if necessary)
      if (player.color === 'w') {
        room.whiteTime = Math.max(0, room.whiteTime - elapsed);
        // Add increment
        if (room.history.length >= 1) room.whiteTime += room.increment;
      } else {
        room.blackTime = Math.max(0, room.blackTime - elapsed);
        if (room.history.length >= 1) room.blackTime += room.increment;
      }

      // Check timeout
      if (room.whiteTime <= 0) {
        resolveGameOver(room, 'loss', 'timeout', 'b');
        return;
      }
      if (room.blackTime <= 0) {
        resolveGameOver(room, 'loss', 'timeout', 'w');
        return;
      }

      // Update room state
      room.fen = chess.fen();
      room.history.push({ from, to, promotion, san: moveResult.san });

      // Check game outcome conditions
      if (chess.isCheckmate()) {
        resolveGameOver(room, player.color === 'w' ? 'win' : 'loss', 'checkmate', player.color);
        return;
      }
      if (chess.isStalemate()) {
        resolveGameOver(room, 'draw', 'stalemate', null);
        return;
      }
      if (chess.isThreefoldRepetition()) {
        resolveGameOver(room, 'draw', 'threefold', null);
        return;
      }
      if (chess.isInsufficientMaterial()) {
        resolveGameOver(room, 'draw', 'insufficient', null);
        return;
      }
      if (chess.isDraw()) {
        // Fallback for 50-move rule
        resolveGameOver(room, 'draw', '50-move', null);
        return;
      }

      // Relay valid move to both sockets
      io.to(roomCode).emit('move-made', {
        from,
        to,
        promotion,
        san: moveResult.san,
        fen: room.fen,
        clockWhite: Math.round(room.whiteTime),
        clockBlack: Math.round(room.blackTime)
      });

    } catch (e) {
      socket.emit('error-msg', 'Move validation crashed.');
    }
  });

  // Resignation
  socket.on('resign', ({ roomCode }) => {
    const player = activePlayers.get(socket.id);
    if (!player || player.roomCode !== roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;

    const winnerColor = player.color === 'w' ? 'b' : 'w';
    resolveGameOver(room, 'loss', 'resignation', winnerColor);
  });

  // Draw offers
  socket.on('offer-draw', ({ roomCode }) => {
    const player = activePlayers.get(socket.id);
    if (player?.opponentSocketId) {
      io.to(player.opponentSocketId).emit('draw-offered');
    }
  });

  socket.on('accept-draw', ({ roomCode }) => {
    const player = activePlayers.get(socket.id);
    if (!player || player.roomCode !== roomCode) return;
    const room = rooms.get(roomCode);
    if (room) {
      resolveGameOver(room, 'draw', 'draw-agreement', null);
    }
  });

  socket.on('decline-draw', ({ roomCode }) => {
    const player = activePlayers.get(socket.id);
    if (player?.opponentSocketId) {
      io.to(player.opponentSocketId).emit('draw-declined');
    }
  });

  // Rematch events
  socket.on('request-rematch', ({ roomCode }) => {
    const player = activePlayers.get(socket.id);
    if (!player || player.roomCode !== roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;

    room.rematchRequestedBy = socket.id;
    if (player.opponentSocketId) {
      io.to(player.opponentSocketId).emit('rematch-requested');
    }
  });

  socket.on('accept-rematch', ({ roomCode }) => {
    const player = activePlayers.get(socket.id);
    if (!player || player.roomCode !== roomCode) return;
    const room = rooms.get(roomCode);
    if (!room || !room.rematchRequestedBy) return;

    // Start fresh game inside the same room code!
    const newRoomCode = generateRoomCode();
    // Invert player colors
    const whitePlayer: ClientPlayer = { ...room.black, socketId: room.black.socketId };
    const blackPlayer: ClientPlayer = { ...room.white, socketId: room.white.socketId };

    const newRoomState: RoomState = {
      code: newRoomCode,
      timeControl: room.timeControl,
      increment: room.increment,
      white: whitePlayer,
      black: blackPlayer,
      rated: room.rated,
      fen: new Chess().fen(),
      history: [],
      whiteTime: room.timeControl,
      blackTime: room.timeControl,
      lastMoveTime: Date.now(),
      inactivePlayer: null,
      disconnectTimeout: null,
      rematchRequestedBy: null
    };

    rooms.set(newRoomCode, newRoomState);

    // Update active player bindings
    activePlayers.set(whitePlayer.socketId, { roomCode: newRoomCode, color: 'w', opponentSocketId: blackPlayer.socketId });
    activePlayers.set(blackPlayer.socketId, { roomCode: newRoomCode, color: 'b', opponentSocketId: whitePlayer.socketId });

    // Join room
    const s1 = io.sockets.sockets.get(whitePlayer.socketId);
    const s2 = io.sockets.sockets.get(blackPlayer.socketId);
    if (s1) s1.join(newRoomCode);
    if (s2) s2.join(newRoomCode);

    // Emit game start
    io.to(whitePlayer.socketId).emit('game-start', {
      color: 'w',
      opponentName: blackPlayer.username,
      opponentRating: blackPlayer.rating,
      timeControl: newRoomState.timeControl,
      increment: newRoomState.increment,
      roomCode: newRoomCode
    });

    io.to(blackPlayer.socketId).emit('game-start', {
      color: 'b',
      opponentName: whitePlayer.username,
      opponentRating: whitePlayer.rating,
      timeControl: newRoomState.timeControl,
      increment: newRoomState.increment,
      roomCode: newRoomCode
    });

    console.log(`[Rematch] Fresh game room created: ${newRoomCode}`);
  });

  socket.on('chat-message', ({ roomCode, text, senderName }) => {
    const message = { id: Date.now(), text, senderName, senderSocket: socket.id };
    io.to(roomCode).emit('chat-message-received', message);
  });

  // --- PUZZLE BATTLES EVENT HANDLERS ---
  socket.on('join-puzzle-queue', ({ userId, username, rating }) => {
    removePlayerFromPuzzleQueue(socket.id);
    handlePuzzlePlayerDisconnect(socket.id);

    puzzleQueue.push({
      socketId: socket.id,
      userId,
      username,
      rating,
      joinedAt: Date.now()
    });
    console.log(`[Puzzle Sockets] Enqueued puzzle player ${username} (${rating} ELO)`);
    socket.emit('puzzle-queue-joined');
  });

  socket.on('leave-puzzle-queue', () => {
    removePlayerFromPuzzleQueue(socket.id);
    socket.emit('puzzle-queue-left');
  });

  socket.on('puzzle-solved', ({ roomCode, score, puzzleIndex }) => {
    const active = activePuzzlePlayers.get(socket.id);
    if (!active || active.roomCode !== roomCode) return;

    const room = puzzleRooms.get(roomCode);
    if (!room || room.status !== 'playing') return;

    const player = room.players[active.playerIndex];
    player.score = score;
    player.puzzleIndex = puzzleIndex;

    // Relay opponent progress
    const opponent = room.players[active.playerIndex === 0 ? 1 : 0];
    io.to(opponent.socketId).emit('puzzle-opponent-progress', {
      score,
      puzzleIndex,
      wrongAttempts: player.wrongAttempts
    });

    // Check if player solved all 15 puzzles!
    if (score >= 15) {
      endPuzzleBattle(room, 'all-solved');
    }
  });

  socket.on('puzzle-failed', ({ roomCode, puzzleIndex }) => {
    const active = activePuzzlePlayers.get(socket.id);
    if (!active || active.roomCode !== roomCode) return;

    const room = puzzleRooms.get(roomCode);
    if (!room || room.status !== 'playing') return;

    const player = room.players[active.playerIndex];
    player.wrongAttempts += 1;
    player.puzzleIndex = puzzleIndex;

    // Relay opponent progress
    const opponent = room.players[active.playerIndex === 0 ? 1 : 0];
    io.to(opponent.socketId).emit('puzzle-opponent-progress', {
      score: player.score,
      puzzleIndex,
      wrongAttempts: player.wrongAttempts
    });
  });

  socket.on('leave-puzzle-battle', ({ roomCode }) => {
    const room = puzzleRooms.get(roomCode);
    if (room && room.status === 'playing') {
      endPuzzleBattle(room, 'opponent-left', socket.id);
    }
  });

  // Client disconnects
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    removeFromQueue(socket.id);
    handleSocketCleanup(socket.id);
    
    // Puzzle Battle Cleanups
    removePlayerFromPuzzleQueue(socket.id);
    handlePuzzlePlayerDisconnect(socket.id);
  });
});

// Helper: Remove player from puzzle queue
function removePlayerFromPuzzleQueue(socketId: string) {
  const index = puzzleQueue.findIndex(p => p.socketId === socketId);
  if (index !== -1) {
    puzzleQueue.splice(index, 1);
    console.log(`[Puzzle Sockets] Removed socket from puzzle queue: ${socketId}`);
  }
}

// Helper: Handle puzzle battle player disconnection
function handlePuzzlePlayerDisconnect(socketId: string) {
  const active = activePuzzlePlayers.get(socketId);
  if (!active) return;

  const room = puzzleRooms.get(active.roomCode);
  if (room && room.status === 'playing') {
    endPuzzleBattle(room, 'opponent-left', socketId);
  }
}

// Helper: Remove player from queue
function removeFromQueue(socketId: string) {
  const index = queue.findIndex(p => p.socketId === socketId);
  if (index !== -1) {
    queue.splice(index, 1);
    console.log(`[Matchmaker] Removed socket from queue: ${socketId}`);
  }
}

// Helper: Handle disconnection timer (30s forfeit grace period)
function handleSocketCleanup(socketId: string) {
  const player = activePlayers.get(socketId);
  if (!player) return;

  const room = rooms.get(player.roomCode);
  if (!room) return;

  room.inactivePlayer = player.color;
  console.log(`[Reconnection] Player ${player.color === 'w' ? room.white.username : room.black.username} left. 30s countdown started.`);

  // Send warnings to active opponent
  if (player.opponentSocketId) {
    io.to(player.opponentSocketId).emit('opponent-disconnected', { secondsToReconnect: 30 });
  }

  // Set 30s timeout
  room.disconnectTimeout = setTimeout(() => {
    console.log(`[Reconnection] Disconnect timeout elapsed for room ${room.code}.`);
    const winnerColor = player.color === 'w' ? 'b' : 'w';
    resolveGameOver(room, 'loss', 'disconnect-timeout', winnerColor);
  }, 30000);

  activePlayers.delete(socketId);
}

// Helper: Determine rating time control categories
function getRatingCategory(seconds: number): string {
  if (seconds <= 60) return 'bullet';
  if (seconds <= 300) return 'blitz';
  if (seconds <= 1800) return 'rapid';
  return 'classical';
}

// Helper: Generate unique 6-character room codes
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

// Helper: Construct standard algebraic PGN block
function buildPgn(room: RoomState, result: string, reason: string): string {
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '.');
  const resultStr = result === 'draw' ? '1/2-1/2' : room.inactivePlayer ? (room.inactivePlayer === 'w' ? '0-1' : '1-0') : (result === 'win' ? '1-0' : '0-1');

  let pgn = `[Event "ChessMaster Pro Online Match"]\n`;
  pgn += `[Site "ChessMaster Pro Arena"]\n`;
  pgn += `[Date "${dateStr}"]\n`;
  pgn += `[White "${room.white.username}"]\n`;
  pgn += `[Black "${room.black.username}"]\n`;
  pgn += `[Result "${resultStr}"]\n`;
  pgn += `[TimeControl "${room.timeControl / 60}+${room.increment}"]\n`;
  pgn += `[Termination "${reason}"]\n\n`;

  // Parse moves paired
  let moveNum = 1;
  for (let i = 0; i < room.history.length; i += 2) {
    const whiteMove = room.history[i]?.san || '';
    const blackMove = room.history[i + 1]?.san || '';
    pgn += `${moveNum}. ${whiteMove} ${blackMove} `;
    moveNum++;
  }

  pgn += `${resultStr}`;
  return pgn;
}

// Basic REST Healthcheck
app.get('/', (req, res) => {
  res.send('ChessMaster Pro TS Socket.io server running.');
});

httpServer.listen(PORT, () => {
  console.log(`[Express] HTTP/Websocket server listening on port ${PORT}`);
});
