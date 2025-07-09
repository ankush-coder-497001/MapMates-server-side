const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: { type: String, required: true },
  reportedMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: false },
  note: { type: String },
  context: {
    type: String,
    enum: ['chat', 'videochat'],
    default: 'chat',
  },
  status: {
    type: String,
    enum: ['pending', 'resolved', 'ignored'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
});

ReportSchema.index({ reportedBy: 1, reportedUser: 1, status: 1, context: 1, createdAt: -1 }); // Index for reportedBy, reportedUser and sorting by createdAt

module.exports = mongoose.model('Report', ReportSchema);