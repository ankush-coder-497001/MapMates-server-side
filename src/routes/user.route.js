const express = require('express');
const Auth = require('../middlewares/Authentictaion');
const UserController = require('../controllers/user.ctrl');
const uploadImageMiddleware = require('../middlewares/uploadImage');
const userRouter = express.Router();

// Authenticated routes
userRouter.post('/register', UserController.register);
userRouter.post('/login', UserController.login);
userRouter.put('/reset-password', Auth, UserController.resetPassword);
userRouter.post('/send-otp', UserController.sendOTP);
userRouter.post('/verify-otp', UserController.verifyOTP);
userRouter.put('/forgot-password', UserController.forgotPassword);


// Public routes
userRouter.get('/profile', Auth, UserController.getUserProfile);
userRouter.put('/profile', Auth, uploadImageMiddleware, UserController.updateProfile);
userRouter.put('/update-location', Auth, UserController.saveLocation);
userRouter.get('/have-room', Auth, UserController.haveRoom);
userRouter.put('/save-FCM', Auth, UserController.SaveFCMToken);

//admin routes
userRouter.put('/admin/update-status', Auth, UserController.updateStatus);
userRouter.get('/admin/get-all-users', Auth, UserController.getAllUsers);

module.exports = userRouter;