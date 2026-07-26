const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

// Great-circle distance between two lat/lng points, in kilometers. Accurate
// enough for shipping-zone pricing — it ignores road routing entirely, which
// is an accepted tradeoff for a straight-line-distance-based charge.
export const haversineDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
};
