# cout >_

> Minimalist real-time chat with clean code formatting, syntax highlighting, and zero-cost cloud hosting.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-cout--chat.vercel.app-58a6ff?style=flat-square&logo=vercel)](https://cout-chat.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-3fb950?style=flat-square)](LICENSE)

👉 **Live Application:** **[https://cout-chat.vercel.app](https://cout-chat.vercel.app)**

**cout** is designed for developers and students who want an uncluttered, responsive chat interface where code snippets are cleanly separated from regular text in dedicated secondary cards with full syntax highlighting and one-click copy buttons.

---

## Quick Start (Run Locally)

### 1. Clone & Navigate
```bash
git clone https://github.com/titas-mahato/cout.git
cd cout/server
```

### 2. Install Dependencies & Start
```bash
npm install
npm start
```

### 3. Open in Browser
Visit **[http://localhost:3000](http://localhost:3000)**.
Open multiple tabs to test sending messages, sharing code snippets, and watching live room updates!

---

## Code Snippet Formatting

In any chat message, use standard markdown triple backticks to format code:

````markdown
Hey check out this function:
```cpp
#include <iostream>

int main() {
    std::cout << "Hello from cout chat!" << std::endl;
    return 0;
}
```
Let me know if this works!
````

cout automatically renders the snippet in a secondary dark-contrast card with:
- The programming language badge
- Standard syntax highlighting colors
- A **Copy** button for fast snippet sharing

---

## Project Structure

```
cout/
├── client/                     # Static frontend (GitHub Pages)
│   ├── index.html              # Clean dark-mode UI
│   ├── style.css               # Minimalist styling & secondary code container
│   ├── app.js                  # Real-time WebSocket logic & code parser
│   └── config.js               # Local vs production URL router
├── server/                     # Backend WebSocket server (Render)
│   ├── index.js                # Express & Socket.io server logic
│   ├── package.json            # Dependencies
│   └── .env.example            # Sample environment file
├── .gitignore                  # Git ignore rules
├── package.json                # Convenience scripts
└── README.md                   # Documentation and deployment guide
```
