function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  console.error('Error stack:', err.stack);
  console.error('Error message:', err.message);
  
  // Log more details in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
  }
  
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  
  // Provide more details in development, generic message in production
  const errorMessage = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message || 'Internal server error';
  
  res.status(500).json({ 
    error: errorMessage,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

module.exports = errorHandler;
