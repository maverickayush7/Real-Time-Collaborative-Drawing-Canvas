# 🖌️  Real-Time-Collaborative-Drawing-Canvas

A simple multi-user drawing board built with vanilla JavaScript, HTML5 Canvas, and Node.js (Socket.io).
Multiple users can draw together in real time, see each other’s cursors, and even perform global undo/redo operations.

## Features
- Brush and eraser, color pick, stroke width control
- Real-time sync (streamed and batched strokes)
- Live cursor indicators for other users
- Global undo/redo (linear history)
- Room support
- Lightweight and framework-free

## 🚀 Setup
1. Clone the repository
git clone https://github.com/maverickayush7/Real-Time-Collaborative-Drawing-Canvas.git

2. `cd Real-Time-Collaborative-Drawing-Canvas`
3. `npm install`
4. `npm start`
5. Open multiple browser tabs to `http://localhost:3000/?room=maverick` (or any room name other than maverick)

To test collaboration, open the same URL in another browser or an incognito tab.

You can also join a specific room by appending a query:
                http://localhost:3000/?room=demo

## ✏️ How to Use
- `Brush Tool:-` Select “Brush” from the dropdown and drag on the canvas to draw.

- `Eraser Tool:-` Switch to “Eraser” to remove strokes (it paints white over the canvas).

- `Color & Width:-` Pick a color and adjust stroke width from the toolbar.

- `Undo / Redo:-` Use the buttons or keyboard shortcuts:

        ⌘ / Ctrl + Z → Undo
        ⌘ / Ctrl + Y → Redo

- `Rooms:-` Each room is isolated. Type a name in the “Room” field and click Join to start a new one.

- `Multiple Users:-` Open several tabs or browsers — everyone in the same room sees drawings update in real time, along with other users’ cursors.


## 🧠 How It Works

- `Frontend:-` Vanilla JavaScript + HTML5 Canvas.
                Handles drawing, smooth stroke rendering, and cursor visualization.

- `Backend:-` Node.js with Socket.io for WebSocket-based communication.
                Manages rooms, tracks stroke history, and handles global undo/redo.

- `Undo/Redo:-` The server maintains a linear history of all drawing operations.
                Undo removes the latest applied stroke (no matter who drew it), and redo restores it.

## 🧩 Folder Structure
```
collaborative-canvas/
├── client/
│ ├── index.html # UI layout
│ ├── style.css # Toolbar and layout styling
│ ├── canvas.js # Canvas drawing logic
│ ├── websocket.js # Socket.io client setup
│ └── main.js # App initialization and event wiring
├── server/
│ ├── server.js # Express + Socket.io server
│ ├── rooms.js # User and room management
│ └── drawing-state.js # Global drawing history & undo/redo logic
├── package.json
├── README.md
└── ARCHITECTURE.md 
```
