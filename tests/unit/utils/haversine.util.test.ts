import { haversineDistanceKm } from "../../../src/utils/haversine.util";

describe("haversineDistanceKm", () => {
    it("returns 0 for identical coordinates", () => {
        expect(haversineDistanceKm(27.7172, 85.324, 27.7172, 85.324)).toBeCloseTo(0, 5);
    });

    it("computes a known real-world distance (Kathmandu to Pokhara, ~142km great-circle)", () => {
        const distance = haversineDistanceKm(27.7172, 85.324, 28.2096, 83.9856);
        expect(distance).toBeGreaterThan(135);
        expect(distance).toBeLessThan(150);
    });

    it("is symmetric regardless of point order", () => {
        const a = haversineDistanceKm(27.7, 85.3, 28.2, 84.0);
        const b = haversineDistanceKm(28.2, 84.0, 27.7, 85.3);
        expect(a).toBeCloseTo(b, 8);
    });
});
