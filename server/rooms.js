const { DrawingState } = require('./drawing-state');

//Room
//Manages users in the room (socketId -> { name, color }) and holds a drawing state instance for op history and applied stroke snapshots
 
class Room {
  constructor(id) {
    this.id=id;
    this.users={}; //socketId->{name,color}
    this.drawingState=new DrawingState();
    this._palette=['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6','#bcf60c','#fabebe'];
  }

  addUser(socketId, name) {
    const color = this._pickColor(Object.keys(this.users).length);
    this.users[socketId] = { name: name || `User-${socketId.slice(0,4)}`, color };
    return this.users[socketId];
  }

  removeUser(socketId) {
    delete this.users[socketId];
  }

  getUsers() {
    const arr = [];
    for (const id in this.users) {
      arr.push({ userId: id, name: this.users[id].name, color: this.users[id].color });
    }
    return arr;
  }

  appendStroke(stroke) {
    // delegate to drawingstate which will create an op with opId, ts and all
    return this.drawingState.appendStroke(stroke);
  }

  performUndo(requestingSocketId) {
    return this.drawingState.performUndo(requestingSocketId);
  }

  performRedo(requestingSocketId) {
    return this.drawingState.performRedo(requestingSocketId);
  }

  getAppliedStrokes() {
    return this.drawingState.getAppliedStrokes();
  }

  getStateSnapshot() {
    return this.drawingState.getSnapshot();
  }

  _pickColor(index) {
    return this._palette[index % this._palette.length];
  }
}


//RoomManager
//Keeps a map of rooms and provides helper methods used by server to add/remove users and manipulate drawing state

class RoomManager {
  constructor() {
    this.rooms = {}; //roomId->Room
  }

  _getRoom(roomId) {
    if (!this.rooms[roomId]) this.rooms[roomId] = new Room(roomId);
    return this.rooms[roomId];
  }

  addUserToRoom(roomId, socketId, name) {
    const room = this._getRoom(roomId);
    return room.addUser(socketId, name);
  }

  removeUser(socketId) {
    const roomsLeft = [];
    for (const roomId in this.rooms) {
      const room = this.rooms[roomId];
      if (room.users && room.users[socketId]) {
        room.removeUser(socketId);
        roomsLeft.push(roomId);
      }
    }
    return roomsLeft;
  }


  getUsers(roomId) {
    const room = this.rooms[roomId];
    if (!room) return [];
    return room.getUsers();
  }

  appendStroke(roomId, stroke) {
    const room = this._getRoom(roomId);
    const op = room.appendStroke(stroke);
    return op;
  }

  performUndo(roomId, socketId) {
    const room = this._getRoom(roomId);
    return room.performUndo(socketId);
  }

  performRedo(roomId, socketId) {
    const room = this._getRoom(roomId);
    return room.performRedo(socketId);
  }

  getRoomState(roomId) {
    const room = this._getRoom(roomId);
    return room.getStateSnapshot();
  }
}

module.exports = { RoomManager };


