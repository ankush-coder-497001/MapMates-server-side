const jwt = require('jsonwebtoken');

const Auth = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        message: 'token is required',
        error: 'No token provided'
      });
    }
    const decoded = jwt.verify(token, process.env.SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      message: 'Unauthorized',
      error: error.message
    });
  }
};

module.exports = Auth;