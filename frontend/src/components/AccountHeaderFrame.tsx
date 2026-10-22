import React from 'react';
import { Bell, CalendarDays, Shield } from 'lucide-react';

// Presentation only. The startup defaults never contain identity or unread data.
export function AccountHeaderFrame({ admin = false, booking, administration, notifications, account }: {
  admin?: boolean;
  booking?: React.ReactNode;
  administration?: React.ReactNode;
  notifications?: React.ReactNode;
  account?: React.ReactNode;
}): React.ReactElement {
  return <div className="header-actions-group account-header-frame">
    {booking ?? <button type="button" disabled className="header-booking-button public-booking-button"><span><CalendarDays size={16} /><span>Đặt lịch chụp</span></span></button>}
    {admin && <div className="header-admin-group">{administration ?? <span className="account-admin-placeholder"><Shield size={20} /></span>}</div>}
    <div className="account-notifications-slot">{notifications ?? <span className="account-bell-placeholder"><Bell size={24} /></span>}</div>
    <div className="account-avatar-slot">{account ?? <span className="account-avatar-placeholder" />}</div>
  </div>;
}
