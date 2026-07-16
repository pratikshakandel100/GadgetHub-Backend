import Review, { IReview, ReviewStatus } from "../models/review.model";
import { buildPaginationMeta, SortOrder } from "../utils/query.util";

export interface IReviewListResult {
    reviews: IReview[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ICreateReviewData {
    user: string;
    product: string;
    order: string;
    rating: number;
    comment: string;
    images?: string[];
}

export interface IReviewRepository {
    create(data: ICreateReviewData): Promise<IReview>;
    getByUser(userId: string): Promise<IReview[]>;
    getByProduct(productId: string): Promise<IReview[]>;
    exists(userId: string, productId: string, orderId: string): Promise<boolean>;
    getAll(page: number, limit: number, status: string, search: string, sort: Record<string, SortOrder>): Promise<IReviewListResult>;
    updateStatus(id: string, status: ReviewStatus): Promise<IReview | null>;
    delete(id: string): Promise<boolean>;
}

const USER_POPULATE = { path: "user", select: "fullname email" };
const PRODUCT_POPULATE = { path: "product", select: "name mainImage" };

export class ReviewMongoRepository implements IReviewRepository {
    async create(data: ICreateReviewData): Promise<IReview> {
        const created = await Review.create(data);
        return created.populate([USER_POPULATE, PRODUCT_POPULATE]);
    }

    async getByUser(userId: string): Promise<IReview[]> {
        return await Review.find({ user: userId }).populate(PRODUCT_POPULATE);
    }

    async getByProduct(productId: string): Promise<IReview[]> {
        return await Review.find({ product: productId, status: "Published" })
            .populate(USER_POPULATE)
            .sort({ createdAt: -1 });
    }

    async exists(userId: string, productId: string, orderId: string): Promise<boolean> {
        const found = await Review.exists({ user: userId, product: productId, order: orderId });
        return !!found;
    }

    async getAll(page: number, limit: number, status: string, search: string, sort: Record<string, SortOrder>): Promise<IReviewListResult> {
        const matchStage: any = {};
        if (status) matchStage.status = status;

        const basePipeline: any[] = [
            { $match: matchStage },
            { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "user" } },
            { $unwind: "$user" },
            { $lookup: { from: "products", localField: "product", foreignField: "_id", as: "product" } },
            { $unwind: "$product" }
        ];

        if (search) {
            basePipeline.push({
                $match: {
                    $or: [
                        { "user.fullname": { $regex: search, $options: "i" } },
                        { "product.name": { $regex: search, $options: "i" } }
                    ]
                }
            });
        }

        const dataPipeline = [
            ...basePipeline,
            { $sort: sort },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
                $project: {
                    rating: 1,
                    comment: 1,
                    images: 1,
                    status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    "user._id": 1,
                    "user.fullname": 1,
                    "user.email": 1,
                    "product._id": 1,
                    "product.name": 1,
                    "product.mainImage": 1
                }
            }
        ];
        const countPipeline = [...basePipeline, { $count: "total" }];

        const [reviews, countResult] = await Promise.all([
            Review.aggregate(dataPipeline),
            Review.aggregate(countPipeline)
        ]);

        const total = countResult[0]?.total || 0;
        return { reviews, ...buildPaginationMeta(total, page, limit) };
    }

    async updateStatus(id: string, status: ReviewStatus): Promise<IReview | null> {
        return await Review.findByIdAndUpdate(
            id,
            { $set: { status } },
            { new: true, runValidators: true }
        ).populate([USER_POPULATE, PRODUCT_POPULATE]);
    }

    async delete(id: string): Promise<boolean> {
        const deleted = await Review.findByIdAndDelete(id);
        return !!deleted;
    }
}
