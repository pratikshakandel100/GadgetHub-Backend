import { GoogleGenAI } from "@google/genai";
import { ProductMongoRepository } from "../repositories/product.repository";
import { CategoryMongoRepository } from "../repositories/category.repository";
import { BrandMongoRepository } from "../repositories/brand.repository";
import { ReviewMongoRepository } from "../repositories/review.repository";
import { IProduct } from "../models/product.model";
import { HttpException } from "../exceptions/http-exception";
import { GEMINI_API_KEY } from "../config/constant";

const productRepository = new ProductMongoRepository();
const categoryRepository = new CategoryMongoRepository();
const brandRepository = new BrandMongoRepository();
const reviewRepository = new ReviewMongoRepository();

const CANDIDATE_LIMIT = 5;
const NO_MATCH_REPLY =
    "I couldn't find a matching product in GadgetHub's catalog right now. Try describing what you need differently, " +
    "or browse our categories — I'm happy to help narrow it down!";

const STOPWORDS = new Set([
    "a", "an", "the", "i", "me", "my", "need", "want", "looking", "for", "of", "to", "is", "are",
    "with", "and", "or", "under", "below", "less", "than", "budget", "npr", "rs", "please", "can",
    "you", "recommend", "suggest", "best", "good", "in", "on", "at", "some", "any"
]);

const SYSTEM_PROMPT = `You are GadgetHub AI, an AI shopping assistant for GadgetHub.
You never invent products. Only recommend products from the "Available Products" list provided in the user's message.
If none of the available products suit the request, politely explain that GadgetHub currently doesn't have a matching product — do not force a recommendation.
When products are available, compare them where relevant and explain which one is better and why.
Keep the answer under 150 words. End with a clear buying recommendation.`;

export class AiChatService {
    private extractBudget(message: string): number | undefined {
        const match = message.match(/(?:under|below|less than|budget of)?\s*(?:npr|rs\.?)?\s*([\d][\d,]{2,})/i);
        if (!match) return undefined;
        const value = Number(match[1].replace(/,/g, ""));
        return Number.isFinite(value) && value > 0 ? value : undefined;
    }

    private extractKeywords(message: string): string[] {
        return Array.from(
            new Set(
                message
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, " ")
                    .split(/\s+/)
                    .filter((word) => word.length > 2 && !STOPWORDS.has(word) && Number.isNaN(Number(word)))
            )
        );
    }

    private buildProductBlock(product: IProduct, index: number): string {
        const specLines = (product.specifications ?? [])
            .map((spec) => `   ${spec.key}: ${spec.value}`)
            .join("\n");

        return [
            `${index + 1}.`,
            `Name: ${product.name}`,
            `Price: Rs. ${product.sellingPrice.toLocaleString()}`,
            specLines,
            `Stock: ${product.availability}`
        ]
            .filter(Boolean)
            .join("\n");
    }

    private async attachRatings(products: IProduct[]): Promise<Record<string, unknown>[]> {
        if (products.length === 0) return [];
        const ids = products.map((p) => p._id.toString());
        const ratingSummary = await reviewRepository.getRatingSummaryByProductIds(ids);

        return products.map((product) => {
            const rating = ratingSummary[product._id.toString()];
            return {
                ...product.toObject(),
                averageRating: rating ? Math.round(rating.averageRating * 10) / 10 : 0,
                totalReviews: rating?.totalReviews ?? 0
            };
        });
    }

    async chat(message: string): Promise<{ reply: string; recommendedProducts: Record<string, unknown>[] }> {
        const maxPrice = this.extractBudget(message);
        const keywords = this.extractKeywords(message);

        const [matchedCategories, matchedBrands] = keywords.length > 0
            ? await Promise.all([categoryRepository.getPublished(""), brandRepository.getAll("", {})])
            : [[], { brands: [], total: 0 }];

        const categoryIds = matchedCategories
            .filter((category) => keywords.some((k) => category.name.toLowerCase().includes(k)))
            .map((category) => category._id.toString());
        const brandIds = matchedBrands.brands
            .filter((brand) => keywords.some((k) => brand.name.toLowerCase().includes(k)))
            .map((brand) => brand._id.toString());

        const candidates = await productRepository.searchForAssistant({
            keywords,
            categoryIds,
            brandIds,
            maxPrice,
            limit: CANDIDATE_LIMIT
        });

        if (candidates.length === 0) {
            return { reply: NO_MATCH_REPLY, recommendedProducts: [] };
        }

        if (!GEMINI_API_KEY) {
            throw new HttpException(500, "AI assistant is not configured");
        }

        const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

        const userPrompt = [
            `User Request:\n"${message}"`,
            "",
            "Available Products",
            "",
            candidates.map((product, index) => this.buildProductBlock(product, index)).join("\n\n")
        ].join("\n");

        let response;
        try {
            response = await client.models.generateContent({
                model: "gemini-flash-lite-latest",
                contents: userPrompt,
                config: {
                    systemInstruction: SYSTEM_PROMPT,
                    maxOutputTokens: 1024
                }
            });
        } catch {
            throw new HttpException(502, "AI service is temporarily unavailable");
        }

        const reply = response.text?.trim() || NO_MATCH_REPLY;

        const recommendedProducts = await this.attachRatings(candidates);
        return { reply, recommendedProducts };
    }
}
