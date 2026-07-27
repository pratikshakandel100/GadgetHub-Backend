jest.mock("../../../src/repositories/user.repository", () => {
    const mockUserRepository = {
        findByEmail: jest.fn(),
        createUser: jest.fn(),
    };
    return {
        UserMongoRepository: jest.fn().mockImplementation(() => mockUserRepository),
        __mockUserRepository: mockUserRepository,
    };
});

import jwt from "jsonwebtoken";
import { UserService } from "../../../src/services/user.service";
import * as UserRepoModule from "../../../src/repositories/user.repository";
import { SECRET_KEY } from "../../../src/config/constant";

const mockUserRepository = (UserRepoModule as any).__mockUserRepository;

describe("UserService.createUser", () => {
    it("stores a bcrypt hash that is different from, and verifiable against, the plain-text password", async () => {
        mockUserRepository.findByEmail.mockResolvedValue(null);
        mockUserRepository.createUser.mockImplementation(async (data: any) => data);

        const created = await new UserService().createUser({
            fullname: "Test User",
            email: "test@example.com",
            password: "mySecret123",
        } as any);

        expect(created.password).not.toBe("mySecret123");

        const bcrypt = require("bcrypt");
        expect(await bcrypt.compare("mySecret123", created.password)).toBe(true);
    });
});

describe("UserService.loginUser", () => {
    const email = "test@example.com";
    const plainPassword = "correctPassword1";

    const setupExistingUser = async () => {
        const bcrypt = require("bcrypt");
        const hashed = await bcrypt.hash(plainPassword, 10);
        mockUserRepository.findByEmail.mockResolvedValue({
            _id: "user1",
            email,
            password: hashed,
            role: "user",
        });
    };

    it("logs in successfully and returns a JWT for the correct password", async () => {
        await setupExistingUser();

        const { token, user } = await new UserService().loginUser({ email, password: plainPassword } as any);

        expect(typeof token).toBe("string");
        expect(user.email).toBe(email);
    });

    it("returns a JWT whose payload decodes to the correct id/email/role", async () => {
        await setupExistingUser();

        const { token } = await new UserService().loginUser({ email, password: plainPassword } as any);
        const decoded = jwt.verify(token, SECRET_KEY) as { id: string; email: string; role: string };

        expect(decoded.email).toBe(email);
        expect(decoded.role).toBe("user");
        expect(decoded.id).toBe("user1");
    });

    it("rejects an incorrect password", async () => {
        await setupExistingUser();

        await expect(new UserService().loginUser({ email, password: "wrongPassword" } as any)).rejects.toThrow(
            "Sorry! Invalid Password"
        );
    });

    it("rejects login for an email that doesn't exist", async () => {
        mockUserRepository.findByEmail.mockResolvedValue(null);

        await expect(
            new UserService().loginUser({ email: "nobody@example.com", password: "whatever" } as any)
        ).rejects.toThrow("Sorry! Invalid email");
    });
});
