(() => {
  // Application State
  const state = {
    username: '',
    room: 'general',
    socket: null,
    activeUsers: [],
    typingTimer: null,
    isTyping: false,
    soundEnabled: localStorage.getItem('cout_sound_enabled') !== 'false',
    replyingTo: null,
    lastMessageSender: null,
    lastMessageTime: 0
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

  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const soundIconOn = document.getElementById('sound-icon-on');
  const soundIconOff = document.getElementById('sound-icon-off');

  const chatMessages = document.getElementById('chat-messages');
  const typingIndicator = document.getElementById('typing-indicator');
  const typingText = typingIndicator.querySelector('.typing-text');

  const replyBanner = document.getElementById('reply-banner');
  const replyTargetUser = document.getElementById('reply-target-user');
  const replyTargetSnippet = document.getElementById('reply-target-snippet');
  const cancelReplyBtn = document.getElementById('cancel-reply-btn');

  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  const codeSnippetBtn = document.getElementById('code-snippet-btn');
  const codeLangPicker = document.getElementById('code-lang-picker');
  const closeLangPicker = document.getElementById('close-lang-picker');
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
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
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
      const joinBtn = document.getElementById('join-btn');
      if (joinBtn) {
        joinBtn.textContent = 'Enter Room';
        joinBtn.disabled = false;
      }
      state.room = data.room;
      state.username = data.username;
      state.lastMessageSender = null;
      state.lastMessageTime = 0;
      cancelReply();
      
      // Save active session so accidental page reload doesn't kick user out
      try {
        sessionStorage.setItem('cout_session', JSON.stringify({
          username: data.username,
          room: data.room
        }));
      } catch (e) {
        console.warn('Could not save session to sessionStorage', e);
      }

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

    // Listen for deleted messages (real-time DOM removal)
    state.socket.on('message_deleted', ({ messageId }) => {
      const el = document.querySelector(`[data-msg-id="${messageId}"]`);
      if (el) {
        if (state.replyingTo && state.replyingTo.id === messageId) {
          cancelReply();
        }
        el.remove();
        updateAllMessageGrouping();
      }
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

  // Play subtle audio chime for incoming messages from others
  function playMessageChime() {
    if (!state.soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5 note

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {
      // Audio autoplay blocked or not supported
    }
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

  // Truncate message for reply preview (10-12 words max followed by ...)
  function formatReplySnippet(text) {
    if (!text) return '';
    // Strip code fences or collapse whitespace for a clean one-line preview
    const clean = text.replace(/```[a-zA-Z0-9_+#.-]*\n?/gi, '').replace(/\n+/g, ' ').trim();
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length <= 12) {
      return clean;
    }
    return words.slice(0, 12).join(' ') + '...';
  }

  // Set active reply target
  function setReplyTarget(msg) {
    state.replyingTo = {
      id: msg.id,
      sender: msg.sender,
      text: msg.text
    };
    if (replyTargetUser) {
      replyTargetUser.textContent = '@' + msg.sender;
    }
    if (replyTargetSnippet) {
      replyTargetSnippet.textContent = '"' + formatReplySnippet(msg.text) + '"';
    }
    if (replyBanner) {
      replyBanner.classList.remove('hidden');
    }
    messageInput.focus();
  }

  // Cancel active reply target
  function cancelReply() {
    state.replyingTo = null;
    if (replyBanner) {
      replyBanner.classList.add('hidden');
    }
  }

  // Recalculate consecutive grouping for all messages in chat based on current DOM state
  function updateAllMessageGrouping() {
    const children = Array.from(chatMessages.children);
    let lastMsgSender = null;
    let lastMsgTime = 0;

    children.forEach((child) => {
      // Welcome banner or non-message element
      if (!child.classList.contains('message-entry')) {
        // System message breaks grouping
        if (child.classList.contains('system-entry')) {
          lastMsgSender = null;
          lastMsgTime = 0;
        }
        return;
      }

      const sender = child.getAttribute('data-sender');
      const time = parseInt(child.getAttribute('data-timestamp') || '0', 10);
      const isReply = child.querySelector('.reply-context') !== null;

      const isConsecutive = (
        Boolean(lastMsgSender) &&
        lastMsgSender === sender &&
        !isReply &&
        (time - lastMsgTime < 5 * 60 * 1000)
      );

      if (isConsecutive) {
        child.classList.add('consecutive');
      } else {
        child.classList.remove('consecutive');
      }

      lastMsgSender = sender;
      lastMsgTime = time;
    });

    state.lastMessageSender = lastMsgSender;
    state.lastMessageTime = lastMsgTime;
  }

  // Render a new chat message
  function renderMessage(msg) {
    const isMe = msg.sender === state.username;
    
    // Play subtle audio cue for incoming messages from others
    if (!isMe) {
      playMessageChime();
    }

    const messageEntry = document.createElement('div');
    messageEntry.className = 'message-entry';
    if (msg.id) {
      messageEntry.setAttribute('data-msg-id', msg.id);
    }
    messageEntry.setAttribute('data-sender', msg.sender);
    const msgTime = msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now();
    messageEntry.setAttribute('data-timestamp', String(msgTime));

    // 1. Discord-Style Reply Context & Curved Spine
    if (msg.replyTo) {
      const replyContext = document.createElement('div');
      replyContext.className = 'reply-context';
      replyContext.title = `Jump to message from ${msg.replyTo.sender}`;

      const spine = document.createElement('span');
      spine.className = 'reply-spine';
      spine.setAttribute('aria-hidden', 'true');

      const replyUser = document.createElement('span');
      replyUser.className = 'reply-user';
      replyUser.textContent = '@' + msg.replyTo.sender;

      const replyPreview = document.createElement('span');
      replyPreview.className = 'reply-content-preview';
      replyPreview.textContent = formatReplySnippet(msg.replyTo.text);

      replyContext.appendChild(spine);
      replyContext.appendChild(replyUser);
      replyContext.appendChild(replyPreview);

      // Smooth scroll & flash highlight on replied-to original message
      if (msg.replyTo.id) {
        replyContext.addEventListener('click', () => {
          const targetEl = document.querySelector(`[data-msg-id="${msg.replyTo.id}"]`);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetEl.classList.remove('reply-target-flash');
            void targetEl.offsetWidth; // Reflow for replay
            targetEl.classList.add('reply-target-flash');
          }
        });
      }

      messageEntry.appendChild(replyContext);
    }

    // 2. Meta row (Sender + Timestamp)
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

    // 3. Content container
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

    // 4. Floating Action Bar (Reply + Copy buttons)
    const actionsBar = document.createElement('div');
    actionsBar.className = 'message-actions';

    // Reply Button
    const replyBtn = document.createElement('button');
    replyBtn.type = 'button';
    replyBtn.className = 'btn-msg-action';
    replyBtn.title = 'Reply';
    replyBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 17 4 12 9 7"></polyline>
        <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
      </svg>
    `;
    replyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setReplyTarget(msg);
    });

    // Copy Button
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn-msg-action';
    copyBtn.title = 'Copy text';
    copyBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    `;
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(msg.text);
        copyBtn.classList.add('copied');
        copyBtn.title = 'Copied!';
        copyBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyBtn.title = 'Copy text';
          copyBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          `;
        }, 1500);
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    });

    actionsBar.appendChild(replyBtn);
    actionsBar.appendChild(copyBtn);

    // Delete Button (only on msgs sent by yourself, to the right of copy & reply)
    if (isMe) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-msg-action btn-msg-delete';
      deleteBtn.title = 'Delete message';
      deleteBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      `;
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Straight delete - no warning dialog as requested
        if (state.socket && msg.id) {
          state.socket.emit('delete_message', {
            messageId: msg.id,
            room: state.room
          });
        }
      });
      actionsBar.appendChild(deleteBtn);
    }

    messageEntry.appendChild(actionsBar);

    chatMessages.appendChild(messageEntry);
    updateAllMessageGrouping();

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Render System Notification
  function renderSystemMessage(data) {
    const div = document.createElement('div');
    div.className = 'system-entry';
    div.textContent = `${data.text} — ${formatTime(data.timestamp)}`;
    chatMessages.appendChild(div);
    updateAllMessageGrouping();
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
      const joinBtn = document.getElementById('join-btn');

      if (!username) return;

      state.username = username;
      state.room = room;

      if (!state.socket || !state.socket.connected) {
        if (joinBtn) {
          joinBtn.textContent = 'Waking up server... (takes ~15s)';
          joinBtn.disabled = true;
        }

        const serverUrl = window.COUT_CONFIG.getServerUrl();
        initSocket(serverUrl);

        state.socket.once('connect', () => {
          state.socket.emit('join_room', { username, room });
        });

        state.socket.once('connect_error', () => {
          if (joinBtn) {
            joinBtn.textContent = 'Enter Room';
            joinBtn.disabled = false;
          }
          alert('Backend server is waking up. Please wait ~15 seconds and click Enter Room again!');
        });
        return;
      }

      state.socket.emit('join_room', { username, room });
    });

    // Send Message function
    function sendMessage() {
      const text = messageInput.value.trim();
      if (!text) return;

      if (!state.socket || !state.socket.connected) {
        console.warn('Socket not connected while sending message.');
        if (state.socket) state.socket.connect();
        alert('Reconnecting to server... Please try again in 2 seconds.');
        return;
      }

      const payload = {
        room: state.room,
        username: state.username,
        text: text
      };

      if (state.replyingTo) {
        payload.replyTo = {
          id: state.replyingTo.id,
          sender: state.replyingTo.sender,
          text: state.replyingTo.text
        };
      }

      state.socket.emit('send_message', payload);

      cancelReply();

      messageInput.value = '';
      autoResizeTextarea();

      // Clear typing state
      state.socket.emit('typing', { room: state.room, isTyping: false });
      state.isTyping = false;
    }

    if (cancelReplyBtn) {
      cancelReplyBtn.addEventListener('click', () => {
        cancelReply();
        messageInput.focus();
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sendMessage();
      });
    }

    // Send Message via form submit (e.g. mobile virtual keyboard Go/Submit)
    messageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage();
    });

    // Handle Enter vs Shift+Enter
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Insert code block snippet (replaces existing language tag if already in a snippet without stacking)
    function insertCodeBlock(lang) {
      const input = messageInput;
      const val = input.value;
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const hasSelection = (start !== end);
      const trimmedVal = val.trim();
      const codeBlockRegex = /^```([a-zA-Z0-9_+#.-]*)\r?\n([\s\S]*?)(?:\r?\n)?```$/;

      if (hasSelection) {
        const selectedText = val.substring(start, end);
        const selTrimmed = selectedText.trim();
        const selMatch = selTrimmed.match(codeBlockRegex);

        if (selMatch) {
          // Selected text is already a code fence - swap language without stacking
          const innerCode = selMatch[2];
          const prefix = `\`\`\`${lang}\n`;
          const suffix = `\n\`\`\``;
          const replacement = prefix + innerCode + suffix;
          input.value = val.substring(0, start) + replacement + val.substring(end);
          const cursorPos = start + prefix.length + innerCode.length;
          input.focus();
          input.setSelectionRange(cursorPos, cursorPos);
        } else {
          // Sandwiches selected text and puts cursor right at the end of selection
          const prefix = `\`\`\`${lang}\n`;
          const suffix = `\n\`\`\``;
          const replacement = prefix + selectedText + suffix;

          input.value = val.substring(0, start) + replacement + val.substring(end);
          const cursorPos = start + prefix.length + selectedText.length;
          input.focus();
          input.setSelectionRange(cursorPos, cursorPos);
        }
      } else if (trimmedVal.length > 0) {
        const fullMatch = trimmedVal.match(codeBlockRegex);
        if (fullMatch) {
          // Entire input is already a code block - swap language tag without stacking
          const innerCode = fullMatch[2];
          const prefix = `\`\`\`${lang}\n`;
          const suffix = `\n\`\`\``;
          input.value = prefix + innerCode + suffix;

          // If there was code, place cursor at end of code; if empty, place cursor on middle line
          const cursorPos = innerCode.length > 0 ? (prefix.length + innerCode.length) : prefix.length;
          input.focus();
          input.setSelectionRange(cursorPos, cursorPos);
        } else {
          // Sandwiches existing message and puts cursor at the end of og message
          const prefix = `\`\`\`${lang}\n`;
          const suffix = `\n\`\`\``;
          input.value = prefix + val + suffix;

          const cursorPos = prefix.length + val.length;
          input.focus();
          input.setSelectionRange(cursorPos, cursorPos);
        }
      } else {
        // Empty textbox: inserts code fences and puts cursor on the blank line in between
        const prefix = `\`\`\`${lang}\n`;
        const suffix = `\n\`\`\``;
        input.value = prefix + suffix;

        const cursorPos = prefix.length;
        input.focus();
        input.setSelectionRange(cursorPos, cursorPos);
      }

      autoResizeTextarea();
    }

    // Toggle 4x3 Code Language Picker
    if (codeSnippetBtn && codeLangPicker) {
      codeSnippetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        codeLangPicker.classList.toggle('hidden');
        codeSnippetBtn.classList.toggle('active', !codeLangPicker.classList.contains('hidden'));
      });

      if (closeLangPicker) {
        closeLangPicker.addEventListener('click', () => {
          codeLangPicker.classList.add('hidden');
          codeSnippetBtn.classList.remove('active');
          messageInput.focus();
        });
      }

      // Close popover when clicking outside
      document.addEventListener('click', (e) => {
        if (!codeLangPicker.classList.contains('hidden')) {
          if (!codeLangPicker.contains(e.target) && e.target !== codeSnippetBtn && !codeSnippetBtn.contains(e.target)) {
            codeLangPicker.classList.add('hidden');
            codeSnippetBtn.classList.remove('active');
          }
        }
      });

      // Close popover or cancel reply on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (state.replyingTo) {
            cancelReply();
          }
          if (!codeLangPicker.classList.contains('hidden')) {
            codeLangPicker.classList.add('hidden');
            codeSnippetBtn.classList.remove('active');
            messageInput.focus();
          }
        }
      });

      // Handle language button clicks
      const langButtons = codeLangPicker.querySelectorAll('.lang-item-btn');
      langButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const lang = btn.getAttribute('data-lang') || 'code';
          insertCodeBlock(lang);
          codeLangPicker.classList.add('hidden');
          codeSnippetBtn.classList.remove('active');
        });
      });
    }

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
        try {
          sessionStorage.removeItem('cout_session');
        } catch (e) {}
        if (state.socket) {
          state.socket.emit('leave_room');
        }
        state.username = '';
        state.lastMessageSender = null;
        state.lastMessageTime = 0;
        cancelReply();
        chatScreen.classList.add('hidden');
        joinScreen.classList.remove('hidden');
        usersSidebar.classList.add('hidden');
        chatMessages.innerHTML = '';
      }
    });

    // Sound Toggle Controls
    function updateSoundUI() {
      if (soundToggleBtn && soundIconOn && soundIconOff) {
        if (state.soundEnabled) {
          soundIconOn.classList.remove('hidden');
          soundIconOff.classList.add('hidden');
          soundToggleBtn.title = 'Sound notifications: On (click to mute)';
        } else {
          soundIconOn.classList.add('hidden');
          soundIconOff.classList.remove('hidden');
          soundToggleBtn.title = 'Sound notifications: Muted (click to unmute)';
        }
      }
    }

    if (soundToggleBtn) {
      updateSoundUI();
      soundToggleBtn.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        localStorage.setItem('cout_sound_enabled', state.soundEnabled);
        updateSoundUI();
      });
    }

    // Copy Room Invite Link
    const copyRoomLinkBtn = document.getElementById('copy-room-link-btn');
    if (copyRoomLinkBtn) {
      copyRoomLinkBtn.addEventListener('click', async () => {
        const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(state.room)}`;
        try {
          await navigator.clipboard.writeText(inviteUrl);
          copyRoomLinkBtn.classList.add('copied');
          copyRoomLinkBtn.title = 'Invite link copied!';
          setTimeout(() => {
            copyRoomLinkBtn.classList.remove('copied');
            copyRoomLinkBtn.title = 'Copy invite link to this room';
          }, 2000);
        } catch (err) {
          console.error('Failed to copy room link:', err);
        }
      });
    }

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
    // Auto-fill room if URL has ?room=... parameter
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam && roomInput) {
      roomInput.value = roomParam.toLowerCase().slice(0, 24);
    }

    // Restore active session if user reloaded page on mobile
    let savedSession = null;
    try {
      const raw = sessionStorage.getItem('cout_session');
      if (raw) savedSession = JSON.parse(raw);
    } catch (e) {
      console.warn('Session parse error', e);
    }

    if (savedSession && savedSession.username && savedSession.room) {
      state.username = savedSession.username;
      state.room = savedSession.room;
      if (usernameInput) usernameInput.value = state.username;
      if (roomInput) roomInput.value = state.room;

      // Show chat interface immediately without flickering join screen
      headerRoomName.textContent = state.room;
      welcomeRoomName.textContent = state.room;
      joinScreen.classList.add('hidden');
      chatScreen.classList.remove('hidden');
    }

    setupEventListeners();
    const serverUrl = window.COUT_CONFIG.getServerUrl();
    initSocket(serverUrl);
  }

  document.addEventListener('DOMContentLoaded', start);
})();
