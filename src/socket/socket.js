const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const socketController = require('./socket.ctrl')
const userModel = require('../models/user.model')
let io;
// In-memory rate limit (per user for socket "joinRoom" event)
const userJoinAttempts = new Map();

// In-memory queue for random city-wise user matching (Optional: for future use)
let queue = [];
let users = {};

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.ORIGIN || ['http://localhost:5173', 'http://localhost:4173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket.io middleware for JWT authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) console.error('No token provided');
    jwt.verify(token, process.env.SECRET, (err, user) => {
      if (err) return next(new Error(err));
      socket.user = user;
      next();
    });
  });


  // Socket.io connection
  io.on('connection', (socket) => {
    console.log(' User connected:', socket.id);
    const userId = socket.user.userId;

    //for joining room
    socketController.joinRoom(userId, io, socket, userJoinAttempts);

    //for leaving room 
    socketController.leaveRoom(userId, io, socket);

    //for sending message
    socketController.newMessage(userId, io, socket);

    //for reporting user
    socketController.abuseReport(userId, io, socket);

    //for showing typing 
    socketController.Typing(userId, io, socket);


    //for video chat 
    socketController.VideoChat(io, socket, queue, users)

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);

      const partner = users[socket.id];
      if (partner) {
        io.to(partner).emit('partnerLeft');
        delete users[partner];
      }

      // Clean up user from queue and users map
      queue = queue.filter(id => id !== socket.id);
      delete users[socket.id];

      // Optional: if userId is available
      if (userId) {
        userJoinAttempts.delete(userId);

        userModel.findByIdAndUpdate(userId, {
          isOnline: false,
          socketId: null,
        }, { new: true })
          .then(user => {
            if (user?.assignedRoom) {
              io.to(user.assignedRoom).emit('userOffline', {
                userId: user._id,
                userName: user.name,
                profilePicture: user.profilePic,
                socketId: user.socketId,
                online: io.sockets.adapter.rooms.get(user.assignedRoom)?.size || 0,
              });

            }
          })
          .catch(err => console.error('Error updating user on disconnect:', err));
      }
    });

  });


}

module.exports = initSocket