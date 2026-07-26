import request from "supertest";
import app from "../../../src/app";

const unique = () => `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

export const createCategory = async (adminToken: string, overrides: Record<string, unknown> = {}) => {
    const res = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: `Category-${unique()}`, ...overrides })
        .expect(201);
    return res.body.data;
};

export const createBrand = async (adminToken: string, overrides: Record<string, unknown> = {}) => {
    const res = await request(app)
        .post("/api/v1/brands")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: `Brand-${unique()}`, ...overrides })
        .expect(200);
    return res.body.data;
};

/** Creates a category + brand + a Published product through the real admin API. */
export const createPublishedProduct = async (adminToken: string, overrides: Record<string, unknown> = {}) => {
    const category = await createCategory(adminToken);
    const brand = await createBrand(adminToken);

    const payload = {
        name: `Product-${unique()}`,
        category: category._id,
        brand: brand._id,
        shortDescription: "A short description",
        fullDescription: "A full description of the product",
        costPrice: 100,
        originalPrice: 200,
        sellingPrice: 150,
        stockQuantity: 50,
        status: "Published",
        ...overrides,
    };

    const res = await request(app).post("/api/v1/products").set("Authorization", `Bearer ${adminToken}`).send(payload);
    if (res.status >= 400) {
        throw new Error(`Failed to create test product: ${res.status} ${JSON.stringify(res.body)}`);
    }
    return res.body.data;
};

export const createShippingAddress = async (userToken: string, overrides: Record<string, unknown> = {}) => {
    const payload = {
        fullName: "Jane Doe",
        phoneNumber: "9800000000",
        province: "Bagmati",
        district: "Kathmandu",
        municipality: "Kathmandu Metropolitan City",
        wardNumber: 5,
        street: "Baneshwor",
        ...overrides,
    };
    const res = await request(app)
        .post("/api/v1/shipping-addresses")
        .set("Authorization", `Bearer ${userToken}`)
        .send(payload)
        .expect(201);
    return res.body.data;
};
