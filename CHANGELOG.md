# Changelog

All notable changes to the **cout** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.2.0] - 2026-09-14 (Day 2)

### Added
- Minimalist dark-mode HTML chat interface layout (`client/index.html`).
- Responsive viewport configuration and dark theme color metadata.
- Custom inline SVG terminal tab favicon (`>_`).
- Join room modal with handle selection and `#` room prefix input.
- Chat workspace with navigation header, connection status pill, and member flyout drawer.
- Auto-expanding message form with keyboard shortcut guidelines.

---

## [0.1.0] - 2026-09-13 (Day 1)

### Added
- Project initialization with root `.gitignore` and `package.json`.
- Node.js Express server backend with Socket.io real-time engine.
- Room lifecycle management (`join_room`, `leave_room`, `disconnect`).
- Real-time message broadcasting and user typing indicator event listeners.
- Permissive CORS configuration for external GitHub Pages client hosting.
- Server health check verification endpoint (`GET /health`).
