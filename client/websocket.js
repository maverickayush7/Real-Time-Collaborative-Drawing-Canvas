const SocketClient = (function () {
    let socket = null;
    function connect() {
      socket = io();
      return socket;
    }
    function get() { return socket; }
    return { connect, get };
})();
  
window.SocketClient = SocketClient;

//web socket code