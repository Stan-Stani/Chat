// Many of the comments and logic in this and associated files are inspired by or copied from socket.io/get-started/chat/ and more from their website.

// ! Global Variables Section !
var express = require('express');
var app = express();

// wraps http server in socket.io ?
var http = require('http').Server(app);


// The main idea behind Socket.IO is that you can send and receive any events you want, with any data you want. Any objects that can be encoded as JSON will do, and binary data is supported too.
// Notice that I initialize a new instance of socket.io by passing the http (the HTTP server) object
var io = require('socket.io')(http);

var filesys = require('fs');

// Sets nL to system specific newline character. In Unix like systems it's "\n" but in Windows it's "\n\r".
var nL = require('os').EOL;
// ! End of Global Variables Section !

// ! Central Function Calls Section !
// These are the central functions of the program. They should be completely independent of each other.
startServingContent();
handleClientConnects();
handleServerShutdown();
//handleServerError();
// ! End of Central Function Calls Section !

// ! Central Functions' Definitions Section !

// Handles inital page request and assets requested by that page
function startServingContent() {
  // when there is an http request to specified path (/), the res object gets sent as http response.
  app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
  }); 


  /* sets up static server. Will serve exact paths to assets. Example path: localhost:3000/assets/Yahhoo.wav.
  Without the static server no assets on host machine are accessible by the app. */
  app.use(express.static(__dirname + '/public'));

  // Finishes serving initialization by starting server listening
  var port = 3000;
  http.listen(port, function(){
    console.log('listening on ' + port.toString());
  });
};



