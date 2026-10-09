# dev log / changelog

things done so far:

- init repo with gitignore and root package.json
- setup node express server with socket.io
- added basic socket events: join_room, send_message, typing, disconnect
- added in-memory room tracking so users can join different channels
- made a simple /health route to ping server status
- added cors config so github pages can talk to backend later
- built clean html layout for chat in client/index.html
- added join modal for username and room selection
- added header with live room name and socket connection pill
- added members flyout drawer and message scroll container
- added textarea message input with shift+enter support
- added little >_ terminal favicon

- styled the entire client with dark theme (dark slate, clean borders)
- made join modal look like a sleek card with handle and room inputs
- added status indicator pill for connection health (pulse animation)
- built the secondary code container with custom header, lang label, and copy button
- added auto-resizing message input bar and responsive mobile media queries

- hooked up socket.io on the frontend with auto reconnect
- made config.js to switch between localhost and live backend url
- added real-time message stream with user color badges and timestamps
- built markdown regex parser to extract code blocks and inline code
- integrated highlight.js for standard code syntax coloring
- added quick copy button to snippet cards with feedback
- added live typing indicator with debounce

- wrote detailed readme covering local dev and code snippet syntax
- documented 100% free deployment guide for render and github pages
- mapped out full project directory structure

- synthesized a clean web audio chime for incoming messages from peers
- added header sound toggle button to quickly mute/unmute notifications
- saved sound preference in localstorage so setting stays across reloads

- added one-click room invite link button in topbar with clipboard feedback
- added ?room= url parameter support so invite links automatically pre-fill room
- enhanced server /health endpoint to track heap and rss memory metrics
- added lightweight /ping endpoint for automated cron keep-alive pings
- completed 7-day development sprint for cout v1.0
- fixed mobile form reload bug on sending messages and added persistent sessionStorage recovery
- hardened socket reconnection with infinite attempts and server-side room membership healing
- added 4x3 code snippet selector popup with textless white squircle blob logos for 12 languages and intelligent cursor positioning
- repositioned code snippet trigger button to the left of the chat box
- added in-place code snippet language switching to prevent block stacking and preserve original message
- updated server wake estimate to ~15s and styled code button with a distinct lighter blue shade
- added Discord-style reply system with curved connector spine, message copy button, top-right floating action bar, edge-to-edge hover highlight, and consecutive message grouping
- added real-time message deletion for own messages (straight instant delete) and reverted code snippet boxes to dynamic width matching code content
