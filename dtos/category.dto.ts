import { z } from "zod";
import { CategorySchema } from "../types/category.type";

export const CreateCategoryDTO = CategorySchema.pick({
    name: true,
    description: true,
    status: true
});

export type CreateCategoryDTO = z.infer<typeof CreateCategoryDTO>;

export const UpdateCategoryDTO = CategorySchema.pick({
    name: true,
    description: true,
    status: true
}).partial();

export type UpdateCategoryDTO = z.infer<typeof UpdateCategoryDTO>;
