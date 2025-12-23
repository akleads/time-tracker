const { randomBytes } = require('crypto');

function generateSlug(length = 8) {
  const bytes = randomBytes(length);
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let slug = '';
  
  for (let i = 0; i < bytes.length; i++) {
    slug += chars[bytes[i] % chars.length];
  }
  
  return slug.toLowerCase();
}

function validateSlug(slug) {
  // Alphanumeric, 3-50 characters
  return /^[a-zA-Z0-9]{3,50}$/.test(slug);
}

module.exports = { generateSlug, validateSlug };
