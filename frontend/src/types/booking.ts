export type BookingTimeSlot = 'morning' | 'afternoon' | 'evening' | 'flexible';
export type BookingLocationType = 'studio' | 'outdoor' | 'home' | 'other';
export type BookingStatus =
  | 'pending'
  | 'reviewing'
  | 'needs_information'
  | 'confirmed'
  | 'rescheduled'
  | 'completed'
  | 'cancelled_by_client'
  | 'cancelled_by_photographer'
  | 'rejected'
  | 'expired';

export interface BookingPackage {
  _id?: string;
  slug: string;
  name: string;
  description: string;
  durationMinutes: number;
  basePrice: number;
  includedPhotos: number;
  includedPeople: number;
  deliveryDays: number;
  category: string;
}

export interface BookingPayload {
  packageSlug: string;
  requestedDate: string;
  requestedTimeSlot: BookingTimeSlot;
  alternativeDate?: string;
  location: {
    type: BookingLocationType;
    address: string;
    mapUrl?: string;
  };
  participants: number;
  contact: {
    name: string;
    email: string;
    phone: string;
    preferredChannel: 'email' | 'phone' | 'zalo';
  };
  concept?: string;
  notes?: string;
}

export interface Booking {
  _id: string;
  bookingCode: string;
  packageSlug: string;
  packageSnapshot: Pick<BookingPackage, 'name' | 'durationMinutes' | 'basePrice' | 'includedPhotos'>;
  status: BookingStatus;
  requestedDate: string;
  requestedTimeSlot: BookingTimeSlot;
  alternativeDate?: string;
  confirmedDate?: string;
  confirmedStartTime?: string;
  confirmedEndTime?: string;
  location: BookingPayload['location'];
  participants: number;
  contact: BookingPayload['contact'];
  concept?: string;
  notes?: string;
  cancellationReason?: string;
  statusHistory: Array<{ from?: BookingStatus; to: BookingStatus; note?: string; createdAt: string }>;
  createdAt: string;
  updatedAt: string;
}
