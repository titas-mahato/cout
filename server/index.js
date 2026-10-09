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

  const mem = process.memoryUsage();
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    memory: {
      rssMb: Number((mem.rss / 1024 / 1024).toFixed(2)),
      heapUsedMb: Number((mem.heapUsed / 1024 / 1024).toFixed(2))
    },
    activeRooms: rooms.size,
    activeUsers: totalUsers
  });
});

// Lightweight keep-alive ping route (for UptimeRobot / cron pings)
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Room state storage: roomName -> Map(socketId -> { username, joinedAt })
const rooms = new Map();
// Socket ID to current room lookup
const socketRoomMap = new Map();
// Message ownership cache: messageId -> { sender, socketId, room }
const recentMessages = new Map();

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
  socket.on('send_message', ({ room, text, username, replyTo }) => {
    const rawRoom = socketRoomMap.get(socket.id) || room || 'general';
    const cleanRoom = String(rawRoom).trim().toLowerCase().slice(0, 30);
    if (!cleanRoom) return;

    if (!text || typeof text !== 'string' || !text.trim()) return;

    // Ensure room exists in state
    if (!rooms.has(cleanRoom)) {
      rooms.set(cleanRoom, new Map());
    }

    const roomUsers = rooms.get(cleanRoom);
    let senderName = roomUsers.get(socket.id)?.username;

    // Auto-heal membership if socket reconnected without full join cycle
    if (!senderName) {
      senderName = (username || '').trim().slice(0, 30) || 'Anonymous';
      roomUsers.set(socket.id, {
        username: senderName,
        joinedAt: Date.now()
      });
      socketRoomMap.set(socket.id, cleanRoom);
      socket.join(cleanRoom);

      // Broadcast updated member list so room is synchronized
      io.to(cleanRoom).emit('room_users', {
        room: cleanRoom,
        users: getRoomUsers(cleanRoom)
      });
    }

    let cleanReplyTo = null;
    if (replyTo && typeof replyTo === 'object') {
      cleanReplyTo = {
        id: String(replyTo.id || ''),
        sender: String(replyTo.sender || '').trim().slice(0, 30),
        text: String(replyTo.text || '').trim().slice(0, 300)
      };
    }

    const messageData = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      sender: senderName,
      text: text.slice(0, 8000), // Protect against overly long payloads
      room: cleanRoom,
      timestamp: new Date().toISOString(),
      replyTo: cleanReplyTo
    };

    io.to(cleanRoom).emit('new_message', messageData);

    // Track message ownership for authorization
    recentMessages.set(messageData.id, {
      sender: senderName,
      socketId: socket.id,
      room: cleanRoom
    });
    if (recentMessages.size > 2000) {
      const oldestKey = recentMessages.keys().next().value;
      recentMessages.delete(oldestKey);
    }
  });

  // Handle message deletion
  socket.on('delete_message', ({ messageId, room }) => {
    const rawRoom = socketRoomMap.get(socket.id) || room || 'general';
    const cleanRoom = String(rawRoom).trim().toLowerCase().slice(0, 30);
    if (!cleanRoom || !messageId) return;

    const cleanMessageId = String(messageId).trim();
    if (!cleanMessageId) return;

    // Check message ownership if tracked
    const msgInfo = recentMessages.get(cleanMessageId);
    if (msgInfo) {
      const userObj = rooms.get(cleanRoom)?.get(socket.id);
      const requesterName = userObj?.username;
      // Allow deletion only if sender socket matches or username matches
      if (msgInfo.socketId !== socket.id && msgInfo.sender !== requesterName) {
        console.warn(`[Delete Denied] Unauthorized delete attempt for ${cleanMessageId} by ${requesterName || socket.id}`);
        return;
      }
      recentMessages.delete(cleanMessageId);
    }

    console.log(`[Delete] Message ${cleanMessageId} deleted in #${cleanRoom}`);
    io.to(cleanRoom).emit('message_deleted', {
      messageId: cleanMessageId,
      room: cleanRoom
    });
  });

  // Handle typing indicator
  socket.on('typing', ({ room, isTyping }) => {
    const rawRoom = socketRoomMap.get(socket.id) || room || 'general';
    const cleanRoom = String(rawRoom).trim().toLowerCase().slice(0, 30);
    if (!cleanRoom || !rooms.has(cleanRoom)) return;

    const userObj = rooms.get(cleanRoom)?.get(socket.id);
    const username = userObj?.username || 'Someone';

    socket.to(cleanRoom).emit('user_typing', {
      username: username,
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
