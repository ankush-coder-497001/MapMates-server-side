const express = require('express');
const Auth = require('../middlewares/Authentictaion');
const ReportController = require('../controllers/report.ctrl');
const reportRouter = express.Router();

// Create a new report
reportRouter.post('/', Auth, ReportController.create);
// Take action on a report
reportRouter.post('/action', Auth, ReportController.takeAction);
// Get all reports for an admin
reportRouter.get('/', Auth, ReportController.getAllReports);

module.exports = reportRouter;