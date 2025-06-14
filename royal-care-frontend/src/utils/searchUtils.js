/**
 * Fuzzy search utilities for client and data matching
 */

/**
 * Performs fuzzy matching between a query and target text
 * @param {string} query - The search query
 * @param {string} text - The text to search in
 * @returns {boolean} - Whether the query matches the text
 */
export const fuzzyMatch = (query, text) => {
  if (!query || !text) return false;

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Direct match (fastest)
  if (textLower.includes(queryLower)) return true;

  // Fuzzy matching - check if query characters appear in order
  let queryIndex = 0;
  let textIndex = 0;

  while (queryIndex < queryLower.length && textIndex < textLower.length) {
    if (queryLower[queryIndex] === textLower[textIndex]) {
      queryIndex++;
    }
    textIndex++;
  }

  return queryIndex === queryLower.length;
};

/**
 * Filters an array of clients based on fuzzy search criteria
 * @param {Array} clients - Array of client objects
 * @param {string} searchTerm - Search query
 * @param {number} maxResults - Maximum number of results to return
 * @returns {Array} - Filtered array of clients
 */
export const filterClients = (clients, searchTerm, maxResults = 50) => {
  if (!clients || !Array.isArray(clients)) return [];

  if (!searchTerm || !searchTerm.trim()) {
    return clients.slice(0, maxResults);
  }

  return clients
    .filter((client) => {
      const fullName = `${client.first_name || ""} ${
        client.last_name || ""
      }`.trim();
      const phoneNumber = client.phone_number || "";

      return (
        fuzzyMatch(searchTerm, fullName) ||
        fuzzyMatch(searchTerm, client.first_name) ||
        fuzzyMatch(searchTerm, client.last_name) ||
        fuzzyMatch(searchTerm, phoneNumber)
      );
    })
    .slice(0, maxResults);
};

/**
 * Highlights matching characters in text for search result display
 * @param {string} text - The text to highlight
 * @param {string} query - The search query
 * @returns {string} - HTML string with highlighted matches
 */
export const highlightMatches = (text, query) => {
  if (!query || !text) return text;

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Simple highlighting for direct matches
  if (textLower.includes(queryLower)) {
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  }

  return text;
};

export default {
  fuzzyMatch,
  filterClients,
  highlightMatches,
};
