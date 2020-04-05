const instance = function (p) {
  let appState = { running: false };
  let socket = null;
  let gui = null;
  let previousState = null;
  let mouseState = { 
    pressed: false, radius: 1, color: '#ffffff', lineWidth: 10, lastX: 0, lastY: 0
  };

  p.setup = function () {
    // SOCKET.IO
    socket = io();
    socket.on('ready', function () {
      appState.running = true;
    });

    socket.on('newUser', function () {
      appState.running = false;
    });

    socket.on('stroke', (msg) => {
      saveState();
      mouseState = msg.mouseState;
      point(msg.x, msg.y);
    });

    socket.on('beginStroke', (msg) => {
      onBeginStroke(msg);
    });

    socket.on('endStroke', (msg) => {
      saveState();
      mouseState = msg.mouseState;
    })

    socket.on('getBoard', () => {
      let { data, width, height } = getBoard();
      socket.emit('board', { data: Array.from(data), width, height });
    });

    socket.on('setBoard', (data) =>  {
      setBoard(data);
    });

    // Callbacks
    let canvas = p.createCanvas(1280, 780);
    canvas.id('board');
    p.background(0);
    gui = p.createGui(this);
  };

  p.draw = function () {

  };

  p.touchStarted = function (e) {
    restoreState();
    mouseState.pressed = true;
    mouseState.lastX = p.mouseX;
    mouseState.lastY = p.mouseY;
    socket.emit('beginStroke', { x: p.mouseX, y: p.mouseY, mouseState });
  
    return false;
  };

  p.touchMoved = function () {
    restoreState();
    if (mouseState.pressed === true) {
      socket.emit('stroke', { x: p.mouseX, y: p.mouseY, mouseState });
      point(p.mouseX, p.mouseY);
    }
    return false;
  };

  p.touchEnded = function () {
    mouseState.pressed = false;
    socket.emit('endStroke', { mouseState });
    return false;
  };

  // SOCKET.IO callbacks
  this.onBeginStroke = function (msg) {
    // this.saveState();
    saveState();
    mouseState = msg.mouseState;
  }

  this.getBoard = function () {
    return p.drawingContext.getImageData(0, 0, p.width, p.height);
  }

  this.setBoard = function (data) {
    let image = new ImageData(
      new Uint8ClampedArray(Array.from(data.data)), data.width, data.height);
    p.drawingContext.putImageData(image, 0, 0);
  }

  this.saveState = function () {
    if (previousState === null) {
      previousState = mouseState;
      p.drawingContext.save();
    }
  }

  this.restoreState = function () {
    if (previousState) {
      p.drawingContext.restore();
      mouseState = previousState;
      previousState = null;
    }
  }

  this.point = function (x, y) {
    p.stroke(mouseState.color);
    p.strokeWeight(mouseState.radius);
    p.line(mouseState.lastX, mouseState.lastY, x, y);
    mouseState.lastX = x;
    mouseState.lastY = y;
  }
};
var board = new p5(instance, 'main');