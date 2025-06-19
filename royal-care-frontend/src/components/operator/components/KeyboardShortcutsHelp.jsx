/**
 * Keyboard Shortcuts Help Modal
 * Displays available keyboard shortcuts for operators
 */
import { useEffect, useState } from "react";
import "./KeyboardShortcutsHelp.module.css";

const KeyboardShortcutsHelp = ({ isOpen, onClose, shortcuts = [] }) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter shortcuts based on search query
  const filteredShortcuts = shortcuts.filter(
    (shortcut) =>
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group shortcuts by category
  const groupedShortcuts = filteredShortcuts.reduce((groups, shortcut) => {
    const category = getShortcutCategory(shortcut.key);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(shortcut);
    return groups;
  }, {});

  // Determine shortcut category
  function getShortcutCategory(key) {
    if (key.includes("ctrl+shift")) return "Bulk Actions";
    if (key.includes("ctrl+") && /\d/.test(key)) return "Navigation";
    if (key.includes("f5") || key.includes("ctrl+r")) return "Refresh";
    if (key.includes("ctrl+f") || key.includes("ctrl+e")) return "Tools";
    if (key === "escape" || key.includes("ctrl+a")) return "Selection";
    return "General";
  }

  // Format key display
  const formatKey = (key) => {
    return key
      .split("+")
      .map((k) => {
        const keyMap = {
          ctrl: "Ctrl",
          shift: "Shift",
          alt: "Alt",
          meta: "Cmd",
        };
        return keyMap[k] || k.toUpperCase();
      })
      .join(" + ");
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="shortcuts-modal-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-modal-header">
          <h2>
            <i className="fas fa-keyboard"></i>
            Keyboard Shortcuts
          </h2>
          <button className="close-button" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="shortcuts-modal-body">
          {/* Search bar */}
          <div className="shortcuts-search">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          {/* Shortcuts list */}
          <div className="shortcuts-content">
            {Object.keys(groupedShortcuts).length === 0 ? (
              <div className="no-shortcuts">
                <i className="fas fa-search"></i>
                <p>No shortcuts found matching "{searchQuery}"</p>
              </div>
            ) : (
              Object.entries(groupedShortcuts).map(
                ([category, categoryShortcuts]) => (
                  <div key={category} className="shortcuts-category">
                    <h3 className="category-title">{category}</h3>
                    <div className="shortcuts-list">
                      {categoryShortcuts.map((shortcut, index) => (
                        <div key={index} className="shortcut-item">
                          <div className="shortcut-keys">
                            {formatKey(shortcut.key)
                              .split(" + ")
                              .map((key, keyIndex) => (
                                <span key={keyIndex}>
                                  <kbd className="key">{key}</kbd>
                                  {keyIndex <
                                    formatKey(shortcut.key).split(" + ")
                                      .length -
                                      1 && (
                                    <span className="key-separator">+</span>
                                  )}
                                </span>
                              ))}
                          </div>
                          <div className="shortcut-description">
                            {shortcut.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>

        <div className="shortcuts-modal-footer">
          <div className="shortcuts-tip">
            <i className="fas fa-lightbulb"></i>
            <span>
              Tip: Press <kbd>?</kbd> or <kbd>Ctrl + /</kbd> to toggle this help
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
