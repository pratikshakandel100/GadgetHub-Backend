import mongoose, {Schema, Document} from "mongoose";

export interface ISpecification {
  key: string;
  value: string;
}

export interface IVariant {
  type: string;
  values: string;
}

export interface IVariantAttribute {
  key: string;
  value: string;
}

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  slug: string;
  productCode: string;
  category: mongoose.Types.ObjectId;
  subcategory?: mongoose.Types.ObjectId;
  brand: mongoose.Types.ObjectId;
  shortDescription: string;
  fullDescription: string;
  costPrice: number;
  originalPrice: number;
  sellingPrice: number;
  discount: number;
  taxMargin?: number;
  stockQuantity: number;
  minimumStockAlert: number;
  availability: string;
  soldQuantity: number;
  deliveredQuantity: number;
  lastRestockedAt?: Date;
  lastStockUpdatedBy?: mongoose.Types.ObjectId;
  specifications: ISpecification[];
  variants: IVariant[];
  variantAttributes: IVariantAttribute[];
  variantKey: string;
  seller: mongoose.Types.ObjectId;
  attributes: Map<string, string>;
  weight?: string;
  dimensions?: string;
  shippingCharge?: number;
  estimatedDelivery?: string;
  manufacturer?: string;
  countryOfOrigin?: string;
  whatsIncluded?: string;
  warranty?: string;
  returnPolicy?: string;
  mainImage?: string;
  galleryImages?: string[];
  thumbnailImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string;
  featured: boolean;
  status: 'Draft' | 'Published';
  createdAt: Date;
  updatedAt: Date;
}

const ProductMongoSchema: Schema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    // Not unique on its own — two variants of the same product name (e.g.
    // different colors) legitimately share a base slug. The product URL is
    // `{slug}-{productCode}`, and productCode is what guarantees uniqueness.
    slug: { type: String, required: true },
    productCode: { type: String, required: true, unique: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    subcategory: { type: Schema.Types.ObjectId, ref: "Subcategory", required: false },
    brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    shortDescription: { type: String, required: true },
    fullDescription: { type: String, required: true },
    costPrice: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    taxMargin: { type: Number, required: false },
    stockQuantity: { type: Number, required: true, default: 0 },
    minimumStockAlert: { type: Number, required: true, default: 5 },
    availability: {
      type: String,
      enum: ['In Stock', 'Out of Stock', 'Pre-order'],
      default: 'In Stock'
    },
    soldQuantity: { type: Number, required: true, default: 0 },
    deliveredQuantity: { type: Number, required: true, default: 0 },
    lastRestockedAt: { type: Date, required: false },
    lastStockUpdatedBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
    specifications: [{
      key: { type: String, required: true },
      value: { type: String, required: true }
    }],
    variants: [{
      type: { type: String, required: true },
      values: { type: String, required: true }
    }],
    variantAttributes: [{
      key: { type: String, required: true },
      value: { type: String, required: true }
    }],
    variantKey: { type: String, required: true },
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true },
    attributes: { type: Map, of: String, default: {} },
    weight: { type: String, required: false },
    dimensions: { type: String, required: false },
    shippingCharge: { type: Number, required: false },
    estimatedDelivery: { type: String, required: false },
    manufacturer: { type: String, required: false },
    countryOfOrigin: { type: String, required: false },
    whatsIncluded: { type: String, required: false },
    warranty: { type: String, required: false },
    returnPolicy: { type: String, required: false },
    mainImage: { type: String, required: false },
    galleryImages: [{ type: String }],
    thumbnailImage: { type: String, required: false },
    metaTitle: { type: String, required: false },
    metaDescription: { type: String, required: false },
    tags: { type: String, required: false },
    featured: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['Draft', 'Published'],
      default: 'Draft'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);


ProductMongoSchema.index({ variantKey: 1 }, { unique: true, sparse: true });

// Best Seller is a fixed threshold on units actually delivered, not raw
// demand (soldQuantity counts orders placed/paid even if later cancelled —
// see the comment on decrementStock below), so a separate counter drives it.
const BEST_SELLER_THRESHOLD = 10;
const NEW_ARRIVAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// newArrival/bestSeller/onSale are derived facts, not admin input — computed
// on read instead of stored so they can never drift out of sync with their
// source data (createdAt, deliveredQuantity, discount/prices).
ProductMongoSchema.virtual('newArrival').get(function (this: IProduct) {
  return Date.now() - this.createdAt.getTime() <= NEW_ARRIVAL_WINDOW_MS;
});
ProductMongoSchema.virtual('bestSeller').get(function (this: IProduct) {
  return (this.deliveredQuantity ?? 0) >= BEST_SELLER_THRESHOLD;
});
ProductMongoSchema.virtual('onSale').get(function (this: IProduct) {
  return this.discount > 0 || this.sellingPrice < this.originalPrice;
});

export default mongoose.model<IProduct>(
  "Product",
  ProductMongoSchema
);
