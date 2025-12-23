// Timezone utilities using native JavaScript
function toZonedTime(date, timeZone) {
  // Convert date to the specified timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === 'year').value);
  const month = parseInt(parts.find(p => p.type === 'month').value) - 1;
  const day = parseInt(parts.find(p => p.type === 'day').value);
  const hour = parseInt(parts.find(p => p.type === 'hour').value);
  const minute = parseInt(parts.find(p => p.type === 'minute').value);
  const second = parseInt(parts.find(p => p.type === 'second').value);
  
  return new Date(year, month, day, hour, minute, second);
}

function parseTime(timeString) {
  // Parse HH:mm format
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
}

function timeInRange(currentTime, startTime, endTime, timezone = 'UTC') {
  // Parse times
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  
  // Get current time in the specified timezone
  const zonedDate = toZonedTime(currentTime, timezone);
  const currentHours = zonedDate.getHours();
  const currentMinutes = zonedDate.getMinutes();
  const currentTimeMinutes = currentHours * 60 + currentMinutes;
  
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  
  // Handle overnight ranges (e.g., 22:00 to 02:00)
  if (endMinutes < startMinutes) {
    return currentTimeMinutes >= startMinutes || currentTimeMinutes < endMinutes;
  }
  
  return currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes;
}

function timeMatches(currentTime, targetTime, timezone = 'UTC', windowMinutes = 1) {
  const target = parseTime(targetTime);
  const zonedDate = toZonedTime(currentTime, timezone);
  
  const currentMinutes = zonedDate.getHours() * 60 + zonedDate.getMinutes();
  const targetMinutes = target.hours * 60 + target.minutes;
  
  return Math.abs(currentMinutes - targetMinutes) <= windowMinutes;
}

function dayMatches(currentTime, dayOfWeek, timezone = 'UTC') {
  if (dayOfWeek === null) return true;
  
  const zonedDate = toZonedTime(currentTime, timezone);
  // JavaScript getDay(): 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return zonedDate.getDay() === dayOfWeek;
}

function appendUtmParams(url, utmParams) {
  try {
    const urlObj = new URL(url);
    
    // Append UTM parameters
    Object.entries(utmParams).forEach(([key, value]) => {
      if (value) {
        urlObj.searchParams.set(key, value);
      }
    });
    
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, try simple string append
    const separator = url.includes('?') ? '&' : '?';
    const params = Object.entries(utmParams)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    return `${url}${separator}${params}`;
  }
}

module.exports = {
  parseTime,
  timeInRange,
  timeMatches,
  dayMatches,
  appendUtmParams
};
