const instance = function (p) {
  const background = "#000000";
  let appState = { running: false };
  let socket = null;
  let gui = null;
  let previousState = null;
  let mouseState = { 
    pressed: false, radius: 1, color: '#ffffff', strokeWeight: 10, lastX: 0, lastY: 0
  };

  // mouseState
  let params = {
    color: '#574823',
    strokeWeight: 10,
    tool: [ 'pencil', 'eraser' ]
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

    // Interface
    let canvas = p.createCanvas(1920, 1080);
    canvas.id('board');
    p.background(0);
    gui = p.createGui(this, 'Menu (h to hide/show)');
    gui.addObject(params);
  };

  p.draw = function () {

  };

  p.touchStarted = function (e) {
    if (!appState.running) return false;

    restoreState();
    mouseState.pressed = true;
    mouseState.lastX = p.mouseX;
    mouseState.lastY = p.mouseY;
    socket.emit('beginStroke', { x: p.mouseX, y: p.mouseY, mouseState });
  };

  p.touchMoved = function () {
    if (!appState.running) return false;

    restoreState();
    if (mouseState.pressed === true) {
      socket.emit('stroke', { x: p.mouseX, y: p.mouseY, mouseState });
      point(p.mouseX, p.mouseY);
    }

    return false;
  };

  p.touchEnded = function () {
    if (!appState.running) return false;

    mouseState.pressed = false;
    socket.emit('endStroke', { mouseState });
  };

  p.keyPressed = function () {
    switch (p.key) {
      case 'h':
        gui.toggleVisibility();
        break;
    }
  }

  // SOCKET.IO callbacks
  this.onBeginStroke = function (msg) {
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
    mouseState.color = (params.tool === 'pencil') ? params.color : background;
    mouseState.strokeWeight = params.strokeWeight;
  }

  this.point = function (x, y) {
    p.stroke(mouseState.color);
    p.strokeWeight(mouseState.strokeWeight);
    p.line(mouseState.lastX, mouseState.lastY, x, y);
    mouseState.lastX = x;
    mouseState.lastY = y;
  }
};
var board = new p5(instance, 'main');