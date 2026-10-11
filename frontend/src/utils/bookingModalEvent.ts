export const BOOKING_MODAL_EVENT = 'photocloud:open-booking-modal';

export type BookingModalMode = 'package' | 'custom-quote';

export interface BookingModalDetail {
  /** Pre-selects a package by id (matches CORE_PACKAGES[].id). */
  selectedPackageId?: string;
  /** Switches the modal to a custom-quote intake form. */
  mode?: BookingModalMode;
}

const isDetail = (value: unknown): value is BookingModalDetail => {
  return typeof value === 'object' && value !== null;
};

/** Open the booking modal. Optionally pre-select a package or open in custom-quote mode. */
export const openBookingModal = (detail: BookingModalDetail = {}) => {
  const payload: BookingModalDetail = {};
  if (detail.selectedPackageId) payload.selectedPackageId = detail.selectedPackageId;
  if (detail.mode) payload.mode = detail.mode;
  window.dispatchEvent(new CustomEvent<BookingModalDetail>(BOOKING_MODAL_EVENT, { detail: payload }));
};

/** Returns the latest booking modal detail, useful for sync callers. */
export const getBookingModalDetail = (event: Event): BookingModalDetail => {
  const ce = event as CustomEvent<BookingModalDetail | undefined>;
  if (isDetail(ce.detail)) return ce.detail;
  return {};
};
