jest.mock("../../src/repositories/shipping-address.repository", () => {
    const mockShippingAddressRepository = { getById: jest.fn() };
    return {
        ShippingAddressMongoRepository: jest.fn().mockImplementation(() => mockShippingAddressRepository),
        __mockShippingAddressRepository: mockShippingAddressRepository,
    };
});

jest.mock("../../src/repositories/cart.repository", () => {
    const mockCartRepository = { findByUser: jest.fn(), clear: jest.fn() };
    return {
        CartMongoRepository: jest.fn().mockImplementation(() => mockCartRepository),
        __mockCartRepository: mockCartRepository,
    };
});

jest.mock("../../src/repositories/product.repository", () => {
    const mockProductRepository = { decrementStock: jest.fn(), incrementStock: jest.fn() };
    return {
        ProductMongoRepository: jest.fn().mockImplementation(() => mockProductRepository),
        __mockProductRepository: mockProductRepository,
    };
});

jest.mock("../../src/repositories/order.repository", () => {
    const mockOrderRepository = {
        create: jest.fn(),
        getById: jest.fn(),
        updateStatus: jest.fn(),
        updateCancellation: jest.fn(),
        existsByOrderNumber: jest.fn(),
    };
    return {
        OrderMongoRepository: jest.fn().mockImplementation(() => mockOrderRepository),
        __mockOrderRepository: mockOrderRepository,
    };
});

jest.mock("../../src/repositories/stock-movement.repository", () => {
    const mockStockMovementRepository = { create: jest.fn() };
    return {
        StockMovementMongoRepository: jest.fn().mockImplementation(() => mockStockMovementRepository),
        __mockStockMovementRepository: mockStockMovementRepository,
    };
});

jest.mock("../../src/services/notification.service", () => {
    const mockNotificationService = {
        notifyAdminsOrderPlaced: jest.fn(),
        notifyAdminsLowStockIfCrossed: jest.fn(),
        notifyUserOrderStatusChanged: jest.fn(),
    };
    return {
        NotificationService: jest.fn().mockImplementation(() => mockNotificationService),
        __mockNotificationService: mockNotificationService,
    };
});

jest.mock("../../src/services/shipping-settings.service", () => {
    const mockShippingSettingsService = { getSettings: jest.fn() };
    return {
        ShippingSettingsService: jest.fn().mockImplementation(() => mockShippingSettingsService),
        __mockShippingSettingsService: mockShippingSettingsService,
    };
});

import { OrderService } from "../../src/services/order.service";
import * as ShippingAddressRepoModule from "../../src/repositories/shipping-address.repository";
import * as CartRepoModule from "../../src/repositories/cart.repository";
import * as ProductRepoModule from "../../src/repositories/product.repository";
import * as OrderRepoModule from "../../src/repositories/order.repository";
import * as ShippingSettingsModule from "../../src/services/shipping-settings.service";

const mockShippingAddressRepository = (ShippingAddressRepoModule as any).__mockShippingAddressRepository;
const mockCartRepository = (CartRepoModule as any).__mockCartRepository;
const mockProductRepository = (ProductRepoModule as any).__mockProductRepository;
const mockOrderRepository = (OrderRepoModule as any).__mockOrderRepository;
const mockShippingSettingsService = (ShippingSettingsModule as any).__mockShippingSettingsService;

const USER_ID = "507f1f77bcf86cd799439011";

const SAVED_ADDRESS = {
    _id: "addr1",
    user: { toString: () => USER_ID },
    fullName: "Pratiksha Kandel",
    phoneNumber: "9800000000",
    province: "Bagmati",
    district: "Kathmandu",
    municipality: "KMC",
    wardNumber: 5,
    street: "Baneshwor",
    latitude: undefined,
    longitude: undefined,
};

const makeCartItem = (id: string, sellingPrice: number, quantity: number, stockQuantity = 100) => ({
    product: {
        _id: { toString: () => id },
        name: `Product ${id}`,
        sku: `SKU-${id}`,
        sellingPrice,
        mainImage: "img.jpg",
        stockQuantity,
        availability: "In Stock",
        status: "Published",
        freeShippingEligible: false,
    },
    quantity,
});

const SHIPPING_SETTINGS = {
    warehouseLatitude: 27.7,
    warehouseLongitude: 85.3,
    baseShippingCharge: 100,
    pricePerKm: 10,
    minShippingCharge: 50,
    maxShippingCharge: 500,
    freeShippingThreshold: 0,
    weightPricingEnabled: false,
};

