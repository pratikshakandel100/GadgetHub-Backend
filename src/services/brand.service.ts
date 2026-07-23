import { BrandMongoRepository, IBrandWithCount } from "../repositories/brand.repository";
import { CreateBrandDTO, UpdateBrandDTO } from "../dtos/brand.dto";
import { IBrand } from "../models/brand.model";
import { HttpException } from "../exceptions/http-exception";
import { slugify } from "../utils/slug.util";

const brandRepository = new BrandMongoRepository();

export class BrandService {
    async createBrand(brandData: CreateBrandDTO): Promise<IBrand> {
        const existingName = await brandRepository.findByName(brandData.name);
        if (existingName) {
            throw new HttpException(400, "Brand name already exists");
        }

        let slug = slugify(brandData.name);
        const existingSlug = await brandRepository.findBySlug(slug);
        if (existingSlug) {
            slug = `${slug}-${Date.now().toString(36)}`;
        }

        return await brandRepository.create({ ...brandData, slug });
    }

    async bulkCreateBrands(brandsData: CreateBrandDTO[]): Promise<{
        insertedCount: number;
        inserted: IBrand[];
        skipped: { name: string; reason: string }[];
    }> {
        const seenNames = new Set<string>();
        const seenSlugs = new Set<string>();
        const toInsert: (CreateBrandDTO & { slug: string })[] = [];
        const skipped: { name: string; reason: string }[] = [];

        for (const brandData of brandsData) {
            const normalizedName = brandData.name.trim().toLowerCase();
            if (seenNames.has(normalizedName)) {
                skipped.push({ name: brandData.name, reason: "Duplicate name in request payload" });
                continue;
            }

            const existingName = await brandRepository.findByName(brandData.name);
            if (existingName) {
                skipped.push({ name: brandData.name, reason: "Brand name already exists" });
                continue;
            }

            let slug = slugify(brandData.name);
            if (seenSlugs.has(slug) || await brandRepository.findBySlug(slug)) {
                slug = `${slug}-${Date.now().toString(36)}${seenSlugs.size}`;
            }

            seenNames.add(normalizedName);
            seenSlugs.add(slug);
            toInsert.push({ ...brandData, slug });
        }

        const inserted = await brandRepository.bulkCreate(toInsert);
        return { insertedCount: inserted.length, inserted, skipped };
    }

    async getAllBrands(search: string): Promise<IBrandWithCount[]> {
        const { brands } = await brandRepository.getAll(search, { name: 1 });
        return brands;
    }

    async getBrandById(id: string): Promise<IBrand> {
        const brand = await brandRepository.getById(id);
        if (!brand) {
            throw new HttpException(404, "Brand not found");
        }
        return brand;
    }

    async updateBrand(id: string, brandData: UpdateBrandDTO): Promise<IBrand> {
        const existingBrand = await brandRepository.getById(id);
        if (!existingBrand) {
            throw new HttpException(404, "Brand not found");
        }

        const updatePayload: Partial<IBrand> = { ...brandData };

        if (brandData.name && brandData.name !== existingBrand.name) {
            const existingName = await brandRepository.findByName(brandData.name);
            if (existingName) {
                throw new HttpException(400, "Brand name already exists");
            }
            updatePayload.slug = slugify(brandData.name);
        }

        const updated = await brandRepository.update(id, updatePayload);
        if (!updated) {
            throw new HttpException(500, "Failed to update brand");
        }
        return updated;
    }

    async deleteBrand(id: string): Promise<void> {
        const existingBrand = await brandRepository.getById(id);
        if (!existingBrand) {
            throw new HttpException(404, "Brand not found");
        }

        const productCount = await brandRepository.countProducts(id);
        if (productCount > 0) {
            throw new HttpException(400, "Cannot delete brand with existing products");
        }

        const isDeleted = await brandRepository.delete(id);
        if (!isDeleted) {
            throw new HttpException(500, "Failed to delete brand");
        }
    }
}
