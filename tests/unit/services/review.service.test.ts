jest.mock("../../../src/repositories/review.repository", () => {
    const mockReviewRepository = {
        exists: jest.fn(),
        create: jest.fn(),
        getByUser: jest.fn(),
        getByProduct: jest.fn(),
        getAll: jest.fn(),
        updateStatus: jest.fn(),
        delete: jest.fn(),
    };
    return {
        ReviewMongoRepository: jest.fn().mockImplementation(() => mockReviewRepository),
        __mockReviewRepository: mockReviewRepository,
    };
});

jest.mock("../../../src/repositories/order.repository", () => {
    const mockOrderRepository = { getById: jest.fn() };
    return {
        OrderMongoRepository: jest.fn().mockImplementation(() => mockOrderRepository),
        __mockOrderRepository: mockOrderRepository,
    };
});

jest.mock("../../../src/repositories/product.repository", () => {
    const mockProductRepository = { getById: jest.fn() };
    return {
        ProductMongoRepository: jest.fn().mockImplementation(() => mockProductRepository),
        __mockProductRepository: mockProductRepository,
    };
});

import { ReviewService } from "../../../src/services/review.service";
import * as ReviewRepoModule from "../../../src/repositories/review.repository";
import * as OrderRepoModule from "../../../src/repositories/order.repository";
import * as ProductRepoModule from "../../../src/repositories/product.repository";

const mockReviewRepository = (ReviewRepoModule as any).__mockReviewRepository;
const mockOrderRepository = (OrderRepoModule as any).__mockOrderRepository;
const mockProductRepository = (ProductRepoModule as any).__mockProductRepository;

const USER_ID = "u1";
const DELIVERED_ORDER = {
    _id: "o1",
    user: { _id: { toString: () => USER_ID } },
    status: "Delivered",
    items: [{ product: { toString: () => "p1" } }],
};

const reviewPayload = { product: "p1", order: "o1", rating: 5, comment: "Excellent", images: [] };

describe("ReviewService.createReview", () => {
    beforeEach(() => {
        mockProductRepository.getById.mockResolvedValue({ _id: "p1" });
        mockReviewRepository.exists.mockResolvedValue(false);
    });

    it("rejects when the product doesn't exist", async () => {
        mockProductRepository.getById.mockResolvedValue(null);
        await expect(new ReviewService().createReview(USER_ID, reviewPayload as any)).rejects.toThrow("Product not found");
    });

    it("rejects when the order doesn't belong to this user", async () => {
        mockOrderRepository.getById.mockResolvedValue({ ...DELIVERED_ORDER, user: { _id: { toString: () => "someone-else" } } });
        await expect(new ReviewService().createReview(USER_ID, reviewPayload as any)).rejects.toThrow("Order not found");
    });

    it("rejects reviewing an order that hasn't been delivered yet", async () => {
        mockOrderRepository.getById.mockResolvedValue({ ...DELIVERED_ORDER, status: "Shipped" });
        await expect(new ReviewService().createReview(USER_ID, reviewPayload as any)).rejects.toThrow(
            "You can only review products from delivered orders"
        );
    });

    it("rejects a product that wasn't part of the given order", async () => {
        mockOrderRepository.getById.mockResolvedValue({ ...DELIVERED_ORDER, items: [{ product: { toString: () => "different-product" } }] });
        await expect(new ReviewService().createReview(USER_ID, reviewPayload as any)).rejects.toThrow(
            "This product is not part of the given order"
        );
    });

    it("rejects a duplicate review for the same product and order", async () => {
        mockOrderRepository.getById.mockResolvedValue(DELIVERED_ORDER);
        mockReviewRepository.exists.mockResolvedValue(true);
        await expect(new ReviewService().createReview(USER_ID, reviewPayload as any)).rejects.toThrow(
            "You have already reviewed this product for this order"
        );
    });

    it("creates the review once every check passes", async () => {
        mockOrderRepository.getById.mockResolvedValue(DELIVERED_ORDER);
        mockReviewRepository.create.mockResolvedValue({ _id: "r1", ...reviewPayload });

        const review = await new ReviewService().createReview(USER_ID, reviewPayload as any);

        expect(review._id).toBe("r1");
    });

    it("translates a Mongo duplicate-key error into a friendly 409", async () => {
        mockOrderRepository.getById.mockResolvedValue(DELIVERED_ORDER);
        mockReviewRepository.create.mockRejectedValue({ code: 11000 });

        await expect(new ReviewService().createReview(USER_ID, reviewPayload as any)).rejects.toThrow(
            "You have already reviewed this product for this order"
        );
    });
});

describe("ReviewService.getProductReviews", () => {
    it("returns a zero average when there are no reviews yet", async () => {
        mockReviewRepository.getByProduct.mockResolvedValue([]);
        const result = await new ReviewService().getProductReviews("p1");
        expect(result).toEqual({ reviews: [], averageRating: 0, totalReviews: 0 });
    });

    it("computes the average rating across all reviews", async () => {
        mockReviewRepository.getByProduct.mockResolvedValue([{ rating: 4 }, { rating: 5 }, { rating: 3 }]);
        const result = await new ReviewService().getProductReviews("p1");
        expect(result.totalReviews).toBe(3);
        expect(result.averageRating).toBeCloseTo(4, 5);
    });
});

describe("ReviewService.updateReviewStatus / deleteReview", () => {
    it("throws 404 when updating a review that doesn't exist", async () => {
        mockReviewRepository.updateStatus.mockResolvedValue(null);
        await expect(new ReviewService().updateReviewStatus("r1", "Flagged")).rejects.toThrow("Review not found");
    });

    it("throws 404 when deleting a review that doesn't exist", async () => {
        mockReviewRepository.delete.mockResolvedValue(false);
        await expect(new ReviewService().deleteReview("r1")).rejects.toThrow("Review not found");
    });
});
