const { v4: uuidv4 } = require('uuid');

class DrawingState {
  constructor() {
    // sequence of ops in arrival order
    this.history = [];
  }

  //append a stroke operation stroke should include clientid,userId,color,width,tool,points[]
  appendStroke(stroke) {
    const op = { type: 'stroke', opId: uuidv4(), stroke, ts: Date.now() };
    this.history.push(op);
    return op;
  }

  //finds last applied stroke and pushes an undo op targeting it
  performUndo(bySocketId) {
    for (let i = this.history.length - 1; i >= 0; i--) {
      const h = this.history[i];
      if (h.type === 'stroke' && this._isCurrentlyApplied(h.opId)) {
        const op = { type: 'undo', opId: uuidv4(), targetOpId: h.opId, ts: Date.now(), by: bySocketId };
        this.history.push(op);
        return op;
      }
    }
    return null;
  }

  //finds the most recent undo (not yet redone) whose target stroke is currently undone
  performRedo(bySocketId) {
    for (let i = this.history.length - 1; i >= 0; i--) {
      const h = this.history[i];
      if (h.type === 'undo' && !this._isRedoed(h.opId)) {
        const target = h.targetOpId;
        if (!this._isCurrentlyApplied(target)) {
          const op = { type: 'redo', opId: uuidv4(), targetOpId: target, ts: Date.now(), by: bySocketId };
          this.history.push(op);
          return op;
        }
      }
    }
    return null;
  }

  //return applied stroke ops in order
  getAppliedStrokes() {
    const applied = [];
    const status = {};
    // build applied status for each stroke by scanning history
    for (const op of this.history) {
      if (op.type === 'stroke') status[op.opId] = true;
      else if (op.type === 'undo') status[op.targetOpId] = false;
      else if (op.type === 'redo') status[op.targetOpId] = true;
    }
    for (const op of this.history) {
      if (op.type === 'stroke' && status[op.opId]) applied.push(op);
    }
    return applied;
  }

  getHistory() {
    return this.history.slice();
  }

  //snapshot of current state
  getSnapshot() {
    return {
      strokes: this.getAppliedStrokes(),
      history: this.getHistory()
    };
  }

  _isCurrentlyApplied(strokeOpId) {
    // scan history in order to see final applied status for this stroke
    let applied = false;
    for (const op of this.history) {
      if (op.type === 'stroke' && op.opId === strokeOpId) applied = true;
      if ((op.type === 'undo' || op.type === 'redo') && op.targetOpId === strokeOpId) {
        applied = op.type === 'redo' ? true : false;
      }
    }
    return applied;
  }

  _isRedoed(undoOpId) {
    // check if any redo op exists after given undo op that targets same stroke
    let found = false;
    let target = null;
    for (const op of this.history) {
      if (op.opId === undoOpId && op.type === 'undo') {
        target = op.targetOpId;
        break;
      }
    }
    if (!target) return false;
    // find the position of the undo op and see if a redo targeting same stroke appears after it
    let seenUndo = false;
    for (const op of this.history) {
      if (op.opId === undoOpId) seenUndo = true;
      if (seenUndo && op.type === 'redo' && op.targetOpId === target) return true;
    }
    return false;
  }
}

module.exports = { DrawingState };

