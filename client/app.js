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

  // Format Time (e.g., 10:42 AM)
  function formatTime(isoString) {
    const date = isoString ? new Date(isoString) : new Date();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

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
      // Re-join room if reconnected
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

    // Listen for room join confirmation
    state.socket.on('joined_success', (data) => {
      state.room = data.room;
      state.username = data.username;
      headerRoomName.textContent = data.room;
      welcomeRoomName.textContent = data.room;
      joinScreen.classList.add('hidden');
      chatScreen.classList.remove('hidden');
      messageInput.focus();
    });

    // Listen for incoming messages
    state.socket.on('new_message', (msg) => {
      renderMessage(msg);
    });

    // Listen for system messages
    state.socket.on('system_message', (data) => {
      renderSystemMessage(data);
    });

    // Listen for updated user list
    state.socket.on('room_users', (data) => {
      state.activeUsers = data.users || [];
      activeUserCount.textContent = state.activeUsers.length;
      renderUsersList(state.activeUsers);
    });

    // Listen for typing indicator
    state.socket.on('user_typing', ({ username, isTyping }) => {
      if (isTyping) {
        typingText.textContent = `${username} is typing...`;
        typingIndicator.classList.remove('hidden');
      } else {
        typingIndicator.classList.add('hidden');
      }
    });
  }

  // Parse Text: Separate Normal Chat from Code Blocks
  function parseContent(rawText) {
    // Regex matches: ```optional_lang\n code \n```
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(rawText)) !== null) {
      // Push text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: rawText.substring(lastIndex, match.index)
        });
      }

      // Push code block
      parts.push({
        type: 'code',
        lang: match[1].trim() || 'code',
        code: match[2].replace(/\n$/, '') // Remove trailing newline
      });

      lastIndex = match.index + match[0].length;
    }

    // Push remaining text
    if (lastIndex < rawText.length) {
      parts.push({
        type: 'text',
        content: rawText.substring(lastIndex)
      });
    }

    return parts;
  }

  // Render a Code Block inside a distinct secondary box with Highlight.js
  function createCodeBlockElement(lang, codeText) {
    const container = document.createElement('div');
    container.className = 'code-container';

    const header = document.createElement('div');
    header.className = 'code-container-header';

    const langLabel = document.createElement('span');
    langLabel.className = 'code-lang-label';
    langLabel.textContent = lang || 'code';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-code-btn';
    copyBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span>Copy</span>
    `;

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(codeText);
        copyBtn.classList.add('copied');
        copyBtn.querySelector('span').textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyBtn.querySelector('span').textContent = 'Copy';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy code: ', err);
      }
    });

    header.appendChild(langLabel);
    header.appendChild(copyBtn);

    const pre = document.createElement('pre');
    const code = document.createElement('code');

    // Apply syntax highlighting using Highlight.js
    if (lang && window.hljs && hljs.getLanguage(lang)) {
      try {
        code.innerHTML = hljs.highlight(codeText, { language: lang }).value;
      } catch (e) {
        code.textContent = codeText;
      }
    } else if (window.hljs) {
      // Auto-detect language
      try {
        code.innerHTML = hljs.highlightAuto(codeText).value;
      } catch (e) {
        code.textContent = codeText;
      }
    } else {
      code.textContent = codeText;
    }

    pre.appendChild(code);
    container.appendChild(header);
    container.appendChild(pre);

    return container;
  }

  // Format regular text (handle newlines and inline `code`)
  function formatTextMessage(text) {
    let escaped = escapeHtml(text);
    escaped = escaped.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    escaped = escaped.replace(/\n/g, '<br>');

    const span = document.createElement('span');
    span.innerHTML = escaped;
    return span;
  }

  // Render a new chat message
  function renderMessage(msg) {
    const isMe = msg.sender === state.username;
    const messageEntry = document.createElement('div');
    messageEntry.className = 'message-entry';

    // Meta row (Sender + Timestamp)
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

    // Content container
    const contentBox = document.createElement('div');
    contentBox.className = 'message-content';

    const parsedParts = parseContent(msg.text);
    parsedParts.forEach(part => {
      if (part.type === 'text') {
        contentBox.appendChild(formatTextMessage(part.content));
      } else if (part.type === 'code') {
        contentBox.appendChild(createCodeBlockElement(part.lang, part.code));
      }
    });

    messageEntry.appendChild(contentBox);
    chatMessages.appendChild(messageEntry);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Render System Notification
  function renderSystemMessage(data) {
    const div = document.createElement('div');
    div.className = 'system-entry';
    div.textContent = `${data.text} — ${formatTime(data.timestamp)}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Render Users in Room Sidebar
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

  // Auto-resize textarea
  function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + 'px';
  }

  // Event Listeners
  function setupEventListeners() {
    // Join Room
    joinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = usernameInput.value.trim();
      const room = (roomInput.value.trim() || 'general').toLowerCase();

      if (!username) return;

      state.username = username;
      state.room = room;

      if (!state.socket || !state.socket.connected) {
        const serverUrl = window.COUT_CONFIG.getServerUrl();
        initSocket(serverUrl);
      }

      state.socket.emit('join_room', { username, room });
    });

    // Send Message
    messageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = messageInput.value.trim();
      if (!text || !state.socket) return;

      state.socket.emit('send_message', {
        room: state.room,
        text: text
      });

      messageInput.value = '';
      autoResizeTextarea();

      // Clear typing state
      state.socket.emit('typing', { room: state.room, isTyping: false });
      state.isTyping = false;
    });

    // Handle Enter vs Shift+Enter
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        messageForm.dispatchEvent(new Event('submit'));
      }
    });

    // Typing Indicator with Debounce
    messageInput.addEventListener('input', () => {
      autoResizeTextarea();

      if (!state.socket) return;

      if (!state.isTyping) {
        state.isTyping = true;
        state.socket.emit('typing', { room: state.room, isTyping: true });
      }

      clearTimeout(state.typingTimer);
      state.typingTimer = setTimeout(() => {
        state.isTyping = false;
        state.socket.emit('typing', { room: state.room, isTyping: false });
      }, 1500);
    });

    // Toggle Active Users Sidebar
    usersToggleBtn.addEventListener('click', () => {
      usersSidebar.classList.toggle('hidden');
    });

    closeUsersSidebar.addEventListener('click', () => {
      usersSidebar.classList.add('hidden');
    });

    // Leave Room
    leaveRoomBtn.addEventListener('click', () => {
      if (confirm('Leave current room and return to lobby?')) {
        if (state.socket) {
          state.socket.emit('leave_room');
        }
        chatScreen.classList.add('hidden');
        joinScreen.classList.remove('hidden');
        usersSidebar.classList.add('hidden');
        chatMessages.innerHTML = '';
      }
    });

    // Server Settings Toggle
    serverSettingsToggle.addEventListener('click', () => {
      serverSettingsBox.classList.toggle('hidden');
      if (!serverSettingsBox.classList.contains('hidden')) {
        customServerInput.value = localStorage.getItem('cout_custom_server') || '';
      }
    });

    // Save Custom Server
    saveServerBtn.addEventListener('click', () => {
      const url = customServerInput.value.trim();
      if (url) {
        localStorage.setItem('cout_custom_server', url);
        alert(`Server URL saved: ${url}\nReconnecting...`);
      } else {
        localStorage.removeItem('cout_custom_server');
        alert('Server URL reset to default.');
      }
      initSocket(window.COUT_CONFIG.getServerUrl());
    });
  }

  // Bootstrap
  function start() {
    setupEventListeners();
    const serverUrl = window.COUT_CONFIG.getServerUrl();
    initSocket(serverUrl);
  }

  document.addEventListener('DOMContentLoaded', start);
})();
