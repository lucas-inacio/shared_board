const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const ngrok = require('ngrok');
const qrcode = require('qrcode');

var clientPending = null;
var clientsList = [];
var getBoardSocket = null;

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

// Tries to retrieve board data if needed ror tell everyone we're ready
function boardDataRefresh() {
  if (clientsList.length > 0) {
    clientsList[0].emit('getBoard');
    getBoardSocket = clientsList[0];
  } else {
    clientsList.push(clientPending);
    clientPending = null;
    io.emit('ready');
  }
}

// Socket.IO
io.on('connection', function(socket) {
  // Pause everyone
  if (clientPending === null && getBoardSocket === null) {
    socket.broadcast.emit('newUser');
    clientPending = socket;
    boardDataRefresh();
  } else {
    socket.disconnect(true);
    return;
  }

  socket.on('disconnect', () => {
    let index = clientsList.indexOf(socket);
    if (index >= 0) {
      clientsList.splice(index, 1);
    }
    // If we're waiting for this client for a copy of the board we have to ask another client
    if (getBoardSocket === socket) {
      getBoardSocket = null;
      boardDataRefresh();
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
      getBoardSocket = null;
    }
    io.emit('ready');
  });

  socket.on('endStroke', function (msg) {
    socket.broadcast.emit('endStroke', msg);
  })
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