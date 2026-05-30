import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow connections from any origin for ease of use/deployment
    methods: ['GET', 'POST']
  }
});

// Server states
const activePlayers = new Map(); // socket.id => { name, rating, roomCode }
const queue = []; // Array of players waiting for Quick Match: { socket, name, rating, timeControl }
const rooms = new Map(); // roomCode => Room state

// Helper: Generate unique 6-character room code
function generateRoomCode() {
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

// Helper: End a game and notify players
function endGame(roomCode, result, reason, winnerColor = null) {
  const room = rooms.get(roomCode);
  if (!room) return;

  if (room.disconnectTimeout) {
    clearTimeout(room.disconnectTimeout);
  }

  const whiteSocket = io.sockets.sockets.get(room.white.socketId);
  const blackSocket = io.sockets.sockets.get(room.black?.socketId);

  const gameOverPayload = { result, reason, winnerColor };

  if (whiteSocket) whiteSocket.emit('game-over', gameOverPayload);
  if (blackSocket) blackSocket.emit('game-over', gameOverPayload);

  // Clean up references
  if (room.white) activePlayers.delete(room.white.socketId);
  if (room.black) activePlayers.delete(room.black.socketId);
  rooms.delete(roomCode);
  console.log(`Room ${roomCode} closed. Reason: ${reason}`);
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // ── 1. JOIN QUICK MATCH QUEUE ──
  socket.on('join-queue', ({ name, rating, timeControl }) => {
    // Clean up if already in queue or game
    removeFromQueue(socket.id);
    handlePlayerDisconnect(socket);

    const playerEntry = {
      socketId: socket.id,
      name: name || 'Guest Player',
      rating: rating || 1200,
      timeControl: timeControl || 600
    };

    // Try matchmaking with similar timeControl
    const opponentIndex = queue.findIndex(p => p.timeControl === playerEntry.timeControl);

    if (opponentIndex !== -1) {
      // Match found!
      const opponent = queue.splice(opponentIndex, 1)[0];
      const roomCode = generateRoomCode();
      const whiteIsFirst = Math.random() > 0.5;

      const roomState = {
        code: roomCode,
        timeControl: playerEntry.timeControl,
        white: whiteIsFirst ? playerEntry : opponent,
        black: whiteIsFirst ? opponent : playerEntry,
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        history: [],
        inactivePlayer: null,
        disconnectTimeout: null,
        chat: []
      };

      rooms.set(roomCode, roomState);

      // Register both in active game mapping
      activePlayers.set(roomState.white.socketId, { roomCode, color: 'w', opponentSocketId: roomState.black.socketId });
      activePlayers.set(roomState.black.socketId, { roomCode, color: 'b', opponentSocketId: roomState.white.socketId });

      // Join rooms
      const s1 = io.sockets.sockets.get(roomState.white.socketId);
      const s2 = io.sockets.sockets.get(roomState.black.socketId);
      if (s1) s1.join(roomCode);
      if (s2) s2.join(roomCode);

      // Notify clients
      io.to(roomState.white.socketId).emit('game-start', {
        color: 'w',
        opponentName: roomState.black.name,
        opponentRating: roomState.black.rating,
        timeControl: roomState.timeControl,
        roomCode
      });

      io.to(roomState.black.socketId).emit('game-start', {
        color: 'b',
        opponentName: roomState.white.name,
        opponentRating: roomState.white.rating,
        timeControl: roomState.timeControl,
        roomCode
      });

      console.log(`Matched Quickplay Room ${roomCode}: ${roomState.white.name} vs ${roomState.black.name}`);
    } else {
      // Add to queue
      queue.push(playerEntry);
      console.log(`Player queued: ${playerEntry.name} (${playerEntry.timeControl}s)`);
    }
  });

  // ── 2. CREATE PRIVATE FRIEND ROOM ──
  socket.on('create-room', ({ name, rating, timeControl }) => {
    handlePlayerDisconnect(socket);

    const roomCode = generateRoomCode();
    const playerEntry = {
      socketId: socket.id,
      name: name || 'Guest Player',
      rating: rating || 1200,
      timeControl: timeControl || 600
    };

    const roomState = {
      code: roomCode,
      timeControl: playerEntry.timeControl,
      white: playerEntry, // Creator plays White
      black: null,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      history: [],
      inactivePlayer: null,
      disconnectTimeout: null,
      chat: []
    };

    rooms.set(roomCode, roomState);
    activePlayers.set(socket.id, { roomCode, color: 'w', opponentSocketId: null });
    socket.join(roomCode);

    socket.emit('room-created', { roomCode, timeControl: playerEntry.timeControl });
    console.log(`Private Room Created: ${roomCode} by ${playerEntry.name}`);
  });

  // ── 3. JOIN PRIVATE FRIEND ROOM ──
  socket.on('join-room', ({ roomCode, name, rating }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('error-msg', 'Room not found. Check the code!');
      return;
    }
    if (room.black) {
      socket.emit('error-msg', 'This room is already full!');
      return;
    }

    const playerEntry = {
      socketId: socket.id,
      name: name || 'Guest Player',
      rating: rating || 1200,
      timeControl: room.timeControl
    };

    room.black = playerEntry;
    activePlayers.set(socket.id, { roomCode, color: 'b', opponentSocketId: room.white.socketId });
    
    // Update white's opponent hook mapping
    const whitePlayerEntry = activePlayers.get(room.white.socketId);
    if (whitePlayerEntry) whitePlayerEntry.opponentSocketId = socket.id;

    socket.join(roomCode);

    // Notify clients of game start
    io.to(room.white.socketId).emit('game-start', {
      color: 'w',
      opponentName: room.black.name,
      opponentRating: room.black.rating,
      timeControl: room.timeControl,
      roomCode
    });

    io.to(room.black.socketId).emit('game-start', {
      color: 'b',
      opponentName: room.white.name,
      opponentRating: room.white.rating,
      timeControl: room.timeControl,
      roomCode
    });

    console.log(`Player ${playerEntry.name} joined room ${roomCode}`);
  });

  // ── 4. RECONNECTION HANDLING ──
  socket.on('reconnect-game', ({ roomCode, color, name, rating }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('reconnect-failed', 'Game no longer exists.');
      return;
    }

    const isWhite = color === 'w';
    const activeUser = isWhite ? room.white : room.black;

    if (!activeUser || room.inactivePlayer !== color) {
      socket.emit('reconnect-failed', 'Reconnection mismatch.');
      return;
    }

    // Cancel the disconnection countdown
    if (room.disconnectTimeout) {
      clearTimeout(room.disconnectTimeout);
      room.disconnectTimeout = null;
      room.inactivePlayer = null;
    }

    // Update socket mapping
    activeUser.socketId = socket.id;
    activePlayers.set(socket.id, { roomCode, color, opponentSocketId: isWhite ? room.black?.socketId : room.white.socketId });
    socket.join(roomCode);

    // Update opponent's mapping as well
    const opponentSocket = isWhite ? room.black?.socketId : room.white.socketId;
    if (opponentSocket) {
      const oppMap = activePlayers.get(opponentSocket);
      if (oppMap) oppMap.opponentSocketId = socket.id;
      
      // Notify opponent of successful reconnect
      io.to(opponentSocket).emit('opponent-reconnected');
    }

    // Restore board state for returning user
    socket.emit('game-restored', {
      color,
      opponentName: isWhite ? room.black?.name : room.white.name,
      opponentRating: isWhite ? room.black?.rating : room.white.rating,
      fen: room.fen,
      history: room.history,
      timeControl: room.timeControl
    });

    console.log(`Player reconnected: ${name} in room ${roomCode}`);
  });

  // ── 5. MAKE MOVE RELAY ──
  socket.on('make-move', ({ from, to, promotion, fen, san }) => {
    const player = activePlayers.get(socket.id);
    if (!player) return;

    const room = rooms.get(player.roomCode);
    if (!room) return;

    // Record latest state in case of connection drops
    room.fen = fen;
    room.history.push({ from, to, promotion, san });

    // Send to other player
    if (player.opponentSocketId) {
      io.to(player.opponentSocketId).emit('move-made', { from, to, promotion, fen, san });
    }
  });

  // ── 6. DRAW OFFER & RESIGNATIONS ──
  socket.on('offer-draw', () => {
    const player = activePlayers.get(socket.id);
    if (player?.opponentSocketId) {
      io.to(player.opponentSocketId).emit('draw-offered');
    }
  });

  socket.on('accept-draw', () => {
    const player = activePlayers.get(socket.id);
    if (player) {
      endGame(player.roomCode, 'draw', 'agreement');
    }
  });

  socket.on('resign', () => {
    const player = activePlayers.get(socket.id);
    if (player) {
      const winnerColor = player.color === 'w' ? 'b' : 'w';
      endGame(player.roomCode, 'loss', 'resignation', winnerColor);
    }
  });

  // ── 7. CHAT MESSAGE ROUTER ──
  socket.on('chat-message', ({ text, senderName }) => {
    const player = activePlayers.get(socket.id);
    if (!player) return;

    const room = rooms.get(player.roomCode);
    if (!room) return;

    const message = { id: Date.now(), text, senderName, senderSocket: socket.id };
    room.chat.push(message);

    // Broadcast to room members
    io.to(player.roomCode).emit('chat-message-received', message);
  });

  // ── 8. SYSTEM LEAVE/DISCONNECTS ──
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    removeFromQueue(socket.id);
    handlePlayerDisconnect(socket);
  });
});

