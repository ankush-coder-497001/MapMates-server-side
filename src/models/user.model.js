const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePic: { type: String, default: 'https://cdn0.iconfinder.com/data/icons/user-pictures/100/unknown_1-2-512.png' },
  role: { type: String, enum: ['user', 'admin', 'partner'], default: 'user' },

  city: { type: String },

  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0] // Default coordinates
    }
  },

  otp: { type: String },
  otpExpiresAt: { type: Date },
  assignedRoom: { type: String },
  myRooms: [
    { type: String },
  ],
  FCMToken: { type: String },
  isBlocked: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false },
  socketId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// ✅ Geo index
UserSchema.index({ location: '2dsphere' });

UserSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

UserSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

UserSchema.methods.generateAuthToken = function () {
  const token = jwt.sign({ userId: this._id, role: this.role }, process.env.SECRET, { expiresIn: '7d' });
  return token;
};

UserSchema.methods.generateOTP = function () {
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  this.otp = otp;
  this.otpExpiresAt = Date.now() + 10 * 60 * 1000;
  return otp;
};

module.exports = mongoose.model('User', UserSchema);
