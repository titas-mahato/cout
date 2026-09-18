# cout >_

> Minimalist real-time chat with clean code formatting, syntax highlighting, and zero-cost cloud hosting.

**cout** is designed for developers and students who want an uncluttered, responsive chat interface where code snippets are cleanly separated from regular text in dedicated secondary cards with full syntax highlighting and one-click copy buttons.

---

## 🚀 Quick Start (Run Locally)

### 1. Install Dependencies
Open PowerShell or your terminal in the project directory:

```bash
cd d:\Zenith\Projects\cout\server
npm install
```

### 2. Start the Server
```bash
npm start
```

### 3. Open in Browser
Visit **[http://localhost:3000](http://localhost:3000)**.
Open multiple tabs to test sending messages, sharing code snippets, and watching live room updates!

---

## ⌨️ Code Snippet Formatting

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

## 🌐 How to Host Live for $0 (Zero-Cost Deployment)

### Step 1: Push Project to GitHub

1. Create a new public repository on [GitHub](https://github.com/new) named `cout` (do **not** initialize with README or .gitignore since we already have them).
2. Run these commands in `d:\Zenith\Projects\cout`:

```bash
git init
git add .
git commit -m "feat: initial cout chat server and client"
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/cout.git
git push -u origin main
```

*(Replace `<YOUR_GITHUB_USERNAME>` with your actual GitHub username).*

---

### Step 2: Deploy Backend to Render (Free Forever)

[Render.com](https://render.com) allows hosting Node.js WebSocket web services 100% free with automatic deploys from GitHub.

1. Sign up / Log in to [Render](https://dashboard.render.com/) with your GitHub account.
2. Click **New +** -> **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your `cout` repository.
4. Fill in these settings:
   - **Name**: `cout-backend` (or any unique name you like)
   - **Region**: Closest to you (e.g., Frankfurt, Oregon, Singapore)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Select **Free**
5. Click **Create Web Service**.
6. Wait 1–2 minutes until it says **Live**. Copy your service URL (e.g., `https://cout-backend.onrender.com`).
   - You can test it by visiting `https://cout-backend.onrender.com/health` in your browser. It should reply `{"status":"ok", ...}`.

---

### Step 3: Connect Frontend to Your Live Backend

1. In `client/config.js`, update `PRODUCTION_BACKEND_URL`:
   ```javascript
   const PRODUCTION_BACKEND_URL = "https://cout-backend.onrender.com"; // <-- Paste your Render URL here
   ```
2. Commit and push the change to GitHub:
   ```bash
   git add client/config.js
   git commit -m "chore: set production backend URL"
   git push
   ```

---

### Step 4: Host Frontend on GitHub Pages (Free)

GitHub Pages hosts static websites directly from your repo for free.

1. In your GitHub repository, go to **Settings** -> **Pages** (on the left menu).
2. Under **Build and deployment**:
   - **Source**: Deploy from a branch
   - **Branch**: `main`
   - **Folder**: `/ (root)` or use GitHub Actions.
3. *Alternative simplest setup*: You can deploy the `client` folder to GitHub Pages using git:
   ```bash
   git subtree push --prefix client origin gh-pages
   ```
   Then in GitHub Pages settings, select the `gh-pages` branch and `/ (root)`.
4. Your chat app will now be live at:
   `https://<YOUR_GITHUB_USERNAME>.github.io/cout/`

---

## 🛠 Project Structure

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
