const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { RoomManager } = require('./rooms');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const roomManager = new RoomManager();

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..', 'client')));

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('join_room', ({ roomId, userName }) => {
    if (!roomId) roomId = 'default';
    socket.join(roomId);
    const user = roomManager.addUserToRoom(roomId, socket.id, userName);
    // send joined confirmation + room state
    socket.emit('joined', { userId: socket.id, color: user.color, users: roomManager.getUsers(roomId) });
    const state = roomManager.getRoomState(roomId);
    socket.emit('room_state', state);
    // broadcast updated users to room
    io.to(roomId).emit('users', roomManager.getUsers(roomId));
  });

  socket.on('stroke', ({ roomId, stroke }) => {
    const op = roomManager.appendStroke(roomId, stroke);
    io.to(roomId).emit('op', { op });
  });

  socket.on('cursor', ({ roomId, x, y, isDrawing }) => {
    socket.to(roomId).emit('cursor', { userId: socket.id, x, y, isDrawing });
  });

  socket.on('undo', ({ roomId }) => {
    const op = roomManager.performUndo(roomId, socket.id);
    if (op) io.to(roomId).emit('op', { op });
  });

  socket.on('redo', ({ roomId }) => {
    const op = roomManager.performRedo(roomId, socket.id);
    if (op) io.to(roomId).emit('op', { op });
  });

  socket.on('request_state', ({ roomId }) => {
    const state = roomManager.getRoomState(roomId);
    socket.emit('room_state', state);
  });

  socket.on('disconnect', () => {
    console.log('disconnect', socket.id);
    const roomsLeft = roomManager.removeUser(socket.id);
    roomsLeft.forEach((roomId) => {
      io.to(roomId).emit('users', roomManager.getUsers(roomId));
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