// Handles initial client connection and data interchange between server and client after that
function handleClientConnects() {
  // Event listener, runs  callback function on a client (socket) connnection event that handles/takes care of this specific client connection
  io.on('connection', function(socket){
    
      // Default username
      var userName = socket.handshake.address;
      var uriName = encodeURIComponent(userName);
      
    //console.log(io.engine.clientsCount);

    registerClientConnect();
    setTimeout(function () {

    io.emit('chat message', socket.handshake.address + ' username = ' + '"' + userName + '"');
    }, 500);
    
    // Tells all clients, the console, and the log that this client (socket) has connected
    function registerClientConnect() {
      registerClientState(socket, 'connected', userName);
    }
    
    
  

    // Does stuff when this client disconnects
    socket.on('disconnect', function () {
      
      registerClientDisconnect();
      
      // Tells all clients, the console, and the log that this client (socket) has disconnected
      function registerClientDisconnect() {
        registerClientState(socket, 'disconnected', userName);
      };
    });
    
    // Saves config text for use in message commands
    // The reason I don't have var "configTxt = filesys.readFile(...)" is because filesys only returns the file when the file is read and and everything
    // else in the program will still try to execute, so configTxt would be undefined. I have to use a callback to define it and an configTxt has to be an object
    // so the function captures the specific object and not a clone that doesn't link back to the object.
  
    function readContent(callback, setMe) {
      filesys.readFile(__dirname + '/config/op_commands/fixate.txt', 'utf8', function (err, content) {
          if (err) return callback(err)
          callback(null, content, setMe)
      })
    }
    var configTxt = {};
    readContent(function (err, content, setMe) {setMe['content'] = content; }, configTxt);
    
    
    // Does stuff when client sends a 'chat message' event to the server
    var qualifiedUserText = socket.handshake.address + " ";
    socket.on('chat message', function(msg) {
       var date = new Date();
      console.log(qualifiedUserText + 'says: ' + msg);
      filesys.appendFile(__dirname + '/log/log.txt', socket.handshake.address +' AKA: '+ userName + 'on '+ date + ' says: ' + msg + nL, function(err) {
         if (err) throw err;
      });
      
      // handles posting of messages and some server commands, often ones that need to be hidden from the client code to keep them secret.
      if (msg != configTxt['content']) {
        // Emits a 'chat message' event to all clients but the current client (the one that sent the message)
        socket.broadcast.emit('chat message', qualifiedUserText + 'says: ' + msg);
        
        // Emits the client's 'chat message' back to itself but under a new event name so the client knows it is receiving
        // its own message and can then handle it differently from other clients' messages, if necessary.
        socket.emit('own chat message', qualifiedUserText + 'says: ' + msg);
      } else {
        io.emit('fixate');
      };
    });
    
    socket.on('username submit', function(name) {
      userName = name;
      uriName = encodeURIComponent(name);
      qualifiedUserText = userName + ' ';
      console.log(uriName);
      var user_folder_exists = true;
      // Perhaps convert their names to hexadecimal.
      filesys.mkdir(__dirname + '/users/' + uriName, function(err) {
        if (err && err.code == 'EEXIST') {
          // do nothing
        } else if (err && err.code == 'ENOENT') {
          socket.emit('chat message', '<strong>Server says: Your username is too long. You\'ll be able to use it in chat, but it won\'t work with the mail system.</strong>')
          user_folder_exists = false;
        };
      });
      
      if (user_folder_exists === true) {
        filesys.mkdir(__dirname + '/users/' + uriName + '/' + 'inbox', function(err) {
          if (err && err.code == 'EEXIST') {
            // do nothing
          } 
        });
        socket.emit('chat message', '<strong>Server says: Username set. Please note that currently your name may not work with the mail system if it has periods in it.</strong>');
      }
    });
      
    
    //handles sending message
    socket.on('send mail', function(recipientName, content) {
      uriRecipientName = encodeURIComponent(recipientName);
      filesys.appendFile(__dirname + '/users/' + uriRecipientName + '/inbox/' + uriName + '.txt', '<strong><u><h4>Message on ' + new Date + ':</h4></u></strong><p style="text-indent: 1em;">' + content + '</p>', function (err) {
        if (err && err.code === 'ENOENT') {
          socket.emit('chat message', '<strong>Server says: User either does not exist, or their name is not compatible with the message system because it is too long.</strong>');
        } else if (err && err.code === 'ENAMETOOLONG') {
          socket.emit('chat message', '<strong>Server says: Your name doesn\'t work with the mail system. Try a shorter one.</strong>');
        } else if (err) throw err
        else {
          socket.emit('chat message', '<strong>Server says: Message sent.</strong>');
        }
      });
    });
    
    socket.on('read mail', function() {
      console.log('hello');
      console.log(userName);
      console.log(uriName);
      filesys.readdir(__dirname + '/users/' + uriName + '/inbox/', function(err, list) {
        console.log(list);
        // This error handling doesn't work.
        // Not sure why 'ENOENT' doesn't happen when the directory doesn't exist. See below for work around.
        if (err && err.code === 'ENOENT') {
          socket.emit('chat message', '<strong>Server says: Your name doesn\'t work with the mail system. Try a shorter one.</strong>');
        } else if (err && err.code === 'ENAMETOOLONG') {
          socket.emit('chat message', '<strong>Server says: Your name doesn\'t work with the mail system. Try a shorter one.</strong>');
        } else if (err) {
          throw err
          // Catches error if directory doesn't exist.
        } else if (list.length !== undefined) {
          
        
          if (list.length !== 0) {
            // won't return full name if there is a period in the file name so it doesn't work if there is a period in addition to the extension.
            for (var i = 0; i < list.length; i++) {
              readFileAndCaptureI(i, list);

            }
            function readFileAndCaptureI (iterator, list) {
              filesys.readFile(__dirname + '/users/' + uriName + '/inbox/' + list[iterator], function(err, content) {
                if (err && err.code === 'ENOENT') {
                  socket.emit('chat message', '<strong>Server says: Couldn\'t return user message because their name contains a period</strong>')
                } 
                else if (err) throw err
                else {
                  console.log('here');
                  // Get rid of the '.txt'
                  var fromUser = (list[iterator]).substring(0, (list[iterator].length - 4));
                  socket.emit('chat message', '<strong><h1 style="padding: 0px; margin: 0px;">From: ' + fromUser + '</h1></strong><br>' + content)
                }
              });
            }
          } else {
            socket.emit('chat message', '<strong>Server says: No mail in inbox.</strong>');
          }
            
        } else {
          socket.emit('chat message', '<strong>Server says: Your name doesn\'t work with the mail system. Try a shorter one.</strong>');
        }
      });
    });
    

  });
  
  // This function is used to tell all clients, the console, and the log, the state of the client (as described by a string argument)
  // E.G. given that stateChangeDescriptor = 'disconnected', this function will cause a printing of '<example ip> disconnected' to
  // all clients, the console, and the log. 
  function registerClientState(socket, stateChangeDescriptor, userName) {
    if (userName) {
      var textToRegister = userName + " " + stateChangeDescriptor;
      } else {
        var textToRegister = socket.handshake.address + " " + stateChangeDescriptor;
      };
    io.emit('chat message', textToRegister);
    console.log(textToRegister);
    filesys.appendFile(__dirname + '/log/log.txt', textToRegister + nL, function(err) {
    });
  };
};



function handleServerShutdown() {
  // if it's inside the connection event listener when server is shut down as many times as the connection was ever initiated will be how many times alertServerShutdown() runs.
  // catch ctrl+c event and exit normally
  // (Don't exit the server by clicking the X button of the terminal. Use 'Ctrl + C'! If you don't the 'Warning: Server hutting down!' message won't be sent.)
  process.on('SIGINT', function (code) {
    alertServerShutdown();
    setTimeout(function() {process.exit(2)}, 1000);
    
    function alertServerShutdown() {
    var msg = 'Warning: Server shutting down!';
    io.emit("chat message", msg);
    console.log(msg);
    }
  });
};


function handleServerError() {
//catches uncaught exceptions
    process.on('uncaughtException', function(ev) {
      io.emit('chat message', 'Warning: Server error! You may become disconnected soon or features may no longer work!')
      console.log(ev);
    });
};

// ! End of Central Functions' Definitions Section !



