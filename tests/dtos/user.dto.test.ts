import { CreateUserDTO } from "../../src/dtos/user.dto";

describe("CreateUserDTO email validation", () => {
    const validPayload = { fullname: "Jane Doe", email: "jane@example.com", password: "secret123" };

    it("accepts a well-formed email address", () => {
        expect(CreateUserDTO.safeParse(validPayload).success).toBe(true);
    });

    it("rejects malformed email addresses", () => {
        for (const badEmail of ["not-an-email", "missing@domain", "@nodomain.com", "spaces in@email.com"]) {
            const result = CreateUserDTO.safeParse({ ...validPayload, email: badEmail });
            expect(result.success).toBe(false);
        }
    });
});
