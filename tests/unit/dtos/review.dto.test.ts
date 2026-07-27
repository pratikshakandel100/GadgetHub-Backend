import { CreateReviewSchema, UpdateReviewStatusSchema } from "../../../src/types/review.type";

const basePayload = {
    product: "prod1",
    order: "order1",
    rating: 4,
    comment: "Great product, works as expected.",
};

describe("CreateReviewSchema", () => {
    it("accepts a valid review with no images", () => {
        const result = CreateReviewSchema.safeParse(basePayload);
        expect(result.success).toBe(true);
        expect(result.success && result.data.images).toEqual([]);
    });

    it("rejects a rating below 1 or above 5", () => {
        expect(CreateReviewSchema.safeParse({ ...basePayload, rating: 0 }).success).toBe(false);
        expect(CreateReviewSchema.safeParse({ ...basePayload, rating: 6 }).success).toBe(false);
    });

    it("rejects an empty comment", () => {
        expect(CreateReviewSchema.safeParse({ ...basePayload, comment: "  " }).success).toBe(false);
    });

    it("rejects more than 5 images", () => {
        const images = ["a", "b", "c", "d", "e", "f"];
        expect(CreateReviewSchema.safeParse({ ...basePayload, images }).success).toBe(false);
    });

    it("normalizes a single image string into an array", () => {
        const result = CreateReviewSchema.safeParse({ ...basePayload, images: "single.jpg" });
        expect(result.success).toBe(true);
        expect(result.success && result.data.images).toEqual(["single.jpg"]);
    });
});

describe("UpdateReviewStatusSchema", () => {
    it("accepts a valid status", () => {
        expect(UpdateReviewStatusSchema.safeParse({ status: "Published" }).success).toBe(true);
        expect(UpdateReviewStatusSchema.safeParse({ status: "Flagged" }).success).toBe(true);
    });

    it("rejects an invalid status", () => {
        expect(UpdateReviewStatusSchema.safeParse({ status: "Deleted" }).success).toBe(false);
    });
});