// Helper: Remove socket from Quick Match Queue
function removeFromQueue(socketId) {
  const index = queue.findIndex(p => p.socketId === socketId);
  if (index !== -1) {
    queue.splice(index, 1);
    console.log(`Removed from queue: ${socketId}`);
  }
}

// Helper: Handle drop-outs & reconnection timers
function handlePlayerDisconnect(socket) {
  const player = activePlayers.get(socket.id);
  if (!player) return;

  const room = rooms.get(player.roomCode);
  if (!room) return;

  const isWhite = player.color === 'w';

  // Mark player as inactive
  room.inactivePlayer = player.color;
  console.log(`Player ${isWhite ? room.white.name : room.black?.name} disconnected. starting 30s reconnect window.`);

  // Send warnings to remaining player (if present)
  if (player.opponentSocketId) {
    io.to(player.opponentSocketId).emit('opponent-disconnected', { secondsToReconnect: 30 });
  }

  // Set 30-second disconnect timeout
  room.disconnectTimeout = setTimeout(() => {
    console.log(`Reconnection timeout elapsed in room ${room.code}.`);
    const winnerColor = player.color === 'w' ? 'b' : 'w';
    endGame(room.code, 'win', 'disconnect-timeout', winnerColor);
  }, 30000);

  // Remove current socket association
  activePlayers.delete(socket.id);
}

app.get('/', (req, res) => {
  res.send('ChessMaster Pro Socket Server is running.');
});

httpServer.listen(PORT, () => {
  console.log(`Socket server is running on port ${PORT}`);
});
