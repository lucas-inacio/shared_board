var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var clientPending = null;
var clientsList = [];

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

http.listen(8080, function() {
  console.log('Listening on 8080');
})