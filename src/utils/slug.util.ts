/**
 * Lowercases, replaces runs of anything that isn't a letter/digit with a
 * single hyphen, and trims leading/trailing hyphens. Never produces
 * underscores or duplicate hyphens.
 */
export const slugify = (value: string): string =>
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
