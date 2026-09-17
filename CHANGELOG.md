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
