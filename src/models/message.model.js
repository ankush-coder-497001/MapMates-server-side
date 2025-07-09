const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  room: { type: String },
  content: { type: String, required: true },
  messageType: {
    type: String,
    enum: ['normal', 'News', 'Emergency', 'Help', 'partner'],
    default: 'normal',
  },
  reactions: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      emoji: { type: String, required: true },
    },
  ],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});
MessageSchema.index({ room: 1, createdAt: -1 }); // Index for room and sorting by createdAt


module.exports = mongoose.model('Message', MessageSchema);
