const notFound = (req, res, next) => {
  const message = `Route ${req.originalUrl} not found`;
  res.status(404).json({
    success: false,
    message,
  });
};

module.exports = notFound;