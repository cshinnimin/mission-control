/**
 * Capacity modal helpers.
 *
 * Provides shared utilities to open/close the CapacityCard modal with
 * the correct payload (epic title/id/holidays), so containers don't
 * duplicate the wiring logic.
 */
export const openCapacityModal = (capacityCardEl, { title, id, holidays }) => {
  if (!capacityCardEl) return;
  capacityCardEl.setAttribute('data', JSON.stringify({
    title: title || '',
    id: id || '',
    holidays: holidays || []
  }));
  capacityCardEl.setAttribute('open', '');
};

/**
 * Close the CapacityCard modal if present.
 */
export const closeCapacityModal = (capacityCardEl) => {
  if (!capacityCardEl) return;
  capacityCardEl.removeAttribute('open');
};
