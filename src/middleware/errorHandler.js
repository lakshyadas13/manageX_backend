const errorHandler = (err, _req, res, _next) => {
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Resource already exists' });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid task id' });
  }

  if (err.name === 'ValidationError') {
    const firstError = Object.values(err.errors)[0];
    return res.status(400).json({ message: firstError?.message || 'Validation failed' });
  }

  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
};

module.exports = errorHandler;
