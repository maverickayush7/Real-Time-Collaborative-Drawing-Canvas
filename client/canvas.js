class CanvasApp {
    constructor(canvasEl, cursorsEl) {
        this.canvas=canvasEl;
        this.cursorsEl=cursorsEl;
        this.ctx=canvasEl.getContext('2d');
        this.dpr=window.devicePixelRatio || 1;

        // drawing state
        this.isDrawing=false;
        this.currentStrokePoints=[];
        this.localStrokeIdCounter=0;
        this.roomId=null;

        // client-side history
        this.history=[];
        this.appliedStrokes=[];
        this.cursors={};

        // defaults for canvas UI
        this.color='#000000';
        this.width= 4;
        this.tool='brush';
        this.resize();
        window.addEventListener('resize',() => this.resize());
        this._setupEvents();
    }
  
    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = Math.floor(rect.width * this.dpr);
      this.canvas.height = Math.floor(rect.height * this.dpr);
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.replayAll();
    }
  
    setRoom(roomId) { this.roomId = roomId; }
  
    _setupEvents() {
      // pointer events for drawing
      const down = (e) => { e.preventDefault(); this.startDrawing(e); };
      const move = (e) => { e.preventDefault(); this.movePointer(e); };
      const up = (e) => { e.preventDefault(); this.endDrawing(e); };
      this.canvas.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }
  
    startDrawing(e) {
      this.isDrawing = true;
      const p = this._getPointer(e);
      this.currentStrokePoints = [p];
      this._drawDot(p);
      this._emitCursor(p.x, p.y, true);
    }
  
    movePointer(e) {
      const p = this._getPointer(e);
      if (this.isDrawing) {
        this.currentStrokePoints.push(p);
        this._drawSegment(this.currentStrokePoints, this.color, this.width, this.tool);
        // cursor
        this._emitCursor(p.x, p.y, true);
      } else {
        this._emitCursor(p.x, p.y, false);
      }
    }
  
    endDrawing(e) {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      const p = this._getPointer(e);
      if (p) this.currentStrokePoints.push(p);
      this._drawSegment(this.currentStrokePoints, this.color, this.width, this.tool);
      // send stroke to server via main.js helper
      if (this.sendStrokeCallback && this.currentStrokePoints.length > 0) {
        const stroke = {
          id: `local-${Date.now()}-${++this.localStrokeIdCounter}`,
          userId: window.socketId || null,
          color: this.tool === 'eraser' ? '#ffffff' : this.color,
          width: this.width,
          tool: this.tool,
          points: this.currentStrokePoints
        };
        this.sendStrokeCallback(this.roomId, stroke);
      }
      this.currentStrokePoints = [];
      this._emitCursor(p.x, p.y, false);
    }
  
    _getPointer(e) {
      if (!this.canvas) return null;
      const rect = this.canvas.getBoundingClientRect();
      return { x: (e.clientX - rect.left), y: (e.clientY - rect.top), t: Date.now() };
    }
  
    _drawDot(p) {
      const ctx = this.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = this.tool === 'eraser' ? '#fff' : this.color;
      ctx.arc(p.x, p.y, this.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  
    _drawSegment(points, color, width, tool) {
      if (!points || points.length < 2) return;
      const ctx = this.ctx;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = width;
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const midx = (points[i].x + points[i + 1].x) / 2;
        const midy = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, midx, midy);
      }
      // last segment
      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
      ctx.restore();
    }
  
    // network integration points (set by main)
    onReceiveOp(op) {
      // maintain local history mirror and apply operation
      this.history.push(op);
      if (op.type === 'stroke') {
        this.appliedStrokes.push(op);

        // incremental draw of stroke
        this._drawStrokeOp(op);
      } else if (op.type === 'undo' || op.type === 'redo') {
        
        // recompute applied strokes and re-render
        this._recomputeAppliedFromHistory();
        this.replayAll();
      }
    }
  
    // draw a stroke operatiom directly
    _drawStrokeOp(op) {
      const s = op.stroke;
      this._drawSegment(s.points, s.color, s.width, s.tool);
    }
  
    // recompute
    _recomputeAppliedFromHistory() {
      const appliedMap = {};
      // mark all strokes as false initially
      for (const h of this.history) {
        if (h.type === 'stroke') appliedMap[h.opId] = false;
      }
      // now scan and toggle
      for (const h of this.history) {
        if (h.type === 'stroke') appliedMap[h.opId] = true;
        if (h.type === 'undo') appliedMap[h.targetOpId] = false;
        if (h.type === 'redo') appliedMap[h.targetOpId] = true;
      }
      this.appliedStrokes = [];
      for (const h of this.history) {
        if (h.type === 'stroke' && appliedMap[h.opId]) this.appliedStrokes.push(h);
      }
    }
  
    // full clear + replay
    replayAll() {
      // clear
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
      // replay applied strokes
      for (const op of this.appliedStrokes) {
        this._drawStrokeOp(op);
      }
    }
  
    // UI helpers
    setColor(c) { this.color = c; }
    setWidth(w) { this.width = w; }
    setTool(t) { this.tool = t; }
  
    // set callback for sending strokes (main.js sets this)
    onSendStroke(cb) { this.sendStrokeCallback = cb; }
  
    // receive full room state
    loadRoomState(state) {
      // state.strokes is server-provided applied strokes (with opId & stroke)
      this.history = state.history || [];
      this.appliedStrokes = state.strokes || [];
      this.replayAll();
    }
  
    // cursor display management
    updateCursor({ userId, x, y, isDrawing, color, name }) {
      if (!this.cursors[userId]) {
        const el = document.createElement('div');
        el.className = 'cursor';
        el.style.background = color || '#333';
        el.innerHTML = `<div style="width:10px;height:10px;border-radius:50%;background:white;"></div><div style="padding:2px 6px;color:white">${name||userId.slice(0,4)}</div>`;
        this.cursors[userId] = el;
        this.cursorsEl.appendChild(el);
      }
      const el = this.cursors[userId];
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.opacity = isDrawing ? '1' : '0.8';
    }
  
    removeCursor(userId) {
      const el = this.cursors[userId];
      if (el) {
        el.remove();
        delete this.cursors[userId];
      }
    }
  
    // emit cursor events via provided socket
    setEmitCursor(fn) { this._emitCursor = fn; }
}
window.CanvasApp = CanvasApp;


