const ReportModel = require('../models/report.model');
const UserModel = require('../models/user.model');
const ReportController = {
  create: async (req, res) => {
    try {
      const { userId } = req.user;
      const { reportedUser, reason, reportedMessageId, context, note } = req.body;

      if (!userId || !reportedUser || !reportedMessageId || !reason || !context) {
        return res.status(400).json({
          message: 'All fields are required'
        });
      }

      const existingReport = await ReportModel.findOne({ reportedBy: userId, reportedUser })

      if (existingReport) {
        return res.status(200).json({
          message: "you have already reported this user"
        })
      }

      const newReport = new ReportModel({
        reportedBy: userId,
        reportedUser,
        reason,
        reportedMessageId: reportedMessageId || null,
        context: context,
        note
      });

      await newReport.save();

      res.status(201).json({
        message: 'Report created successfully',
        report: newReport
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message
      });
    }
  },
  takeAction: async (req, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({
          message: 'Only admins can take action on reports'
        });
      }

      const { reportId, action } = req.body;

      if (!reportId || !action) {
        return res.status(400).json({
          message: 'Report ID and action are required'
        });
      }

      const report = await ReportModel.findById(reportId);

      if (!report) {
        return res.status(404).json({
          message: 'Report not found'
        });
      }

      if (report.status !== 'pending') {
        return res.status(400).json({
          message: 'Report action can only be taken on pending reports'
        });
      }

      const reportedUser = UserModel.findById(report.reportedUser);
      if (!reportedUser) {
        return res.status(404).json({
          message: 'Reported user not found'
        });
      }

      if (action === 'block') {
        report.status = 'resolved';
        reportedUser.isBlocked = true;
        await reportedUser.save();
      } else {
        //sending a waring message to the reported user
        report.status = 'ignored';
      }
      await report.save();
      res.status(200).json({
        message: 'Report action taken successfully',
        report
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message
      });
    }
  },
  getAllReports: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          message: 'Only admins can view reports'
        });
      }
      const reports = await ReportModel.find().sort({ createdAt: -1 })
        .populate('reportedBy', 'username email')
        .populate('reportedUser', 'username email')
        .populate('reportedMessageId', 'content createdAt');
      res.status(200).json({
        message: 'Reports fetched successfully',
        reports
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = ReportController;