import { GoogleGenAI } from "@google/genai";
import { ProductMongoRepository } from "../repositories/product.repository";
import { CategoryMongoRepository } from "../repositories/category.repository";
import { BrandMongoRepository } from "../repositories/brand.repository";
import { ReviewMongoRepository } from "../repositories/review.repository";
import { ProductService } from "./product.service";
import { IProduct } from "../models/product.model";
import { HttpException } from "../exceptions/http-exception";
import { GEMINI_API_KEY } from "../config/constant";

const productRepository = new ProductMongoRepository();
const categoryRepository = new CategoryMongoRepository();
const brandRepository = new BrandMongoRepository();
const reviewRepository = new ReviewMongoRepository();
const productService = new ProductService();

const CANDIDATE_LIMIT = 5;
const NO_MATCH_REPLY =
    "I couldn't find a matching product in GadgetHub's catalog right now. Try describing what you need differently, " +
    "or browse our categories — I'm happy to help narrow it down!";

interface ComparisonProductData {
    name: string;
    sku?: string;
    brand?: { name?: string };
    category?: { name?: string };
    sellingPrice: number;
    originalPrice?: number;
    discount?: number;
    availability: string;
    weight?: string;
    dimensions?: string;
    warranty?: string;
    specifications?: Array<{ key: string; value: string }>;
    averageRating: number;
    totalReviews: number;
}

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

const COMPARE_SYSTEM_PROMPT = `You are GadgetHub AI Comparison Assistant.
You never invent products or specifications. Reason only from the product data provided in the user's message — nothing else.
Explain how the products compare across whichever of these areas are actually relevant to the type of product being compared: gaming, programming, office work, students, professionals, content creation, portability, battery life, overall performance, and value for money. Skip areas that don't meaningfully apply to this type of product — don't force a "gaming" verdict onto headphones, for example.
If one product wins in one area and another wins in a different area, say so explicitly as a trade-off rather than forcing a single overall winner.
If a specification needed to judge something isn't present in the data given, say plainly that it's unavailable — never assume or estimate a missing value.
End with a personalized recommendation naming which product suits which type of user (e.g. best for gamers, best for students on a budget, best for professionals).
Write in clear plain-English paragraphs. Do not use markdown formatting — no asterisks, no bullet points, no headers.`;

export class AiChatService {
    private getClient(): GoogleGenAI {
        if (!GEMINI_API_KEY) {
            throw new HttpException(500, "AI assistant is not configured");
        }
        return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    }

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

    private buildComparisonProductBlock(product: ComparisonProductData, index: number): string {
        const specLines = (product.specifications ?? [])
            .map((spec) => `   ${spec.key}: ${spec.value}`)
            .join("\n");

        const priceLine = product.originalPrice && product.originalPrice > product.sellingPrice
            ? `Price: Rs. ${product.sellingPrice.toLocaleString()} (Original: Rs. ${product.originalPrice.toLocaleString()}, Discount: ${product.discount ?? 0}%)`
            : `Price: Rs. ${product.sellingPrice.toLocaleString()}`;

        return [
            `${index + 1}. ${product.name}`,
            `Brand: ${product.brand?.name || "Not specified"}`,
            `Category: ${product.category?.name || "Not specified"}`,
            `SKU: ${product.sku || "Not specified"}`,
            priceLine,
            `Rating: ${product.totalReviews > 0 ? `${product.averageRating}/5 (${product.totalReviews} reviews)` : "No reviews yet"}`,
            `Stock: ${product.availability}`,
            `Weight: ${product.weight || "Not specified"}`,
            `Dimensions: ${product.dimensions || "Not specified"}`,
            `Warranty: ${product.warranty || "Not specified"}`,
            specLines ? `Specifications:\n${specLines}` : "Specifications: Not specified"
        ].join("\n");
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

        const client = this.getClient();

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

    async compareProducts(productIds: string[]): Promise<{ summary: string }> {
        const products = (await productService.getPublishedProductsByIds(productIds)) as unknown as ComparisonProductData[];

        if (products.length < 2) {
            throw new HttpException(400, "At least 2 valid products are required to generate a comparison");
        }

        const client = this.getClient();

        const userPrompt = [
            "Compare the following GadgetHub products in detail.",
            "",
            products.map((product, index) => this.buildComparisonProductBlock(product, index)).join("\n\n")
        ].join("\n");

        let response;
        try {
            response = await client.models.generateContent({
                model: "gemini-flash-lite-latest",
                contents: userPrompt,
                config: {
                    systemInstruction: COMPARE_SYSTEM_PROMPT,
                    maxOutputTokens: 1536
                }
            });
        } catch {
            throw new HttpException(502, "AI service is temporarily unavailable");
        }

        const summary = response.text?.trim();
        if (!summary) {
            throw new HttpException(502, "AI service is temporarily unavailable");
        }

        return { summary };
    }
}
