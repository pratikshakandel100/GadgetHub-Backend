import { ReviewMongoRepository, IReviewListResult } from "../repositories/review.repository";
import { OrderMongoRepository } from "../repositories/order.repository";
import { ProductMongoRepository } from "../repositories/product.repository";
import { IReview, ReviewStatus } from "../models/review.model";
import { HttpException } from "../exceptions/http-exception";
import { CreateReviewDTO } from "../dtos/review.dto";
import { SortOrder } from "../utils/query.util";

const reviewRepository = new ReviewMongoRepository();
const orderRepository = new OrderMongoRepository();
const productRepository = new ProductMongoRepository();

export class ReviewService {
    async createReview(userId: string, data: CreateReviewDTO): Promise<IReview> {
        const product = await productRepository.getById(data.product);
        if (!product) {
            throw new HttpException(404, "Product not found");
        }

        const order = await orderRepository.getById(data.order);
        if (!order || order.user._id.toString() !== userId) {
            throw new HttpException(404, "Order not found");
        }
        if (order.status !== "Delivered") {
            throw new HttpException(400, "You can only review products from delivered orders");
        }
        const purchasedItem = order.items.find((item) => item.product.toString() === data.product);
        if (!purchasedItem) {
            throw new HttpException(400, "This product is not part of the given order");
        }

        const alreadyReviewed = await reviewRepository.exists(userId, data.product, data.order);
        if (alreadyReviewed) {
            throw new HttpException(409, "You have already reviewed this product for this order");
        }

        try {
            return await reviewRepository.create({
                user: userId,
                product: data.product,
                order: data.order,
                rating: data.rating,
                comment: data.comment,
                images: data.images
            });
        } catch (error: any) {
            if (error.code === 11000) {
                throw new HttpException(409, "You have already reviewed this product for this order");
            }
            throw error;
        }
    }

    async getMyReviews(userId: string): Promise<IReview[]> {
        return await reviewRepository.getByUser(userId);
    }

    async getProductReviews(productId: string): Promise<{ reviews: IReview[]; averageRating: number; totalReviews: number }> {
        const reviews = await reviewRepository.getByProduct(productId);
        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
            : 0;
        return { reviews, averageRating, totalReviews };
    }

    async getAllReviews(
        page: number,
        limit: number,
        status: string,
        search: string,
        sort: Record<string, SortOrder>
    ): Promise<IReviewListResult> {
        return await reviewRepository.getAll(page, limit, status, search, sort);
    }

    async updateReviewStatus(id: string, status: ReviewStatus): Promise<IReview> {
        const review = await reviewRepository.updateStatus(id, status);
        if (!review) {
            throw new HttpException(404, "Review not found");
        }
        return review;
    }

    async deleteReview(id: string): Promise<void> {
        const deleted = await reviewRepository.delete(id);
        if (!deleted) {
            throw new HttpException(404, "Review not found");
        }
    }
}
