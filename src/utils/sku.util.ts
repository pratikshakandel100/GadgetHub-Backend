export interface IVariantAttributeInput {
    key: string;
    value: string;
}

/**
 * Strips whitespace and collapses internal runs of spaces so that
 * "Space Gray" and "space  grey " normalize to comparable forms
 * (case handled separately by the caller).
 */
export const normalizeText = (value: string): string =>
    value.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Builds the seller-scoped identity key used to detect duplicate variants.
 * Category/brand are compared by their ObjectId (already a canonical
 * reference) rather than by name, so a rename can't create false negatives.
 */
export const buildVariantKey = (
    sellerId: string,
    productName: string,
    brandId: string,
    categoryId: string,
    attributes: IVariantAttributeInput[]
): string => {
    const normalizedAttributes = attributes
        .map((attr) => `${normalizeText(attr.key)}:${normalizeText(attr.value)}`)
        .sort()
        .join("|");

    return [
        sellerId,
        normalizeText(productName),
        brandId,
        categoryId,
        normalizedAttributes
    ].join("::");
};

/**
 * Extracts up to `length` letters (A-Z only) from `value`, uppercased.
 * Falls back to `fallback` if the value has no letters at all.
 */
const alphaCode = (value: string, length: number, fallback: string): string => {
    const lettersOnly = value.replace(/[^a-zA-Z]/g, "").toUpperCase();
    return lettersOnly.slice(0, length) || fallback;
};

/**
 * Picks the primary distinguishing attribute for the SKU's VARIANT segment:
 * color takes priority, then storage, then whatever attribute was supplied
 * first. Falls back to "Standard" when the product has no variant attributes.
 */
export const pickPrimaryVariantValue = (attributes: IVariantAttributeInput[]): string => {
    const findByKey = (key: string) =>
        attributes.find((attr) => normalizeText(attr.key) === key)?.value;

    return findByKey("color") ?? findByKey("storage") ?? attributes[0]?.value ?? "Standard";
};

export const buildSkuSequenceKey = (categoryCode: string, brandCode: string): string =>
    `${categoryCode}-${brandCode}`;

export const formatSku = (categoryCode: string, brandCode: string, variantCode: string, sequence: number): string =>
    `${categoryCode}-${brandCode}-${variantCode}-${String(sequence).padStart(4, "0")}`;

export const buildSkuCodes = (categoryName: string, brandName: string, variantAttributes: IVariantAttributeInput[]) => {
    const categoryCode = alphaCode(categoryName, 4, "GEN");
    const brandCode = alphaCode(brandName, 3, "BRD");
    const variantCode = alphaCode(pickPrimaryVariantValue(variantAttributes), 3, "STD");
    return { categoryCode, brandCode, variantCode };
};