describe("OrderService.createOrder", () => {
    beforeEach(() => {
        mockShippingAddressRepository.getById.mockResolvedValue(SAVED_ADDRESS);
        mockShippingSettingsService.getSettings.mockResolvedValue(SHIPPING_SETTINGS);
        mockOrderRepository.existsByOrderNumber.mockResolvedValue(false);
        mockOrderRepository.create.mockImplementation(async (data: any) => ({ _id: "order1", ...data }));
        mockCartRepository.clear.mockResolvedValue(undefined);
        mockProductRepository.decrementStock.mockImplementation(async (id: string, qty: number) => ({
            stockQuantity: 100 - qty,
        }));
        mockProductRepository.incrementStock.mockResolvedValue({ stockQuantity: 100 });
    });

    it("computes the subtotal as the sum of each item's sellingPrice x quantity", async () => {
        mockCartRepository.findByUser.mockResolvedValue({
            items: [makeCartItem("p1", 1000, 2), makeCartItem("p2", 500, 3)],
        });

        const order = await new OrderService().createOrder(USER_ID, { shippingAddressId: "addr1", paymentMethod: "cod" } as any);

        expect(order.subtotal).toBe(1000 * 2 + 500 * 3);
    });

    it("sets the order total to subtotal + shippingFee", async () => {
        mockCartRepository.findByUser.mockResolvedValue({ items: [makeCartItem("p1", 1000, 1)] });

        const order = await new OrderService().createOrder(USER_ID, { shippingAddressId: "addr1", paymentMethod: "cod" } as any);

        expect(order.total).toBe(order.subtotal + order.shippingFee);
        expect(order.shippingFee).toBe(SHIPPING_SETTINGS.baseShippingCharge);
    });

    it("reserves (decrements) stock immediately for a Cash on Delivery order", async () => {
        mockCartRepository.findByUser.mockResolvedValue({ items: [makeCartItem("p1", 1000, 2)] });

        await new OrderService().createOrder(USER_ID, { shippingAddressId: "addr1", paymentMethod: "cod" } as any);

        expect(mockProductRepository.decrementStock).toHaveBeenCalledWith("p1", 2);
    });
});

describe("OrderService status transitions", () => {
    beforeEach(() => {
        mockOrderRepository.updateStatus.mockImplementation(async (id: string, status: string) => ({
            _id: id,
            status,
            user: { _id: { toString: () => USER_ID } },
        }));
    });

    it("allows the valid next transition (Pending -> Confirmed)", async () => {
        mockOrderRepository.getById.mockResolvedValue({ _id: "o1", status: "Pending", user: { _id: { toString: () => USER_ID } } });

        const updated = await new OrderService().updateOrderStatus("o1", "Confirmed");

        expect(updated.status).toBe("Confirmed");
    });

    it("rejects an invalid transition that skips a step (Pending -> Packed)", async () => {
        mockOrderRepository.getById.mockResolvedValue({ _id: "o1", status: "Pending", user: { _id: { toString: () => USER_ID } } });

        await expect(new OrderService().updateOrderStatus("o1", "Packed")).rejects.toThrow(
            'Order must move from "Pending" to "Confirmed" next'
        );
    });

    it("rejects any status update once the order is already in a terminal state (Delivered/Cancelled)", async () => {
        mockOrderRepository.getById.mockResolvedValue({ _id: "o1", status: "Delivered", user: { _id: { toString: () => USER_ID } } });

        await expect(new OrderService().updateOrderStatus("o1", "Confirmed")).rejects.toThrow(
            "Order is already Delivered and cannot be updated further"
        );
    });
});

describe("OrderService.cancelOrder restocking", () => {
    beforeEach(() => {
        mockOrderRepository.updateCancellation.mockImplementation(async (id: string) => ({
            _id: id,
            user: { _id: { toString: () => USER_ID } },
        }));
        mockProductRepository.incrementStock.mockResolvedValue({ stockQuantity: 100 });
    });

    it("restocks inventory when cancelling a COD order", async () => {
        mockOrderRepository.getById.mockResolvedValue({
            _id: "o1",
            status: "Confirmed",
            paymentMethod: "cod",
            paymentStatus: "Pending",
            items: [{ product: { toString: () => "p1" }, quantity: 2 }],
        });

        await new OrderService().cancelOrder("o1", "Customer Request");

        expect(mockProductRepository.incrementStock).toHaveBeenCalledWith("p1", 2);
    });
});
