jest.mock("../../src/repositories/notification.repository", () => {
    const mockNotificationRepository = {
        create: jest.fn(),
        getById: jest.fn(),
        markRead: jest.fn(),
    };
    return {
        NotificationMongoRepository: jest.fn().mockImplementation(() => mockNotificationRepository),
        __mockNotificationRepository: mockNotificationRepository,
    };
});

import { NotificationService } from "../../src/services/notification.service";
import * as NotificationRepoModule from "../../src/repositories/notification.repository";

const mockNotificationRepository = (NotificationRepoModule as any).__mockNotificationRepository;

describe("NotificationService.notifyAdminsLowStockIfCrossed", () => {
    beforeEach(() => {
        mockNotificationRepository.create.mockResolvedValue({});
    });

    it("creates a low-stock notification when stock crosses from above to at/below the alert threshold", async () => {
        const product: any = { _id: { toString: () => "p1" }, name: "Widget", stockQuantity: 3, minimumStockAlert: 5 };

        await new NotificationService().notifyAdminsLowStockIfCrossed(10, product);

        expect(mockNotificationRepository.create).toHaveBeenCalledTimes(1);
        expect(mockNotificationRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ type: "low_stock", productName: "Widget" })
        );
    });

    it("does NOT notify again when stock was already at/below the threshold before this change", async () => {
        const product: any = { _id: { toString: () => "p1" }, name: "Widget", stockQuantity: 2, minimumStockAlert: 5 };

        await new NotificationService().notifyAdminsLowStockIfCrossed(4, product);

        expect(mockNotificationRepository.create).not.toHaveBeenCalled();
    });
});

describe("NotificationService.markAsRead", () => {
    it("marks the notification read when the caller (a regular user) owns it", async () => {
        mockNotificationRepository.getById.mockResolvedValue({ audience: "user", recipient: { toString: () => "user1" } });
        mockNotificationRepository.markRead.mockResolvedValue({ read: true });

        const result = await new NotificationService().markAsRead("n1", "user1", false);

        expect(mockNotificationRepository.markRead).toHaveBeenCalledWith("n1");
        expect(result.read).toBe(true);
    });

    it("throws when a user tries to mark another user's notification as read", async () => {
        mockNotificationRepository.getById.mockResolvedValue({ audience: "user", recipient: { toString: () => "someone-else" } });

        await expect(new NotificationService().markAsRead("n1", "user1", false)).rejects.toThrow("Notification not found");
        expect(mockNotificationRepository.markRead).not.toHaveBeenCalled();
    });
});
