export const BOOKING_MODAL_EVENT = 'photocloud:open-booking-modal';

export const openBookingModal = () => {
  window.dispatchEvent(new CustomEvent(BOOKING_MODAL_EVENT));
};
