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
