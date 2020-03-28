const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const ngrok = require('ngrok');
const qrcode = require('qrcode');

var clientPending = null;
var clientsList = [];

var port = 8080;
var tunnel = false;

if (process.argv.length > 2) {
  for (let i = 2; i < process.argv.length; ++i) {
    switch (process.argv[i]) {
      case '--port':
        port = process.argv[i + 1] || 8080;
        ++i;
        break;
      case '--tunnel':
        tunnel = true;
        break;
      default:
        console.log('Invalid argument list!');
    }
  }
}

// Rotas
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

// Socket.IO
io.on('connection', function(socket) {
  // Pause everyone
  if (clientPending === null) {
    socket.broadcast.emit('newUser');
    clientPending = socket;
    // Gets last board data from another user
    if (clientsList.length > 0) {
      clientsList[0].emit('getBoard');
    } else {
      clientsList.push(clientPending);
      clientPending = null;
      io.emit('ready');
    }
  } else {
    socket.disconnect(true);
    return;
  }

  socket.on('disconnect', () => {
    let index = clientsList.indexOf(socket);
    if (index >= 0) {
      clientsList.splice(index, 1);
    }
  });

  socket.on('stroke', function (msg) {
    socket.broadcast.emit('stroke', msg);
  });
  
  socket.on('beginStroke', function (msg) {
    socket.broadcast.emit('beginStroke', msg);
  });
  
  socket.on('board', function (msg) {
    if (clientPending) {
      clientPending.emit('setBoard', msg);
      clientsList.push(clientPending);
      clientPending = null;
    }
    io.emit('ready');
  });
});

http.listen(port, function() {
  console.log('Listening on port ' + port);
})

if (tunnel) {
  (async () => {
    try {
      const url = await ngrok.connect({ addr: port });
      console.log('Tunnel at ' + url);
      qrcode.toString(url, { type: 'terminal' }, (err, url) => {
        console.log(url);
      });
    } catch (e) {
      console.log(e);
    }
  })();
}