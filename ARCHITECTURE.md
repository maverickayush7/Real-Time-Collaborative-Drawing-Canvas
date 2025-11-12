# Architecture & Design

## Overview
Single Node.js server using Socket.io for real-time messaging. Clients are vanilla JS and use the Canvas API

### Data Flow (high-level)
1. User draws locally — client collects points for a stroke
2. Client batches points and sends `stroke` message to server (contains stroke metadata and point array)
3. Server assigns a global operation id, appends to room history, broadcasts the operation to room participants
4. Clients receive operations and apply them to their local canvas (replay or incremental draw)

When a user requests `undo`:
1. Client emits `undo` to server
2. Server finds the last applicable stroke op in the room history that is still applied, appends an `undo` op referencing it, and broadcasts the `undo`
3. Clients apply the `undo` by replaying the applied operations (or by maintaining applied/undone flags and re-rendering)

## WebSocket Protocol (messages)

All messages are JSON. Fields vary by type

**Client -> Server**
- `join_room` `{ roomId, userName? }`
- `stroke` `{ roomId, stroke: { id: localId, userId, color, width, tool, points: [{x,y,t}] } }`
- `cursor` `{ roomId, x, y, isDrawing }`
- `undo` `{ roomId }`
- `redo` `{ roomId }`
- `request_state` `{ roomId }`  (on connect)

**Server -> Client**
- `joined` `{ userId, color, users }`
- `room_state` `{ strokes: [appliedStrokeOps] , history: [ops] }`
- `op` `{ op }`  // generic op: { type: 'stroke'|'undo'|'redo', opId, data }
- `cursor` `{ userId, x, y, isDrawing }`
- `users` `{ users }` // online roster updates

## Undo/Redo Strategy (global)
- Server keeps a linear `history[]` of ops
  - A stroke op: `{ type:'stroke', opId, stroke }`
  - An undo op: `{ type:'undo', opId, targetOpId }`
  - A redo op: `{ type:'redo', opId, targetOpId }`
- To determine currently applied strokes, we scan history in order and toggle `applied` status for strokes when undo/redo ops target them
- Undo always targets the most recent applied stroke (global). This means User A can undo User B's stroke — that's intentional per assignment (global undo)
- Redo re-applies the most recently undone stroke that is eligible

**Why this model?**
- Simple, deterministic, and easy to explain in an interview
- Allows a single source of truth on the server

**Drawbacks**
- Linear model is not perfect under heavy concurrency; advanced CRDTs or Operational Transforms would be needed for a production system

## Performance decisions
- **Batching:** Clients batch pointer moves into a stroke packet every 40ms or when pointer is lifted. This reduces network pressure but keeps interactivity
- **Client-side smoothing:** The client draws a smoothed line using `quadraticCurveTo` between points during local drawing to appear smooth
- **Partial re-render:** For replay on undo/redo, the client clears and replays applied strokes.For modest canvas sizes (typical interview scenario) this is fast; for large-scale, we'd use tiled layers or incremental layers per stroke

## Conflict resolution
- Linear history resolves conflicts deterministically: the order of op arrival on server decides ordering
- If two users draw simultaneously in the same area, both strokes are kept in history; last applied shows on top. Undo will remove the topmost applied stroke first

## Message size and serialization
- Points are simple `{x,y}` floats (optionally `t` timestamp). We can compress later (delta encoding), but for clarity it's raw arrays


