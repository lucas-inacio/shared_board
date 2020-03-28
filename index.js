var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

// Rotas
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

// Socket.IO
io.on('connection', function(socket) {
  console.log('A user connected');
  socket.on('stroke', function (msg) {
    socket.broadcast.emit('stroke', msg);
  });

  socket.on('beginStroke', function (msg) {
    socket.broadcast.emit('beginStroke', msg);
  });

  socket.broadcast.emit('newUser');
  socket.emit('ready');
});

http.listen(8080, function() {
  console.log('Listening on 8080');
})