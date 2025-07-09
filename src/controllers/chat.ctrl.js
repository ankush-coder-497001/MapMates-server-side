const messageModel = require('../models/message.model');
const userModel = require('../models/user.model');
const ChatController = {
  getHistory: async (req, res) => {
    try {
      const { roomId } = req.params;
      const { before, limit = 50 } = req.query; // before: ISO date string, limit: number
      if (!roomId) {
        return res.status(400).json({
          success: false,
          message: 'Room parameter is required'
        });
      }
      // Build query for pagination
      const query = { room: roomId };
      if (before) {
        query.createdAt = { $lt: new Date(before) };
      }
      // Fetch messages in ascending order (oldest first)
      const messages = await messageModel
        .find(query)
        .populate('sender', 'name profilePic')
        .sort({ createdAt: 1 })
        .limit(Number(limit) + 1) // Fetch one extra to check if more
        .exec();
      const hasMore = messages.length > limit;
      const resultMessages = hasMore ? messages.slice(0, -1) : messages;
      res.status(200).json({
        success: true,
        messages: resultMessages,
        hasMore,
        nextCursor: hasMore ? resultMessages[0].createdAt : null // for next page
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },
  getMemberList: async (req, res) => {
    try {
      const { roomId } = req.params;
      if (!roomId) {
        return res.status(400).json({
          success: false,
          message: 'Room parameter is required'
        });
      }
      const members = await userModel.find({ myRooms: { $in: [roomId] } }, 'name profilePic _id isOnline').lean();
      if (!members || members.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No members found in this room'
        });
      }
      res.status(200).json({
        success: true,
        members: members
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },
  getMyRooms: async (req, res) => {
    try {
      const { userId } = req.user;
      if (!userId) {
        return res.status(404).json({ message: "provide the token" });
      }
      const user = await userModel.findById(userId);
      const myRooms = user.myRooms;
      if (myRooms && myRooms.length < 0) {
        return res.status(500).json({
          message: "no rooms found",
          rooms: []
        });
      }
      const mappedData = await Promise.all(myRooms.map(async (room) => ({
        name: room,
        member: await userModel.countDocuments({ myRooms: { $in: [room] } }),
        online: await userModel.countDocuments({ assignedRoom: room, isOnline: true }),
        active: true,
        lastMessage: `join the ${room}'s chat`,
        role: "member",
        avatar: "🎮",
        category: "chat room",
        description: `stay connected with ${room}'s citizens`
      })));
      res.status(200).json({
        message: "rooms found",
        rooms: mappedData
      });
    } catch (error) {
      res.status(500).json({
        message: error.message
      });
    }
  }
};

module.exports = ChatController;