function errorHandler(err, req, res, next) {
  console.error('=== ERROR HANDLER ===');
  console.error('Error:', err);
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  console.error('Error code:', err.code);
  console.error('Error stack:', err.stack);
  console.error('Request path:', req.path);
  console.error('Request method:', req.method);
  
  // Log more details in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
  }
  
  // Log LibSQL/Turso specific errors
  if (err.code) {
    console.error('Database error code:', err.code);
  }
  if (err.message && err.message.includes('SQL')) {
    console.error('SQL-related error detected');
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
