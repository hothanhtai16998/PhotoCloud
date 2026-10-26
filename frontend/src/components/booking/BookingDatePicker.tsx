import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getBookingToday } from './bookingDate';
import './BookingSchedule.css';

export function BookingDatePicker({ value, onChange }: { value: string; onChange: (date: string) => void }) {
    const today = getBookingToday();
    const [month, setMonth] = useState(() => (value || today).slice(0, 7));
    const [year, number] = month.split('-').map(Number);
    const offset = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(year, number, 0)).getUTCDate();
    const move = (delta: number) => setMonth(new Date(Date.UTC(year, number - 1 + delta, 1)).toISOString().slice(0, 7));
    return <fieldset className="booking-date-picker"><legend>Ngày mong muốn</legend>
        <div className="booking-calendar-heading">
            <button type="button" aria-label="Tháng trước" disabled={month <= today.slice(0, 7)} onClick={() => move(-1)}><ChevronLeft size={18} /></button>
            <strong aria-live="polite">Tháng {number}, {year}</strong>
            <button type="button" aria-label="Tháng sau" onClick={() => move(1)}><ChevronRight size={18} /></button>
        </div>
        <div className="booking-calendar-days">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <span className="booking-calendar-weekday" key={day}>{day}</span>)}
            {Array.from({ length: offset }, (_, i) => <span key={`empty-${i}`} />)}
            {Array.from({ length: days }, (_, i) => {
                const date = `${month}-${String(i + 1).padStart(2, '0')}`;
                return <button type="button" key={date} data-date={date} aria-label={`Ngày ${i + 1} tháng ${number} năm ${year}`} aria-pressed={value === date} aria-current={date === today ? 'date' : undefined} disabled={date < today} onClick={() => onChange(date)}>{i + 1}</button>;
            })}
        </div>
        <small aria-live="polite">{value ? `Đã chọn: ${value.split('-').reverse().join('/')}` : 'Chọn ngày bạn muốn chụp'}</small>
    </fieldset>;
}
