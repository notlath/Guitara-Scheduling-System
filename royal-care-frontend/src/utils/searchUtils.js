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
      // Handle both field naming conventions
      const firstName = client.first_name || client.Name?.split(" ")[0] || "";
      const lastName =
        client.last_name || client.Name?.split(" ").slice(1).join(" ") || "";
      const fullName = `${firstName} ${lastName}`.trim();
      const phoneNumber = client.phone_number || client.Contact || "";
      const email = client.email || client.Email || "";

      return (
        fuzzyMatch(searchTerm, fullName) ||
        fuzzyMatch(searchTerm, firstName) ||
        fuzzyMatch(searchTerm, lastName) ||
        fuzzyMatch(searchTerm, phoneNumber) ||
        fuzzyMatch(searchTerm, email) ||
        // Also search in the original Name field if it exists
        (client.Name && fuzzyMatch(searchTerm, client.Name))
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
