const UserModel = require('../models/user.model');
const chatModel = require('../models/message.model')
const UserController = {
  SaveFCMToken: async (req, res) => {
    try {
      const { userId } = req.user;
      if (!userId) {
        return res.status(403).json("userId is required");
      }

      const { FCM } = req.body;
      if (!FCM) {
        return res.status(404).json("fcm token is not provided")
      }

      const user = await UserModel.findByIdAndUpdate(
        userId,
        { FCMToken: FCM }
      )

      if (!user) {
        res.status(400).json("user not found!");
      }

      res.status(200).json("FCM token saved!")

    } catch (error) {
      res.status(500).json({
        message: error.message
      })
    }
  },
  register: async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({
          message: 'Name, email, and password are required'
        });
      }

      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          message: 'User already exists with this email'
        });
      }
      const newUser = new UserModel({
        name,
        email,
        password
      });
      await newUser.save();
      const token = newUser.generateAuthToken();
      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          profilePic: newUser.profilePic,
          role: newUser.role
        },
        token
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message
      })
    }
  },
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          message: 'Email and password are required'
        });
      }

      const user = await UserModel.findOne({ email });
      if (!user) {
        return res.status(401).json({
          message: 'Invalid email or password'
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          message: 'Invalid email or password'
        });
      }

      const token = user.generateAuthToken();
      res.status(200).json({
        message: 'Login successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          profilePic: user.profilePic,
          role: user.role
        },
        token
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message
      });
    }
  },
  getUserProfile: async (req, res) => {
    try {
      const { userId } = req.user;
      if (!userId) {
        return res.status(400).json({
          message: 'User ID is required'
        });
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        });
      }

      res.status(200).json({
        message: 'User profile retrieved successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          profilePic: user.profilePic,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message
      });
    }
  },
  updateProfile: async (req, res) => {
    try {
      const { userId } = req.user;
      const { name, email, role } = req.body;

      if (!userId) {
        return res.status(400).json({
          message: 'User ID is required'
        });
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        });
      }

      if (req.imageUrl) {
        user.profilePic = req.imageUrl;
      }

      user.name = name || user.name;
      user.email = email || user.email;
      user.role = role || user.role;

      await user.save();

      res.status(200).json({
        message: 'User profile updated successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          profilePic: user.profilePic,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message
      });
    }
  },
  updateStatus: async (req, res) => {
    try {
      const { userId } = req.user;
      const { role } = req.user;
      const { targetUserId, status } = req.body;
      if (!userId || !targetUserId || !status) {
        return res.status(400).json({
          message: 'User ID and target user ID are required'
        });
      }
      if (role != 'admin') {
        return res.status(403).json({
          message: 'Only admins can block users'
        });
      }

      const targetUser = await UserModel.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({
          message: 'Target user not found'
        });
      }
      targetUser.isBlocked = status === 'block' ? true : false;
      await targetUser.save();
      res.status(200).json({
        message: 'User status updated successfully',
        user: {
          id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          profilePic: targetUser.profilePic,
          role: targetUser.role,
          isBlocked: targetUser.isBlocked
        }
      });


    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message
      });
    }
  },
  saveLocation: async (req, res) => {
    try {
      const { userId } = req.user;
      const location = req.body.location;

      if (!userId || !location) {
        return res.status(400).json({
          message: 'User ID, city, and coordinates are required'
        });
      }
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        });
      }
      user.location = location;
      await user.save();
      res.status(200).json({
        message: 'Location saved successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          profilePic: user.profilePic,
          role: user.role,
          location: user.location
        }
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message
      });
    }
  },
  resetPassword: async (req, res) => {
    try {
      const { userId } = req.user;
      const { oldPassword, newPassword } = req.body;
      if (!userId && !oldPassword || !newPassword) {
        return res.status(400).json({
          message: 'User ID, old password, and new password are required'
        });
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        });
      }

      const isMatch = await user.comparePassword(oldPassword);
      if (!isMatch) {
        return res.status(401).json({
          message: 'Enter correct old password'
        });
      }
      // Validate new password length
      if (newPassword.length < 6) {
        return res.status(400).json({
          message: 'New password must be at least 6 characters long'
        });
      }
      // Update password
      user.password = newPassword;
      await user.save();

      res.status(200).json({
        message: 'Password reset successfully',
        user: {
          id: user._id,
          email: user.email
        }
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message
      });
    }
  },
  sendOTP: async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({
          message: 'Email is required'
        });
      }

      const user = await UserModel.findOne({ email });
      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        });
      }

      const otp = user.generateOTP();
      await user.save();

      // Send OTP via email or SMS (implementation not shown)
      console.log(`OTP for ${email}: ${otp}`);

      res.status(200).json({
        message: 'OTP sent successfully'
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message
      });
    }
  },
  verifyOTP: async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({
          message: 'Email and OTP are required'
        });
      }

      const user = await UserModel.findOne({ email });
      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        });
      }

      if (user.otp !== otp) {
        return res.status(401).json({
          message: 'Invalid OTP'
        });
      }

      if (user.otpExpiresAt < Date.now()) {
        return res.status(401).json({
          message: 'OTP has expired'
        });
      }

      user.otp = undefined;
      user.otpExpiresAt = undefined;
      await user.save();

      res.status(200).json({
        message: 'OTP verified successfully'
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message
      });
    }
  },
  forgotPassword: async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) {
        return res.status(400).json({
          message: 'Email and new password are required'
        });
      }

      const user = await UserModel.findOne({ email });
      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        });
      }

      user.password = newPassword;
      await user.save();

      res.status(200).json({
        message: 'Password reset successfully',
        user: {
          id: user._id,
          email: user.email
        }
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message
      });
    }
  },
  getAllUsers: async (req, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({
          message: 'Only admins can access this route'
        });
      }
      const users = await UserModel.find({}, '-password -otp -otpExpiresAt');
      if (!users || users.length === 0) {
        return res.status(404).json({
          message: 'No users found',
          users: []
        });
      }
      res.status(200).json({
        message: 'Users retrieved successfully',
        users
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message
      });
    }
  },
  getAllRoomsByUser: async (req, res) => {
    const { userId } = req.user;
    if (!userId) {
      return res.status(400).json({
        message: 'User ID is required'
      });
    }
    try {
      const rooms = await chatModel.find({ sender: userId }).sort({ createdAt: -1 }).populate('sender', 'isOnline');
      if (!rooms || rooms.length === 0) {
        return res.status(404).json({
          message: 'No rooms found for this user',
          rooms: []
        });
      }
      const formattedRooms = rooms.map(room => ({
        id: room._id,
        name: room.name,
        members: room.sender.reduce((count, user) => {
          if (user.isOnline) count++;
          return count;
        }, 0), // members means how many users are online in this room
        active: true
      }));
      res.status(200).json({
        message: 'Rooms retrieved successfully',
        rooms: formattedRooms
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message
      });
    }
  },
  haveRoom: async (req, res) => {
    try {
      const { userId } = req.user;
      if (!userId) {
        return res.status(400).json({
          message: 'User ID is required'
        });
      }
      const User = await UserModel.findById(userId);
      if (!User) {
        return res.status(404).json({
          message: 'User not found'
        });
      }

      if (!User.assignedRoom) res.status(200).json({ isAssigned: false });
      else res.status(200).json({ isAssigned: true });

    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = UserController;