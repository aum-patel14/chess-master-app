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
  ClientPlayer
} from './types.js';
import { calculateGlicko2Update } from './glicko2.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const httpServer = createServer(app);

// 1. SUPABASE SERVICE CLIENT (Bypasses RLS to write scores, ratings, and finished games)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    'CRITICAL: Supabase credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are missing in server environment variables!'
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

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

      // Update ratings inside Supabase public database
      await supabase
        .from('ratings')
        .update({
          rating: newWhiteGlicko.rating,
          rd: newWhiteGlicko.rd,
          volatility: newWhiteGlicko.volatility,
          games_played: room.white.rd === 350 ? 1 : 1 // Increment count will be done in query or trigger later, or manually
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

      // Increment games played
      await supabase.rpc('increment_games_played', { uid: room.white.id, tc: timeControlCategory });
      await supabase.rpc('increment_games_played', { uid: room.black.id, tc: timeControlCategory });

    } catch (err) {
      console.error('[Glicko Engine] Error calculating rating updates:', err);
    }
  }

  // Generate PGN
  const pgn = buildPgn(room, result, reason);

  try {
    // Save game record in Supabase
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
      // Fetch Glicko-2 ratings directly from Supabase
      const { data: ratingDetails } = await supabase
        .from('ratings')
        .select('rating, rd, volatility')
        .eq('user_id', userId)
        .eq('time_control', tcCategory)
        .single();

      const rating = ratingDetails?.rating ?? 1200;
      const rd = ratingDetails?.rd ?? 350;
      const volatility = ratingDetails?.volatility ?? 0.06;

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

  // Client disconnects
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    removeFromQueue(socket.id);
    handleSocketCleanup(socket.id);
  });
});

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
