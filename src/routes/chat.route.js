const express = require('express');
const Auth = require('../middlewares/Authentictaion');
const ChatController = require('../controllers/chat.ctrl');
const chatRouter = express.Router();

chatRouter.get('/history/:roomId', Auth, ChatController.getHistory);
chatRouter.get('/member-list/:roomId', Auth, ChatController.getMemberList);
chatRouter.get('/my-rooms', Auth, ChatController.getMyRooms);
module.exports = chatRouter;