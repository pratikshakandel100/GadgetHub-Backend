const mockSendMail = jest.fn().mockResolvedValue(undefined);

jest.mock("nodemailer", () => ({
    createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

describe("sendPasswordResetOtpEmail", () => {
    const ORIGINAL_ENV = process.env.E2E_TEST_MODE;

    afterEach(() => {
        process.env.E2E_TEST_MODE = ORIGINAL_ENV;
        mockSendMail.mockClear();
        jest.resetModules();
    });

    it("captures the OTP in the in-memory inbox and never sends a real email when E2E_TEST_MODE is set", async () => {
        process.env.E2E_TEST_MODE = "true";
        const { sendPasswordResetOtpEmail, e2eOtpInbox } = await import("../../../src/utils/mailer.util");

        await sendPasswordResetOtpEmail("user@example.com", "Test User", "123456");

        expect(e2eOtpInbox.get("user@example.com")).toBe("123456");
        expect(mockSendMail).not.toHaveBeenCalled();
    });

    it("does not throw when SMTP isn't configured and E2E_TEST_MODE is off (falls back to a console warning)", async () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

        process.env.E2E_TEST_MODE = "false";
        jest.doMock("../../../src/config/constant", () => ({
            SMTP_HOST: "smtp.gmail.com",
            SMTP_PORT: 587,
            SMTP_USER: "",
            SMTP_PASS: "",
            EMAIL_FROM: "",
        }));
        const { sendPasswordResetOtpEmail } = await import("../../../src/utils/mailer.util");

        await expect(sendPasswordResetOtpEmail("user@example.com", "Test User", "654321")).resolves.toBeUndefined();
        expect(mockSendMail).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith("[mailer] SMTP not configured — password reset email was not sent");

        warnSpy.mockRestore();
    });
});
