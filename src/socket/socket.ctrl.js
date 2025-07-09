const userModel = require('../models/user.model');
const chatModel = require('../models/message.model');
const ReportModel = require('../models/report.model');
const sendPushNotification = require('../services/Notification.svc');



const SocketController = {
  joinRoom: async (userId, io, socket, userJoinAttempts) => {
    socket.on('joinRoom', async (roomData) => {
      const { isCity, roomId, coordinates } = roomData;
      const now = Date.now();
      const fineRoomId = roomId?.trim().toLowerCase();

      try {
        //  Rate limiting
        if (!userJoinAttempts.has(userId)) userJoinAttempts.set(userId, []);
        const attempts = userJoinAttempts.get(userId).filter(ts => now - ts < 60000);
        attempts.push(now);
        userJoinAttempts.set(userId, attempts);
        if (attempts.length > 3) {
          return socket.emit('error', { message: 'Too many join attempts, try again in 1 minute.' });
        }

        const user = await userModel.findById(userId);
        if (!user) return socket.emit('error', { message: 'User not found' });
        if (user.isBlocked) return socket.emit('error', { message: 'You are blocked.' });
        if (!fineRoomId && !coordinates) return socket.emit('error', { message: 'No room ID or coordinates provided' });

        // Join previously assigned room if any
        if (user.assignedRoom) {
          socket.join(user.assignedRoom);
          io.to(user.assignedRoom).emit('roomInfo', {
            roomId: user.assignedRoom,
            active: true,
            online: io.sockets.adapter.rooms.get(user.assignedRoom)?.size || 0,
            userId: user._id,
          });
          user.isOnline = true;
          user.socketId = socket.id;
          await user.save();

          return socket.emit('roomJoined', {
            roomId: user.assignedRoom,
            message: 'You have joined your existing room successfully',
          });
        }

        // Join any explicitly existing room by roomId
        if (fineRoomId) {
          const existingRoom = await chatModel.findOne({ room: fineRoomId });
          if (existingRoom) {
            socket.join(fineRoomId);
            user.assignedRoom = fineRoomId;
            if (!user.myRooms.includes(fineRoomId)) {
              user.myRooms.push(fineRoomId);
            }
            user.isOnline = true;
            user.socketId = socket.id;
            await user.save();

            io.to(user.assignedRoom).emit('roomInfo', {
              roomId: user.assignedRoom,
              active: true,
              online: io.sockets.adapter.rooms.get(user.assignedRoom)?.size || 0,
              members: await userModel.countDocuments({ assignedRoom: user.assignedRoom }),
            });

            return socket.emit('roomJoined', {
              roomId: user.assignedRoom,
              message: 'You have joined the existing room successfully',
            });
          }
        }

        // City-based Room (create if not exist)
        if (isCity && fineRoomId) {
          await chatModel.updateOne(
            { room: fineRoomId },
            { $setOnInsert: { createdAt: new Date() } },
            { upsert: true }
          );
          socket.join(fineRoomId);
          user.assignedRoom = fineRoomId;
          if (!user.myRooms.includes(fineRoomId)) {
            user.myRooms.push(fineRoomId);
          }
        }

        // Geo-location-based Room
        else if (coordinates && coordinates.length === 2) {
          const closestRoomUser = await userModel.findOne({
            location: {
              $near: {
                $geometry: { type: "Point", coordinates },
                $maxDistance: 5000,
              },
            },
            assignedRoom: { $exists: true },
          }).sort({ createdAt: -1 });

          if (closestRoomUser) {
            socket.join(closestRoomUser.assignedRoom);
            user.assignedRoom = closestRoomUser.assignedRoom;
          } else {
            const geoRoomName = `GeoRoom_${coordinates[0]}_${coordinates[1]}`;
            await chatModel.updateOne(
              { room: geoRoomName },
              { $setOnInsert: { createdAt: new Date() } },
              { upsert: true }
            );
            socket.join(geoRoomName);
            user.assignedRoom = geoRoomName;
            if (!user.myRooms.includes(geoRoomName)) {
              user.myRooms.push(geoRoomName);
            }
          }
        }

        // Finalize user
        user.isOnline = true;
        user.socketId = socket.id;
        await user.save();

        io.to(user.assignedRoom).emit('userJoined', {
          userName: user.name,
          profilePicture: user.profilePic,
          userId: user._id,
          socketId: user.socketId,
        });

        io.to(user.assignedRoom).emit('newMember', {
          _id: user._id,
          name: user.name,
          profilePic: user.profilePic,
          socketId: socket.id,
          roomId: user.assignedRoom,
        });

        io.to(user.assignedRoom).emit('roomInfo', {
          roomId: user.assignedRoom,
          active: true,
          online: io.sockets.adapter.rooms.get(user.assignedRoom)?.size || 0,
          members: await userModel.countDocuments({ assignedRoom: user.assignedRoom }),
        });

        socket.emit('roomJoined', {
          roomId: user.assignedRoom,
          message: 'You have joined the room successfully',
        });

      } catch (error) {
        console.error('Join Room Error:', error);
        socket.emit('error', { message: 'Error joining room' });
      }
    });
    socket.on('joinMyRooms', async (roomId) => {
      try {
        const user = await userModel.findById(userId);
        if (!user || !user.myRooms.includes(roomId)) {
          socket.emit('error', { message: 'You are not allowed to join this room' });
          return;
        }

        socket.join(roomId);
        user.assignedRoom = roomId;
        user.isOnline = true;
        await user.save();
        io.to(user.assignedRoom).emit('roomInfo', {
          roomId: user.assignedRoom,
          active: true,
          online: io.sockets.adapter.rooms.get(user.assignedRoom)?.size || 0,
          members: await userModel.countDocuments({ assignedRoom: user.assignedRoom }),
        })
        socket.emit('roomJoined', {
          roomId: user.assignedRoom,
          message: 'You have joined your room successfully',
        });

        socket.emit({
          success: true,
          message: "You have joined your room successfully"
        })
      } catch (error) {
        socket.emit('error', { message: 'Error joining room' });
      }
    });
  },
  leaveRoom: async (userId, io, socket) => {
    socket.on('leaveRoom', async (data, callback) => {
      try {
        const user = await userModel.findById(userId);
        if (!user || !user.assignedRoom) {
          if (callback) callback({ error: 'You are not in any room' });
          return;
        }

        const currentRoom = user.assignedRoom;
        socket.leave(currentRoom);

        user.assignedRoom = null;
        user.isOnline = false;
        user.socketId = null;
        await user.save();

        io.to(currentRoom).emit('userLeft', {
          userId: user._id,
          userName: user.name,
          profilePicture: user.profilePic,
          socketId: socket.id,
        });

        // ✅ Send success response to client
        if (callback) callback({ success: true });

      } catch (error) {
        console.error('Leave Room Error:', error);
        if (callback) callback({ error: 'Error leaving room' });
      }
    });
  },
  newMessage: async (userId, io, socket) => {
    socket.on('newMessage', async (messageData) => {
      const { content, roomId, tag } = messageData;

      try {
        // Extract mentioned user IDs from react-mentions format
        const mentionIdRegex = /@\[[^\]]+\]\(([^)]+)\)/g;
        const mentionMatches = [...content.matchAll(mentionIdRegex)];
        const mentionIds = mentionMatches.map(match => match[1]);

        //  Validate user and room
        const user = await userModel.findById(userId);
        if (!user || !user.assignedRoom) {
          return socket.emit('error', { message: 'You are not in any room' });
        }

        if (!content || content.trim() === '') {
          return socket.emit('error', { message: 'Message cannot be empty' });
        }

        if (user.isBlocked) {
          return socket.emit('error', { message: 'You are blocked from sending messages.' });
        }

        if (user.assignedRoom !== roomId) {
          return socket.emit('error', { message: 'You are not in this room' });
        }

        //  Create new message with mentions
        const newMessage = {
          sender: user._id,
          content: tag ? `[${tag}] ${content}` : content,
          room: user.assignedRoom,
          messageType: tag || 'normal',
          createdAt: new Date(),
          mentions: mentionIds.length > 0 ? mentionIds : [],
        };

        const message = await (await chatModel.create(newMessage))
          .populate('sender', 'name profilePic');

        //  Broadcast the message to the room
        io.to(user.assignedRoom).emit('message', message);

        // Send success response back to sender
        socket.emit('messageSent', {
          message: 'Message sent successfully',
          messageId: message._id,
        });

        // Step 1: Fetch users in the room with valid FCM tokens
        const members = await userModel.find({
          myRooms: { $in: [roomId] },
          FCMToken: { $exists: true, $ne: null }
        }).lean();

        //lets filter out the sender from the members list
        const filteredMembers = members.filter(member => member._id.toString() !== userId);

        // Step 2: Efficient async handling
        const notificationPromises = filteredMembers.map(member =>
          sendPushNotification(member.FCMToken, "💬 New Message", message.content)
        );

        // Step 3: Await all promises and catch errors
        try {
          await Promise.allSettled(notificationPromises); // Avoid failing due to one error
          console.log("Notifications sent");
        } catch (error) {
          console.error("Error sending group notifications:", error);
        }

        //  Optionally: Send notifications to mentioned users
        if (mentionIds.length > 0) {
          const mentionedUsers = await userModel.find({ _id: { $in: mentionIds } });
          mentionedUsers.forEach((mentionedUser) => {
            if (mentionedUser.socketId) {
              io.to(mentionedUser.socketId).emit("youWereMentioned", {
                message: content,
                from: user.name,
                roomId: user.assignedRoom,
              });
            }
          });
        }

      } catch (error) {
        console.error('New Message Error:', error);
        return socket.emit('error', { message: 'Error processing message' });
      }
    });

  },
  abuseReport: async (userId, io, socket) => {
    socket.on('reportAbuse', async (reportData) => {
      const { reportedUserId, reason, roomId, context } = reportData;
      try {
        const user = await userModel.findById(userId);
        if (!user || !user.assignedRoom) {
          return socket.emit('error', { message: 'You are not in any room' });
        }
        if (!reportedUserId || !reason || reason.trim() === '') {
          return socket.emit('error', { message: 'Invalid report data' });
        }

        // Proceed with the abuse report logic
        const report = {
          reportedBy: user._id,
          reportedUser: reportedUserId,
          reason: reason.trim(),
          reportedMessageId: roomId ? roomId : null,
          context: context ? context : 'chat',
        };
        await ReportModel.create(report);
        socket.emit('reportSuccess', { message: 'Report submitted successfully' });
      } catch (error) {
        console.error('Report Abuse Error:', error);
        socket.emit('error', { message: 'Error reporting abuse' });
      }
    });
  },
  Typing: async (userId, io, socket) => {
    socket.on('typing', async (data) => {
      try {
        const { status } = data;
        const user = await userModel.findById(userId);
        if (!user || !user.assignedRoom) {
          return socket.emit('error', { message: 'You are not in any room' });
        }
        io.to(user.assignedRoom).emit('UserTyping', { username: user.name, status });
      } catch (error) {
        socket.emit('error', { message: 'Error processing typing event' });
      }
    })
  },
  VideoChat: async (io, socket, queue, users) => {
    socket.on('joinQueue', () => {
      if (queue.length > 0) {
        const partner = queue.shift();
        users[socket.id] = partner;
        users[partner] = socket.id;
        socket.emit('partnerFound');
        io.to(partner).emit('partnerFound');
      } else {
        queue.push(socket.id);
        socket.emit('waitingForPartner');
      }
    })

    socket.on('offer', (data) => {
      const partner = users[socket.id];
      if (partner) io.to(partner).emit('offer', data);
    })

    socket.on('answer', (data) => {
      const partner = users[socket.id];
      if (partner) io.to(partner).emit('answer', data);
    });

    socket.on('ice-candidate', (data) => {
      const partner = users[socket.id];
      if (partner) io.to(partner).emit('ice-candidate', data);
    });

    // Temporary memory of recent partners
    const recentPartners = new Map();

    socket.on('leave', () => {
      const partner = users[socket.id];

      if (partner) {
        io.to(partner).emit('partnerLeft');

        // Save recent partners
        recentPartners.set(socket.id, partner);
        recentPartners.set(partner, socket.id);

        delete users[partner];
        delete users[socket.id];
      }

      // Delay before rejoining to reduce rematch likelihood
      setTimeout(() => {
        // Avoid rematching with same partner
        const lastPartner = recentPartners.get(socket.id);

        // Try to find a different user
        const available = queue.find(id => id !== lastPartner);

        if (available) {
          queue = queue.filter(id => id !== available);
          users[socket.id] = available;
          users[available] = socket.id;
          socket.emit('partnerFound');
          io.to(available).emit('partnerFound');
        } else {
          queue.push(socket.id);
          socket.emit('waitingForPartner');
        }

        // Clear recent partner after use
        recentPartners.delete(socket.id);
      }, 500); // Optional: short delay
    });

    socket.on('disconnect', () => {
      const partner = users[socket.id];
      if (partner) {
        io.to(partner).emit('partnerLeft');
        delete users[partner];
      }
      queue = queue.filter(id => id !== socket.id);
      delete users[socket.id];
    });


  },
}

module.exports = SocketController;