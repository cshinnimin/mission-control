/**
 * Capacity update helpers.
 *
 * Centralizes event wiring for capacity updates so containers can
 * persist changes and re-dispatch consistent events without duplicating
 * the same logic.
 */
import { saveCapacity } from './storage.js';

/**
 * Normalize capacity detail payloads from events.
 */
export const getCapacityPayload = (eventDetail) => {
  const id = eventDetail && eventDetail.id ? eventDetail.id : '';
  const capacity = eventDetail && typeof eventDetail.capacity === 'number'
    ? eventDetail.capacity
    : null;
  return { id, capacity };
};

/**
 * Persist capacity and optionally re-dispatch a capacity-updated event
 * from the provided host element.
 */
export const handleCapacityUpdate = (hostEl, payload, { dispatchEvent = true } = {}) => {
  if (!payload || !payload.id || payload.capacity == null) return;
  saveCapacity(payload.id, payload.capacity);
  if (dispatchEvent && hostEl) {
    hostEl.dispatchEvent(new CustomEvent('capacity-updated', {
      detail: { id: payload.id, capacity: payload.capacity },
      bubbles: true,
      composed: true
    }));
  }
};
