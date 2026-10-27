import { useState } from 'react';
import type { BookingPayload } from '@/types/booking';
import { validateBookingContact, type ContactField } from './bookingContact';

export function BookingContactFields({ form, maxPeople, showErrors, onChange }: {
    form: BookingPayload;
    maxPeople: number;
    showErrors: boolean;
    onChange: (form: BookingPayload) => void;
}) {
    const [touched, setTouched] = useState<Partial<Record<ContactField, boolean>>>({});
    const errors = validateBookingContact(form, maxPeople);
    const visibleError = (field: ContactField) => (showErrors || touched[field]) ? errors[field] : undefined;
    const attributes = (field: ContactField) => ({
        'aria-invalid': Boolean(visibleError(field)),
        'aria-describedby': visibleError(field) ? `booking-${field}-error` : undefined,
        onBlur: () => setTouched(current => ({ ...current, [field]: true })),
    });
    const error = (field: ContactField) => visibleError(field) && <small id={`booking-${field}-error`} className="booking-inline-error" aria-live="polite">{visibleError(field)}</small>;
    const contact = (key: 'name' | 'email' | 'phone', value: string) => onChange({ ...form, contact: { ...form.contact, [key]: value } });
    return <>
        <div className="booking-modal-fields">
            <label>Họ và tên<input aria-label="Họ và tên" autoComplete="name" maxLength={120} {...attributes('name')} value={form.contact.name} onChange={event => contact('name', event.target.value)} />{error('name')}</label>
            <label>Email<input aria-label="Email" type="email" autoComplete="email" maxLength={200} {...attributes('email')} value={form.contact.email} onChange={event => contact('email', event.target.value)} />{error('email')}</label>
            <label>Số điện thoại<input aria-label="Số điện thoại" type="tel" autoComplete="tel" maxLength={30} {...attributes('phone')} value={form.contact.phone} onChange={event => contact('phone', event.target.value)} />{error('phone')}</label>
            <label>Số người<input aria-label="Số người" type="number" inputMode="numeric" min={1} max={maxPeople} step={1} {...attributes('participants')} value={form.participants || ''} onChange={event => onChange({ ...form, participants: Number(event.target.value) })} /><small>Gói đã chọn hỗ trợ tối đa {maxPeople} người.</small>{error('participants')}</label>
            <label className="booking-contact-address">Địa chỉ / khu vực<input aria-label="Địa chỉ / khu vực" placeholder="Ví dụ: Hồ Tây, Hà Nội" maxLength={500} {...attributes('address')} value={form.location.address} onChange={event => onChange({ ...form, location: { ...form.location, address: event.target.value } })} />{error('address')}</label>
        </div>
        <fieldset className="booking-contact-channels"><legend>Kênh liên hệ ưu tiên</legend><div>
            {([{ value: 'email', label: 'Email' }, { value: 'phone', label: 'Điện thoại' }, { value: 'zalo', label: 'Zalo' }] as const).map(channel => <label key={channel.value}><input type="radio" name="booking-contact-channel" value={channel.value} checked={form.contact.preferredChannel === channel.value} onChange={() => onChange({ ...form, contact: { ...form.contact, preferredChannel: channel.value } })} /><span>{channel.label}</span></label>)}
        </div></fieldset>
    </>;
}
