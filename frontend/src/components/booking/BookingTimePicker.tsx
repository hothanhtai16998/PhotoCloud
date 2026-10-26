import { useId } from 'react';
import './BookingSchedule.css';
import { timeSlotForHour } from '@/utils/bookingTime';
import type { BookingTimeSlot } from '@/types/booking';

const groups = [
    { name: 'Buổi sáng', from: 0, to: 12 },
    { name: 'Buổi chiều', from: 12, to: 18 },
    { name: 'Buổi tối', from: 18, to: 24 },
];
export function BookingTimePicker({ value, onChange }: { value?: string; onChange: (time: string, slot: BookingTimeSlot) => void }) {
    const name = useId();
    const option = (time: string, text: string) => <label key={time} className="booking-time-option"><input type="radio" name={name} value={time} checked={(value || '') === time} onChange={() => onChange(time, timeSlotForHour(time))} /><span>{text}</span></label>;
    return <fieldset className="booking-time-picker"><legend>Giờ bắt đầu mong muốn</legend>
        {option('', 'Linh hoạt — trao đổi với studio')}
        <div className="booking-time-options" tabIndex={0} aria-label="Các giờ mong muốn, cuộn để xem thêm">
            {groups.map(group => <div key={group.name} className="booking-time-group"><span className="booking-time-group-name">{group.name}</span>{Array.from({ length: (group.to - group.from) * 4 }, (_, i) => {
                const time = String(group.from + Math.floor(i / 4)).padStart(2, '0') + ':' + String(i % 4 * 15).padStart(2, '0');
                return option(time, time);
            })}</div>)}
        </div>
        <small>Giờ Việt Nam (UTC+7) · Giờ đề xuất, studio sẽ xác nhận.</small>
    </fieldset>;
}
