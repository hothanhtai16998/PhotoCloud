/** Parse numeric coordinates; zero is valid, missing/non-finite/out-of-range values are not. */
export function parseImageCoordinates(value) {
    let coordinates;
    try {
        coordinates = typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
        return undefined;
    }
    if (!coordinates || typeof coordinates !== 'object') return undefined;
    const { latitude, longitude } = coordinates;
    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) return undefined;
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return undefined;
    return { latitude: lat, longitude: lon };
}
