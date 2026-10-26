/** A local wall-clock preference in the studio's Vietnam timezone, not confirmation. */
export const readRequestedTime = (value, fallbackSlot) => {
    if (value === undefined || value === '') return { time: undefined, slot: fallbackSlot };
    if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return { error: 'Giờ bắt đầu cần có dạng HH:mm hợp lệ' };
    const hour = Number(value.slice(0, 2));
    return { time: value, slot: hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening' };
};
