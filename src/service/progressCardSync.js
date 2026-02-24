/**
 * Progress card synchronization helpers.
 *
 * Updates the progress-card's data payload to keep the displayed
 * capacity value in sync with storage and capacity updates.
 */
export const applyCapacityToProgressCard = (rootEl, id, capacity) => {
  if (!rootEl || !id || capacity == null) return;
  const card = rootEl.querySelector(`progress-card[data-id="${id}"]`);
  if (!card) return;
  let raw = card.getAttribute('data') || '{}';
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) { parsed = {}; }
  parsed.capacity = capacity;
  card.setAttribute('data', JSON.stringify(parsed));
};
