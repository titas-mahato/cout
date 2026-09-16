// ==========================================================================
// cout Chat Client - Application Logic
// ==========================================================================

(() => {
  // Application State
  const state = {
    username: '',
    room: 'general',
    socket: null,
    activeUsers: [],
    typingTimer: null,
    isTyping: false
  };

  // DOM Elements
  const joinScreen = document.getElementById('join-screen');
  const chatScreen = document.getElementById('chat-screen');
  const joinForm = document.getElementById('join-form');
  const usernameInput = document.getElementById('username-input');
  const roomInput = document.getElementById('room-input');
  
  const serverSettingsToggle = document.getElementById('server-settings-toggle');
  const serverSettingsBox = document.getElementById('server-settings-box');
  const customServerInput = document.getElementById('custom-server-input');
  const saveServerBtn = document.getElementById('save-server-btn');

  const headerRoomName = document.getElementById('header-room-name');
  const welcomeRoomName = document.getElementById('welcome-room-name');
  const activeUserCount = document.getElementById('active-user-count');
  const connectionStatus = document.getElementById('connection-status');
  const statusText = connectionStatus.querySelector('.status-text');

  // Set Connection Status Pill
  function updateConnectionStatus(status) {
    connectionStatus.className = 'status-pill';
    if (status === 'connected') {
      connectionStatus.classList.add('status-connected');
      statusText.textContent = 'Connected';
    } else if (status === 'connecting') {
      connectionStatus.classList.add('status-connecting');
      statusText.textContent = 'Connecting...';
    } else {
      connectionStatus.classList.add('status-disconnected');
      statusText.textContent = 'Disconnected';
    }
  }

  // Initialize Socket Connection
  function initSocket(serverUrl) {
    if (state.socket) {
      state.socket.disconnect();
    }

    updateConnectionStatus('connecting');
    console.log(`Connecting to cout backend at: ${serverUrl}`);

    state.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    state.socket.on('connect', () => {
      console.log('Socket connected successfully');
      updateConnectionStatus('connected');
      if (state.username && state.room) {
        state.socket.emit('join_room', {
          username: state.username,
          room: state.room
        });
      }
    });

    state.socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
      updateConnectionStatus('disconnected');
    });

    state.socket.on('disconnect', () => {
      updateConnectionStatus('disconnected');
    });

    state.socket.on('joined_success', (data) => {
      state.room = data.room;
      state.username = data.username;
      headerRoomName.textContent = data.room;
      welcomeRoomName.textContent = data.room;
      joinScreen.classList.add('hidden');
      chatScreen.classList.remove('hidden');
    });
  }

  function start() {
    const serverUrl = window.COUT_CONFIG ? window.COUT_CONFIG.getServerUrl() : 'http://localhost:3000';
    initSocket(serverUrl);
  }

  document.addEventListener('DOMContentLoaded', start);
})();
