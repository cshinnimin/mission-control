/**
 * Storage helpers for persistence across components.
 */
const capacityKey = (id) => `progress-card-capacity-${id}`;

/**
 * Load capacity value for an epic from localStorage.
 */
export const loadCapacity = (id, defaultValue = 1.0) => {
  if (!id) return defaultValue;
  try {
    const stored = localStorage.getItem(capacityKey(id));
    if (stored !== null) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load capacity from localStorage:', e);
  }
  return defaultValue;
};

/**
 * Save capacity value for an epic to localStorage.
 */
export const saveCapacity = (id, capacity) => {
  if (!id) return;
  try {
    localStorage.setItem(capacityKey(id), String(capacity));
  } catch (e) {
    console.warn('Failed to save capacity to localStorage:', e);
  }
};
