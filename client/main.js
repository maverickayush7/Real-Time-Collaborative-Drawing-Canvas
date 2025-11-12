(function () {
    const canvasEl = document.getElementById('canvas');
    const cursorsEl = document.getElementById('cursors');
    const toolSel = document.getElementById('tool');
    const colorInp = document.getElementById('color');
    const widthInp = document.getElementById('width');
    const undoBtn = document.getElementById('undo');
    const redoBtn = document.getElementById('redo');
    const usersDiv = document.getElementById('users');
    const joinBtn = document.getElementById('join');
    const roomInp = document.getElementById('room');
  
    const app = new CanvasApp(canvasEl, cursorsEl);
  
    // connect socket
    const socket = SocketClient.connect();
    window.socket = socket;
    socket.on('connect', () => {
      window.socketId = socket.id;
      // auto join room from URL query or input
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room') || 'default';
      roomInp.value = room;
      joinRoom(room);
    });
  
    socket.on('joined', ({ userId, color, users }) => {
      console.log('joined', userId, color);
    });
  
    socket.on('room_state', (state) => {
      // initial state
      app.loadRoomState(state);
    });
  
    socket.on('op', ({ op }) => {
      app.onReceiveOp(op);
    });
  
    socket.on('cursor',(data) => {
      // for simplicity, just showing basic cursor
      app.updateCursor({ userId: data.userId, x: data.x, y: data.y, isDrawing: data.isDrawing, color: '#666', name: data.userId.slice(0,4) });
    });
  
    socket.on('users',(users) => {
      // render user list
      usersDiv.innerHTML = users.map(u => `<span style="margin-right:8px"><strong style="color:${u.color}">●</strong> ${escapeHtml(u.name)}</span>`).join('');
      // ensuring cursors reflect current users
      const ids = users.map(u => u.userId);
      for (const id in app.cursors) {
        if (!ids.includes(id)) app.removeCursor(id);
      }
    });
  
    function escapeHtml(str) {
      return (str+'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }
  
    function joinRoom(room) {
      if (!room) room = 'default';
      app.setRoom(room);
      socket.emit('join_room', { roomId: room, userName: `Guest-${socket.id.slice(0,4)}` });
    }
  
    // wire UI controls
    toolSel.addEventListener('change', (e) => app.setTool(e.target.value));
    colorInp.addEventListener('input', (e) => app.setColor(e.target.value));
    widthInp.addEventListener('input', (e) => app.setWidth(parseInt(e.target.value)));
  
    undoBtn.addEventListener('click', () => socket.emit('undo', { roomId: app.roomId }));
    redoBtn.addEventListener('click', () => socket.emit('redo', { roomId: app.roomId }));
    joinBtn.addEventListener('click', () => joinRoom(roomInp.value.trim() || 'default'));
  
    // connect app stroke sending to socket
    app.onSendStroke((roomId, stroke) => {
      socket.emit('stroke', { roomId, stroke });
    });
  
    // cursor emit
    let lastCursorEmit = 0;
    app.setEmitCursor((x, y, isDrawing) => {
      const now = Date.now();
      if (now - lastCursorEmit > 50) {
        lastCursorEmit = now;
        socket.emit('cursor', { roomId: app.roomId, x, y, isDrawing });
      }
    });
  
    // keyboard shortcuts for undo/redo
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); socket.emit('undo', { roomId: app.roomId }); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); socket.emit('redo', { roomId: app.roomId }); }
    });
  
})();


