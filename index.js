// Many of the comments and logic in this and associated files are inspired by or copied from socket.io/get-started/chat/ and more from their website.

var express = require('express');
var app = express();

// wraps http server in socket.io ?
var http = require('http').Server(app);


// The main idea behind Socket.IO is that you can send and receive any events you want, with any data you want. Any objects that can be encoded as JSON will do, and binary data is supported too.
// Notice that I initialize a new instance of socket.io by passing the http (the HTTP server) object
var io = require('socket.io')(http);

var filesys = require('fs');

// sets nL to system specific newline character. In Unix like systems it's "\n" but in Windows it's "\n\r".
var nL = require('os').EOL;





// when there is an http request to specified path (/), the res object gets sent as http response.
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
}); 

/* sets up static server. Will serve exact paths to assets. Example path: localhost:3000/assets/Yahhoo.wav.
Without the static server no assets on host machine are accessible by the app. */
app.use(express.static(__dirname + '/public'));

var port = 3000;
http.listen(port, function(){
  console.log('listening on ' + port.toString());
});

// Event listener, runs function on connnection
io.on('connection', function(socket){
  
  //console.log(io.engine.clientsCount);

  io.emit('chat message', socket.handshake.address + ' connected');
  
  filesys.appendFile(__dirname + '/log/log.txt', socket.handshake.address + ' connected' + nL, function(err) {
    if (err) throw err;
  });  
  
  console.log(socket.handshake.address + ' connected');
  socket.on('disconnect', function (){
    io.emit('chat message', socket.handshake.address + ' disconnected');
    console.log(socket.handshake.address + ' disconnected');
    filesys.appendFile(__dirname + '/log/log.txt', socket.handshake.address + ' disconnected' + nL, function(err) {
      if (err) throw err;
    });
  });
  
  
  socket.on('chat message', function(msg) {
    var totalClients = io.sockets.sockets;
    console.log(socket.handshake.address + ' says: ' + msg);
    filesys.appendFile(__dirname + '/log/log.txt', socket.handshake.address +' says: ' + msg + nL, function(err) {
      if (err) throw err;
    });
    
    function emitFunction(examineeClient, emitType, emitData) {
      examineeClient.emit(emitType, emitData);
    }
    // Will be adapted to eventually prevent client from hearing their own messages be posted.
    function omitClient(socket, callback, emitType, emitData) {
      var totalClients = io.sockets.sockets;
      // for all connected clients, do
      for (var i = 0; i < totalClients.length; i++) {
        var examineeClient = totalClients[i];
        //if client we're looking at !== currentClient
        if (examineeClient !== socket) {
          callback(examineeClient, emitType, emitData);
        }
      }
    }
    
    omitClient(socket, emitFunction, 'chat message', socket.handshake.address + ' says: ' + msg);
    socket.emit('own chat message', socket.handshake.address + ' says: ' + msg);
  });


});

 // if it's inside the connection event listener when server is shut down as many times as the connection was ever initiated will be how many times alertServerShutdown() runs.
 // catch ctrl+c event and exit normally
  process.on('SIGINT', function (code) {
    
  
    function alertServerShutdown() {
      var msg = 'Warning: Server shutting down!';
      io.emit("chat message", msg);
      console.log(msg);
    }
    
    alertServerShutdown();
    setTimeout(function() {process.exit(2)}, 1000);




});

//catches uncaught exceptions
    process.on('uncaughtException', function(ev) {io.emit('chat message', 'Warning: Server crashed!')});
  
  



