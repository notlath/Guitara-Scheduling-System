# Client Search Feature Documentation

## Overview

The AppointmentForm now includes a fuzzy search feature for client selection, replacing the traditional dropdown select with an interactive search input.

## Features

### 1. Fuzzy Matching

- **Partial Matches**: "Joh" returns "John"
- **Case Insensitive**: "JOHN" matches "john"
- **Character Sequence**: "jhn" matches "john" (characters in order but not consecutive)
- **Multiple Fields**: Searches across first name, last name, and phone number

### 2. User Interface

- **Search Input**: Type to search, shows selected client when not focused
- **Dropdown Results**: Live filtered results as you type
- **Keyboard Navigation**: Arrow keys to navigate, Enter to select, Escape to close
- **Click Selection**: Mouse click to select a client
- **Performance**: Limited to 50 results for optimal performance

### 3. Search Examples

#### Name Search

- Input: "joh" → Matches: "John Doe", "Johnson Smith"
- Input: "ma" → Matches: "Mary Johnson", "Mark Davis", "Amanda Lee"

#### Phone Search

- Input: "555" → Matches clients with "555" in phone number
- Input: "091" → Matches clients with "091" prefix

#### Fuzzy Search

- Input: "jn sm" → Could match "John Smith"
- Input: "mr dv" → Could match "Mark Davis"

## Implementation Details

### Component Structure

```jsx
<ClientSearchDropdown
  clients={clients}
  selectedClient={formData.client}
  onClientSelect={(clientId) => {
    setFormData((prev) => ({ ...prev, client: clientId || "" }));
    setErrors((prev) => (prev.client ? { ...prev, client: "" } : prev));
  }}
  error={errors.client}
  disabled={isSubmitting}
/>
```

### Fuzzy Match Algorithm

The fuzzy matching algorithm:

1. Checks for direct substring matches first (fastest)
2. Falls back to character sequence matching
3. Searches across multiple fields (name, phone)
4. Case-insensitive matching

### Performance Optimizations

- Results limited to 50 items
- Debounced search (via React's useMemo)
- Efficient character-by-character matching
- Minimal re-renders with proper state management

## Usage Instructions

### For Users

1. Click on the client field
2. Start typing the client's name or phone number
3. Use arrow keys or mouse to select from filtered results
4. Press Enter or click to select a client
5. Press Escape to close without selecting

### For Developers

The search component is fully integrated into the existing form validation and state management system. No changes needed to existing form handling logic.

## CSS Classes

- `.client-search-dropdown` - Main container
- `.client-search-input` - Search input field
- `.client-search-results` - Dropdown results container
- `.client-search-item` - Individual result item
- `.client-search-item.selected` - Highlighted result
- `.client-name` - Client name display
- `.client-phone` - Phone number display
- `.client-search-no-results` - No results message

## Accessibility Features

- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatible
- Focus management
- Proper tab handling

## Browser Support

Compatible with all modern browsers that support:

- ES6+ features
- React Hooks
- CSS Grid/Flexbox
