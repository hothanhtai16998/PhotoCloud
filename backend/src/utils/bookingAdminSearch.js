export function bookingAdminSearch(value) {
    const text = String(value || '').trim().slice(0, 100);
    if (!text) return {};
    const literal = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { $or: ['bookingCode', 'contact.name', 'contact.phone', 'contact.email'].map(field => ({ [field]: { $regex: literal, $options: 'i' } })) };
}
