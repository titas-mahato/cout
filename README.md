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

