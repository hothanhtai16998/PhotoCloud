import type { BookingPayload } from '@/types/booking';

export type ContactField = 'name' | 'email' | 'phone' | 'participants' | 'address';
export type ContactErrors = Partial<Record<ContactField, string>>;

export function validateBookingContact(form: BookingPayload, maxPeople: number): ContactErrors {
    const errors: ContactErrors = {};
    const { name, email, phone } = form.contact;
    if (!name.trim()) errors.name = 'Bạn nhập họ và tên nhé.';
    else if (name.trim().length > 120) errors.name = 'Họ và tên tối đa 120 ký tự.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || email.trim().length > 200) errors.email = 'Bạn nhập email hợp lệ nhé.';
    const digits = phone.replace(/\D/g, '');
    if (!/^\+?[\d\s().-]+$/.test(phone.trim()) || digits.length < 7 || digits.length > 15) errors.phone = 'Nhập số điện thoại gồm 7–15 chữ số, có thể dùng mã quốc gia +84.';
    if (!Number.isInteger(form.participants) || form.participants < 1 || form.participants > maxPeople) errors.participants = `Số người phải là số nguyên từ 1 đến ${maxPeople}.`;
    if (!form.location.address.trim()) errors.address = 'Bạn nhập địa chỉ hoặc khu vực muốn chụp nhé.';
    else if (form.location.address.trim().length > 500) errors.address = 'Địa chỉ tối đa 500 ký tự.';
    return errors;
}

export function normalizeBookingContact(form: BookingPayload): BookingPayload {
    return {
        ...form,
        contact: { ...form.contact, name: form.contact.name.trim(), email: form.contact.email.trim().toLowerCase(), phone: form.contact.phone.replace(/[\s().-]/g, '') },
        location: { ...form.location, address: form.location.address.trim() },
    };
}
