import React from 'react';
import { CalendarDays, Moon, Sun } from 'lucide-react';

interface Props {
  signInLabel: string;
  bookingLabel?: string;
  dark?: boolean;
  signInLink?: React.ReactNode;
  onToggleTheme?: () => void;
  onBooking?: () => void;
}
export function PublicHeaderActions({ signInLabel, bookingLabel = 'Đặt lịch chụp', dark = false, signInLink, onToggleTheme, onBooking }: Props): React.ReactElement {
  return <div className="public-guest-actions">
    <button type="button" className="site-theme-toggle public-theme-toggle" aria-label={dark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'} aria-pressed={dark} onClick={onToggleTheme}>
      <Moon className="public-theme-moon" size={19} aria-hidden="true" />
      <Sun className="public-theme-sun" size={19} aria-hidden="true" />
    </button>
    <span className="public-sign-in-slot">{signInLink ?? <a href="/signin" className="header-link public-sign-in">{signInLabel}</a>}</span>
    <button type="button" className="header-booking-button public-booking-button" aria-label={bookingLabel} onClick={onBooking}>
      <span><CalendarDays size={16} aria-hidden="true" /><span>{bookingLabel}</span></span>
    </button>
  </div>;
}
