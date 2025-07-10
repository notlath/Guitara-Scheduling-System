/**
 * Utility functions for handling timezone-aware date formatting
 * Ensures logs display in Philippines time (Asia/Manila) regardless of user location
 */

/**
 * Formats a date/timestamp to Philippines time
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} Formatted timestamp in Philippines time
 */
export const formatToPhilippinesTime = (timestamp) => {
  if (!timestamp) return new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const date = new Date(timestamp);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid timestamp provided:', timestamp);
    return 'Invalid Date';
  }

  return date.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric', 
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

/**
 * Formats a date/timestamp to Philippines time with readable format
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} Formatted timestamp in readable Philippines time
 */
export const formatToReadablePhilippinesTime = (timestamp) => {
  console.log('Raw timestamp input:', timestamp);
  
  // Handle null, undefined or empty string timestamps
  if (!timestamp) {
    console.warn('Empty timestamp provided, using current time instead');
    const nowPH = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    // console.log('Current Manila time (fallback):', nowPH);
    return nowPH.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }
  
  // Handle common timestamp formats
  let date;
  
  // If timestamp is a string and appears to be in ISO format
  if (typeof timestamp === 'string') {
    console.log('Parsing string timestamp:', timestamp);
    
    // Special handling for Django/Postgres timestamps that might not have timezone info
    if (timestamp.includes('T') && !timestamp.includes('Z') && !timestamp.includes('+')) {
      console.log('Django timestamp detected, appending Z for UTC parsing');
      // Treat as UTC by adding Z if no timezone specified
      timestamp = timestamp + 'Z';
    }
  }
  
  // Try to create a date object
  try {
    date = new Date(timestamp);
    console.log('Parsed date object:', date.toISOString());
  } catch (e) {
    console.error('Error parsing timestamp:', e);
    return 'Invalid Date Format';
  }
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid timestamp detected:', timestamp);
    
    // Try parsing PostgreSQL/Supabase timestamp format (2023-04-25T14:30:45.123456+00:00)
    if (typeof timestamp === 'string') {
      // Remove timezone info and milliseconds for simpler parsing
      const simplifiedTimestamp = timestamp.replace(/\.\d+(\+|-)\d+:\d+$/, '');
      console.log('Attempting to parse simplified timestamp:', simplifiedTimestamp);
      try {
        date = new Date(simplifiedTimestamp);
        if (isNaN(date.getTime())) {
          return 'Invalid Date';
        }
      } catch (e) {
        console.error('Failed to parse timestamp after cleanup:', e);
        return 'Invalid Date';
      }
    } else {
      return 'Invalid Date';
    }
  }

  // Convert the date to Philippines time explicitly
  // This two-step approach ensures proper timezone handling
  const options = {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    year: 'numeric', 
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  
  // First get the date string in Manila time
  const philippinesTimeString = date.toLocaleString('en-US', options);
  console.log('Formatted Philippines time string:', philippinesTimeString);
  
  // Return the properly formatted date string
  return philippinesTimeString;
};

/**
 * Formats a log timestamp specifically for system logs display
 * This function ensures proper Philippines time regardless of backend format
 * 
 * @param {string|Date} timestamp - The timestamp from backend logs
 * @returns {string} Formatted timestamp in Philippines timezone
 */
export const formatLogTimestamp = (timestamp) => {
  console.log('Processing log timestamp:', timestamp);
  
  if (!timestamp) {
    console.warn('Empty log timestamp provided');
    return 'Unknown Time';
  }
  
  let date;
  
  // If timestamp appears to be a django/postgres timestamp with timezone info
  if (typeof timestamp === 'string' && timestamp.includes('+00:00')) {
    console.log('UTC timestamp detected:', timestamp);
    // This is a UTC timestamp, parse it accordingly
    date = new Date(timestamp);
  } 
  // Handle ISO format
  else if (typeof timestamp === 'string' && timestamp.includes('T')) {
    console.log('ISO timestamp detected:', timestamp);
    // Ensure it's treated as UTC if no timezone specified
    date = new Date(timestamp.endsWith('Z') ? timestamp : timestamp + 'Z');
  }
  // Handle other formats
  else {
    console.log('Standard timestamp format detected:', timestamp);
    date = new Date(timestamp);
  }
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid log timestamp:', timestamp);
    return 'Invalid Date';
  }
  
  // Get date in Philippines time
  const philippinesDate = new Date(date.toLocaleString('en-US', {
    timeZone: 'Asia/Manila'
  }));
  
  console.log('Original timestamp:', date.toISOString());
  console.log('Philippines time:', philippinesDate);
  
  // Format the date in a friendly way
  return philippinesDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};
