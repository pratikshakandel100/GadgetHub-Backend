import { z } from "zod";

const optionalString = z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().optional()
);

const booleanFromString = z.preprocess(
    (value) => value === "true" || value === true,
    z.boolean()
);

const specificationsArray = z.preprocess(
    (value) => {
        if (typeof value !== "string") return value;
        if (value === "") return [];
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    },
    z.array(z.object({
        key: z.string().min(1),
        value: z.string().min(1)
    })).optional().default([])
);

const variantsArray = z.preprocess(
    (value) => {
        if (typeof value !== "string") return value;
        if (value === "") return [];
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    },
    z.array(z.object({
        type: z.string().min(1),
        values: z.string().min(1)
    })).optional().default([])
);

const variantAttributesArray = z.preprocess(
    (value) => {
        if (typeof value !== "string") return value;
        if (value === "") return [];
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    },
    z.array(z.object({
        key: z.string().min(1),
        value: z.string().min(1)
    })).optional().default([])
);

const attributesRecord = z.preprocess(
    (value) => {
        if (typeof value !== "string") return value;
        if (value === "") return {};
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    },
    z.record(z.string(), z.string()).optional().default({})
);

export const ProductSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    category: z.string().min(1, "Category is required"),
    subcategory: optionalString,
    brand: z.string().min(1, "Brand is required"),
    shortDescription: z.string().min(1, "Short description is required"),
    fullDescription: z.string().min(1, "Full description is required"),
    originalPrice: z.coerce.number().positive("Original price must be greater than 0"),
    sellingPrice: z.coerce.number().positive("Selling price must be greater than 0"),
    discount: z.coerce.number().min(0).default(0),
    taxMargin: z.preprocess(
        (value) => value === "" || value === undefined ? undefined : value,
        z.coerce.number().optional()
    ),
    stockQuantity: z.coerce.number().min(0).default(0),
    minimumStockAlert: z.coerce.number().min(0).default(5),
    availability: z.enum(["In Stock", "Out of Stock", "Pre-order"]).default("In Stock"),
    specifications: specificationsArray,
    variants: variantsArray,
    variantAttributes: variantAttributesArray,
    attributes: attributesRecord,
    weight: optionalString,
    dimensions: optionalString,
    shippingCharge: z.preprocess(
        (value) => value === "" || value === undefined ? undefined : value,
        z.coerce.number().optional()
    ),
    estimatedDelivery: optionalString,
    manufacturer: optionalString,
    countryOfOrigin: optionalString,
    whatsIncluded: optionalString,
    warranty: optionalString,
    returnPolicy: optionalString,
    mainImage: optionalString,
    galleryImages: z.array(z.string()).optional().default([]),
    thumbnailImage: optionalString,
    metaTitle: optionalString,
    metaDescription: optionalString,
    tags: optionalString,
    featured: booleanFromString,
    newArrival: booleanFromString,
    bestSeller: booleanFromString,
    onSale: booleanFromString,
    status: z.enum(["Draft", "Published"]).default("Draft")
});

export type ProductType = z.infer<typeof ProductSchema>;
