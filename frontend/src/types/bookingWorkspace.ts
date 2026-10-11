export type ProductionStatus = 'not_started' | 'shoot_scheduled' | 'shoot_completed' | 'selecting' | 'editing' | 'quality_check' | 'delivering' | 'delivered';

export interface BookingWorkspace {
  _id: string;
  booking: string;
  contract: { title: string; content: string; status: 'draft' | 'sent' | 'accepted'; sentAt?: string; acceptedAt?: string };
  questionnaire: { answers: { style?: string; references?: string; outfit?: string; specialRequests?: string; portfolioPermission?: boolean }; submittedAt?: string };
  production: { status: ProductionStatus; note?: string; updatedAt?: string };
  gallery: { collection?: string; linkedAt?: string; deliveredAt?: string };
}
