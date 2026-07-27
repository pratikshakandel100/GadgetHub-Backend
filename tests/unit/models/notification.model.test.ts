import Notification from "../../../src/models/notification.model";

describe("Notification model", () => {
    it("defaults a newly-instantiated notification to unread", () => {
        const notification = new Notification({
            audience: "admin",
            type: "order_placed",
            title: "New order placed",
            message: "Order ORD-1234 was placed",
        });

        expect(notification.read).toBe(false);
    });
});
