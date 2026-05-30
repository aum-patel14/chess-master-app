import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.send({ status: 'ok', onlinePlayers: io.engine.clientsCount });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins for simple connection
    methods: ['GET', 'POST'],
  }
});

// Active game rooms map
// Room structure:
// {
//   code: string,
//   timeControl: number, // minutes
//   players: [ { id: string, socketId: string, name: string, rating: number, color: 'w' | 'b' } ],
//   fen: string,
//   history: Array,
//   disconnectTimeout: TimeoutId
// }
const rooms = new Map();

// Matchmaking queues mapped by timeControl (minutes)
// e.g. { '10': [player1, player2...] }
const queues = new Map();

// Helper to generate unique room code
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

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  let currentRoomCode = null;
  let playerDetails = { name: 'Guest', rating: 1200 };

  // Matchmaking: Join Queue
  socket.on('join-queue', ({ timeControl, name, rating }) => {
    playerDetails = { name: name || 'Guest', rating: rating || 1200 };
    const tcStr = String(timeControl || 'unlimited');
    
    console.log(`Player ${playerDetails.name} (${playerDetails.rating}) joined queue for ${tcStr}m`);

    if (!queues.has(tcStr)) {
      queues.set(tcStr, []);
    }
    const queue = queues.get(tcStr);

    // Remove if already in queue
    const filteredQueue = queue.filter(p => p.socketId !== socket.id);
    filteredQueue.push({ socketId: socket.id, name: playerDetails.name, rating: playerDetails.rating });
    queues.set(tcStr, filteredQueue);

    // Check if we can pair
    if (filteredQueue.length >= 2) {
      const p1 = filteredQueue.shift();
      const p2 = filteredQueue.shift();
      queues.set(tcStr, filteredQueue);

      const code = generateRoomCode();
      const p1Color = Math.random() > 0.5 ? 'w' : 'b';
      const p2Color = p1Color === 'w' ? 'b' : 'w';

      const newRoom = {
        code,
        timeControl,
        players: [
          { id: p1.socketId, socketId: p1.socketId, name: p1.name, rating: p1.rating, color: p1Color },
          { id: p2.socketId, socketId: p2.socketId, name: p2.name, rating: p2.rating, color: p2Color }
        ],
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        history: [],
        disconnectTimeout: null
      };

      rooms.set(code, newRoom);

      // Join sockets to room
      const s1 = io.sockets.sockets.get(p1.socketId);
      const s2 = io.sockets.sockets.get(p2.socketId);
      if (s1) s1.join(code);
      if (s2) s2.join(code);

      // Notify clients
      io.to(p1.socketId).emit('game-start', {
        roomCode: code,
        color: p1Color,
        opponentName: p2.name,
        opponentRating: p2.rating,
        fen: newRoom.fen,
        timeControl
      });

      io.to(p2.socketId).emit('game-start', {
        roomCode: code,
        color: p2Color,
        opponentName: p1.name,
        opponentRating: p1.rating,
        fen: newRoom.fen,
        timeControl
      });

      console.log(`Game started in room ${code} between ${p1.name} and ${p2.name}`);
    }
  });

  // Custom Room: Create
  socket.on('create-room', ({ timeControl, name, rating }) => {
    playerDetails = { name: name || 'Guest', rating: rating || 1200 };
    const code = generateRoomCode();
    
    const newRoom = {
      code,
      timeControl,
      players: [
        { id: socket.id, socketId: socket.id, name: playerDetails.name, rating: playerDetails.rating, color: 'w' }
      ],
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      history: [],
      disconnectTimeout: null
    };

    rooms.set(code, newRoom);
    socket.join(code);
    currentRoomCode = code;

    socket.emit('room-created', { roomCode: code });
    console.log(`Room created: ${code} by ${playerDetails.name}`);
  });

  // Custom Room: Join
  socket.on('join-room', ({ roomCode, name, rating }) => {
    playerDetails = { name: name || 'Guest', rating: rating || 1200 };
    const room = rooms.get(roomCode?.toUpperCase());

    if (!room) {
      socket.emit('error-msg', { message: 'Room not found.' });
      return;
    }

    // Check if player is reconnecting
    const existingPlayer = room.players.find(p => p.name === playerDetails.name);
    
    if (existingPlayer) {
      // Reconnect flow
      console.log(`Player ${playerDetails.name} is reconnecting to room ${roomCode}`);
      existingPlayer.socketId = socket.id;
      existingPlayer.id = socket.id;
      socket.join(roomCode);
      currentRoomCode = roomCode;

      // Cancel disconnection timeout
      if (room.disconnectTimeout) {
        clearTimeout(room.disconnectTimeout);
        room.disconnectTimeout = null;
      }

      // Notify reconnect
      socket.to(roomCode).emit('opponent-reconnected', { socketId: socket.id });
      
      // Resend state to reconnecting player
      const opponent = room.players.find(p => p.socketId !== socket.id);
      socket.emit('game-start', {
        roomCode,
        color: existingPlayer.color,
        opponentName: opponent ? opponent.name : 'Opponent',
        opponentRating: opponent ? opponent.rating : 1200,
        fen: room.fen,
        timeControl: room.timeControl,
        history: room.history
      });
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('error-msg', { message: 'Room is full.' });
      return;
    }

    // Join as player 2 (black)
    const p1 = room.players[0];
    const newPlayer = { id: socket.id, socketId: socket.id, name: playerDetails.name, rating: playerDetails.rating, color: 'b' };
    room.players.push(newPlayer);
    
    socket.join(roomCode);
    currentRoomCode = roomCode;

    // Start game
    io.to(p1.socketId).emit('game-start', {
      roomCode,
      color: p1.color,
      opponentName: newPlayer.name,
      opponentRating: newPlayer.rating,
      fen: room.fen,
      timeControl: room.timeControl
    });

    socket.emit('game-start', {
      roomCode,
      color: newPlayer.color,
      opponentName: p1.name,
      opponentRating: p1.rating,
      fen: room.fen,
      timeControl: room.timeControl
    });

    console.log(`Player ${playerDetails.name} joined room ${roomCode}. Game started.`);
  });

  // Game Logic: Move broadcast
  socket.on('make-move', ({ from, to, promotion, fen, san }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    room.fen = fen;
    room.history.push({ from, to, promotion, san });

    // Send move to opponent
    socket.to(currentRoomCode).emit('move-made', { from, to, promotion, fen, san });
  });

  // In-Game Logic: Resignation
  socket.on('resign', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const resigningPlayer = room.players.find(p => p.socketId === socket.id);
    const winner = room.players.find(p => p.socketId !== socket.id);
    if (!resigningPlayer || !winner) return;

    io.to(currentRoomCode).emit('game-over', {
      result: winner.color === 'w' ? 'win_white' : 'win_black',
      reason: `${resigningPlayer.name} resigned.`,
      winnerName: winner.name
    });

    rooms.delete(currentRoomCode);
  });

  // In-Game Logic: Draw offer & accept
  socket.on('offer-draw', () => {
    if (currentRoomCode) {
      socket.to(currentRoomCode).emit('draw-offered');
    }
  });

  socket.on('accept-draw', () => {
    if (!currentRoomCode) return;
    io.to(currentRoomCode).emit('game-over', {
      result: 'draw',
      reason: 'Draw by mutual agreement.'
    });
    rooms.delete(currentRoomCode);
  });

  // Chat message broadcast
  socket.on('chat-message', ({ message }) => {
    if (currentRoomCode) {
      socket.to(currentRoomCode).emit('chat-message', {
        sender: playerDetails.name,
        message
      });
    }
  });

  // Matchmaking: Leave Queue
  socket.on('leave-queue', ({ timeControl }) => {
    const tcStr = String(timeControl || 'unlimited');
    if (queues.has(tcStr)) {
      const queue = queues.get(tcStr);
      queues.set(tcStr, queue.filter(p => p.socketId !== socket.id));
      console.log(`Player ${playerDetails.name} left queue for ${tcStr}m`);
    }
  });

  // Disconnection handler
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);

    // Remove from queues
    for (const [tc, queue] of queues.entries()) {
      queues.set(tc, queue.filter(p => p.socketId !== socket.id));
    }

    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        const remainingPlayer = room.players.find(p => p.socketId !== socket.id);
        const disconnectedPlayer = room.players.find(p => p.socketId === socket.id);

        if (remainingPlayer && disconnectedPlayer) {
          console.log(`Opponent ${disconnectedPlayer.name} disconnected from room ${currentRoomCode}. Starting 30s countdown.`);
          
          // Alert remaining player
          socket.to(currentRoomCode).emit('opponent-disconnected', {
            secondsToReconnect: 30
          });

          // Set 30 second timer
          room.disconnectTimeout = setTimeout(() => {
            console.log(`Player ${disconnectedPlayer.name} failed to reconnect to room ${currentRoomCode}. Opponent wins.`);
            
            io.to(remainingPlayer.socketId).emit('game-over', {
              result: remainingPlayer.color === 'w' ? 'win_white' : 'win_black',
              reason: `${disconnectedPlayer.name} disconnected.`,
              winnerName: remainingPlayer.name
            });

            rooms.delete(currentRoomCode);
          }, 30000);
        } else {
          // No players left, clean up
          rooms.delete(currentRoomCode);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`ChessMaster Pro server listening on port ${PORT}`);
});
