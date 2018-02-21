import express from 'express';
import http from 'http';
import socketio from 'socket.io';

const app = express();
const httpServer = http.Server(app);

httpServer.listen(3000, () => {
  console.log(`${app.name} listening to 3000`);
});

const peerData = {};

const io = socketio(httpServer);


app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('Connected!');

  socket.on('disconnect', () => {
    console.log('Disconnected!');
  });

  socket.on('create or join', (room) => {
    var clientInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientInRoom ? Object.keys(clientInRoom.sockets).length : 0;

    console.log(`Room ${room} has ${numClients + 1} client(s)`);

    if (numClients === 0) {
      socket.join(room);
      socket.emit('created', room);
    } else if (numClients === 1) {
      socket.join(room);
      socket.emit('joined', room);
    } else {
      socket.emit('full', room);
    }
  });

  socket.on('message', (room, data) => {
    console.log('Inside MESSAGE');
    socket.to(room).emit('message', data);
  });
});
