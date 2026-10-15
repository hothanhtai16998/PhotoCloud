const categories = {
    email: new Set(['comments', 'likes', 'follows', 'bookings', 'newsletters']),
    push: new Set(['comments', 'likes', 'follows', 'bookings']),
};

export function buildNotificationPreferencesUpdate(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new Error('Preferences must be an object.');
    }
    const update = {};
    for (const [channel, allowed] of Object.entries(categories)) {
        const values = body[channel];
        if (values === undefined) continue;
        if (!values || typeof values !== 'object' || Array.isArray(values)) {
            throw new Error(`${channel} must be an object.`);
        }
        for (const [key, value] of Object.entries(values)) {
            if (allowed.has(key) && typeof value === 'boolean') {
                update[`notificationPreferences.${channel}.${key}`] = value;
            }
        }
    }
    if (!Object.keys(update).length) throw new Error('No valid values to update.');
    return update;
}
