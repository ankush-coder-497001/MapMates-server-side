const mongoose = require('mongoose');

const HelpRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['blood', 'medical', 'lost_item', 'other'],
    default: 'other',
  },
  description: { type: String, required: true },
  contactNumber: { type: String },
  location: {
    city: { type: String },
    coordinates: { type: [Number] },
  },
  createdAt: { type: Date, default: Date.now },
});

HelpRequestSchema.index({ 'location.city': 1, createdAt: -1 }); // Index for geo queries and sorting by createdAt

module.exports = mongoose.model('HelpRequest', HelpRequestSchema);