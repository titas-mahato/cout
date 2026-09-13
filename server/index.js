const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// Enable CORS for Express
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));

// Setup Socket.io with permissive CORS for GitHub Pages & local testing
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve client directory statically when running locally
const clientPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientPath));

// Health check endpoint (for Render keep-alive & deployment verification)
app.get('/health', (req, res) => {
  let totalUsers = 0;
  rooms.forEach(users => {
    totalUsers += users.size;
  });

  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    activeRooms: rooms.size,
    activeUsers: totalUsers
  });
});

// Room state storage: roomName -> Map(socketId -> { username, joinedAt })
const rooms = new Map();
// Socket ID to current room lookup
const socketRoomMap = new Map();

function getRoomUsers(roomName) {
  if (!rooms.has(roomName)) return [];
  return Array.from(rooms.get(roomName).values()).map(u => u.username);
}

io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  // Handle joining a chat room
  socket.on('join_room', ({ username, room }) => {
    const cleanUsername = (username || '').trim().slice(0, 30) || 'Anonymous';
    const cleanRoom = (room || 'general').trim().toLowerCase().slice(0, 30);

    // Leave any previous room
    const prevRoom = socketRoomMap.get(socket.id);
    if (prevRoom && prevRoom !== cleanRoom) {
      leaveCurrentRoom(socket);
    }

    socket.join(cleanRoom);
    socketRoomMap.set(socket.id, cleanRoom);

    if (!rooms.has(cleanRoom)) {
      rooms.set(cleanRoom, new Map());
    }
    rooms.get(cleanRoom).set(socket.id, {
      username: cleanUsername,
      joinedAt: Date.now()
    });

    console.log(`[Room] ${cleanUsername} joined #${cleanRoom}`);

    // Confirm to sender
    socket.emit('joined_success', {
      room: cleanRoom,
      username: cleanUsername,
      users: getRoomUsers(cleanRoom)
    });

    // Notify others in room
    socket.to(cleanRoom).emit('system_message', {
      text: `${cleanUsername} joined #${cleanRoom}`,
      type: 'join',
      timestamp: new Date().toISOString()
    });

    // Broadcast updated user list to everyone in the room
    io.to(cleanRoom).emit('room_users', {
      room: cleanRoom,
      users: getRoomUsers(cleanRoom)
    });
  });

  // Handle chat messages
  socket.on('send_message', ({ room, text }) => {
    const currentRoom = socketRoomMap.get(socket.id) || room;
    if (!currentRoom || !rooms.has(currentRoom)) return;

    const userObj = rooms.get(currentRoom)?.get(socket.id);
    const username = userObj ? userObj.username : 'Anonymous';

    if (!text || typeof text !== 'string' || !text.trim()) return;

    const messageData = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      sender: username,
      text: text.slice(0, 8000), // Protect against overly long payloads
      room: currentRoom,
      timestamp: new Date().toISOString()
    };

    io.to(currentRoom).emit('new_message', messageData);
  });

  // Handle typing indicator
  socket.on('typing', ({ room, isTyping }) => {
    const currentRoom = socketRoomMap.get(socket.id) || room;
    if (!currentRoom || !rooms.has(currentRoom)) return;

    const userObj = rooms.get(currentRoom)?.get(socket.id);
    if (!userObj) return;

    socket.to(currentRoom).emit('user_typing', {
      username: userObj.username,
      isTyping: Boolean(isTyping)
    });
  });

  function leaveCurrentRoom(currSocket) {
    const room = socketRoomMap.get(currSocket.id);
    if (!room) return;

    const roomUsers = rooms.get(room);
    if (roomUsers && roomUsers.has(currSocket.id)) {
      const { username } = roomUsers.get(currSocket.id);
      roomUsers.delete(currSocket.id);

      currSocket.leave(room);
      socketRoomMap.delete(currSocket.id);

      console.log(`[-] ${username} left #${room}`);

      // Notify others in room
      io.to(room).emit('system_message', {
        text: `${username} left the room`,
        type: 'leave',
        timestamp: new Date().toISOString()
      });

      // Update remaining users or clean up empty room
      if (roomUsers.size === 0) {
        rooms.delete(room);
      } else {
        io.to(room).emit('room_users', {
          room,
          users: getRoomUsers(room)
        });
      }
    }
  }

  // Handle explicit leave
  socket.on('leave_room', () => {
    leaveCurrentRoom(socket);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`[-] Socket disconnected: ${socket.id}`);
    leaveCurrentRoom(socket);
  });
});

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` cout Chat Server running on port ${PORT}`);
  console.log(` Local preview: http://localhost:${PORT}`);
  console.log(` Health check:  http://localhost:${PORT}/health`);
  console.log(`=========================================`);
});
