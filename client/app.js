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

  const usersToggleBtn = document.getElementById('users-toggle-btn');
  const usersSidebar = document.getElementById('users-sidebar');
  const closeUsersSidebar = document.getElementById('close-users-sidebar');
  const usersList = document.getElementById('users-list');

  const chatMessages = document.getElementById('chat-messages');
  const typingIndicator = document.getElementById('typing-indicator');
  const typingText = typingIndicator.querySelector('.typing-text');

  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');
  const leaveRoomBtn = document.getElementById('leave-room-btn');

  // Palette of subtle, readable colors for handles
  const USER_COLORS = [
    '#58a6ff', '#7ee787', '#f2cc60', '#ff7b72', 
    '#bc8cff', '#56d364', '#e3b341', '#388bfd'
  ];

  function getUsernameColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % USER_COLORS.length;
    return USER_COLORS[index];
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTime(isoString) {
    const date = isoString ? new Date(isoString) : new Date();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

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
      messageInput.focus();
    });

    state.socket.on('new_message', (msg) => {
      renderMessage(msg);
    });

    state.socket.on('system_message', (data) => {
      renderSystemMessage(data);
    });

    state.socket.on('room_users', (data) => {
      state.activeUsers = data.users || [];
      activeUserCount.textContent = state.activeUsers.length;
      renderUsersList(state.activeUsers);
    });

    state.socket.on('user_typing', ({ username, isTyping }) => {
      if (isTyping) {
        typingText.textContent = `${username} is typing...`;
        typingIndicator.classList.remove('hidden');
      } else {
        typingIndicator.classList.add('hidden');
      }
    });
  }

  function renderMessage(msg) {
    const isMe = msg.sender === state.username;
    const messageEntry = document.createElement('div');
    messageEntry.className = 'message-entry';

    const meta = document.createElement('div');
    meta.className = 'message-meta';

    const sender = document.createElement('span');
    sender.className = 'message-sender';
    sender.textContent = msg.sender + (isMe ? ' (You)' : '');
    sender.style.color = getUsernameColor(msg.sender);

    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = formatTime(msg.timestamp);

    meta.appendChild(sender);
    meta.appendChild(time);
    messageEntry.appendChild(meta);

    const contentBox = document.createElement('div');
    contentBox.className = 'message-content';
    contentBox.innerHTML = escapeHtml(msg.text).replace(/\n/g, '<br>');
    messageEntry.appendChild(contentBox);

    chatMessages.appendChild(messageEntry);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function renderSystemMessage(data) {
    const div = document.createElement('div');
    div.className = 'system-entry';
    div.textContent = `${data.text} — ${formatTime(data.timestamp)}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function renderUsersList(users) {
    usersList.innerHTML = '';
    users.forEach(user => {
      const li = document.createElement('li');
      li.className = 'user-list-item';
      
      const dot = document.createElement('span');
      dot.className = 'user-avatar-dot';

      const name = document.createElement('span');
      name.textContent = user + (user === state.username ? ' (You)' : '');
      name.style.color = getUsernameColor(user);

      li.appendChild(dot);
      li.appendChild(name);
      usersList.appendChild(li);
    });
  }

  function setupEventListeners() {
    joinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = usernameInput.value.trim();
      const room = (roomInput.value.trim() || 'general').toLowerCase();
      if (!username) return;

      state.username = username;
      state.room = room;

      if (!state.socket || !state.socket.connected) {
        const serverUrl = window.COUT_CONFIG ? window.COUT_CONFIG.getServerUrl() : 'http://localhost:3000';
        initSocket(serverUrl);
      }
      state.socket.emit('join_room', { username, room });
    });

    messageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = messageInput.value.trim();
      if (!text || !state.socket) return;

      state.socket.emit('send_message', { room: state.room, text });
      messageInput.value = '';
      state.socket.emit('typing', { room: state.room, isTyping: false });
      state.isTyping = false;
    });

    usersToggleBtn.addEventListener('click', () => {
      usersSidebar.classList.toggle('hidden');
    });

    closeUsersSidebar.addEventListener('click', () => {
      usersSidebar.classList.add('hidden');
    });
  }

  function start() {
    setupEventListeners();
    const serverUrl = window.COUT_CONFIG ? window.COUT_CONFIG.getServerUrl() : 'http://localhost:3000';
    initSocket(serverUrl);
  }

  document.addEventListener('DOMContentLoaded', start);
})();
