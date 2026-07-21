import { z } from "zod";
import { NEPAL_PROVINCES, ADDRESS_TYPES } from "../models/shipping-address.model";

const optionalString = z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().optional()
);

export const ShippingAddressSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    phoneNumber: z.string().regex(/^9\d{9}$/, "Phone number must be a valid 10-digit mobile number starting with 9"),
    province: z.enum(NEPAL_PROVINCES, { message: "Please select a valid province" }),
    district: z.string().min(1, "District is required"),
    municipality: z.string().min(1, "Municipality is required"),
    wardNumber: z.coerce.number().int("Ward number must be a whole number").min(1, "Ward number is required"),
    street: z.string().min(1, "Street / Tole is required"),
    landmark: optionalString,
    addressType: z.enum(ADDRESS_TYPES).default("Home"),
    isDefault: z.boolean().optional().default(false)
});

export type ShippingAddressType = z.infer<typeof ShippingAddressSchema>;
