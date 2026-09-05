import { Currency, OrderStatus, ShippingAddress, PriceBreakdown } from "@/types";

export interface NormalizedProduct {
  id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  currency: Currency;
  image?: string;
  exact_url: string;
  website: string;
  seller: string;
  availability: "in_stock" | "out_of_stock" | "limited";
  stock: number;
  color?: string;
  size?: string;
  variant?: string;
  rating: number;
  review_count: number;
  delivery_info: string;
  estimated_delivery_date: string;
  return_policy: string;
  cod_available: boolean;
  category: string;
  specifications: string[];
}

export interface SearchFilterCriteria {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  color?: string;
  brand?: string;
  codOnly?: boolean;
  specKeyword?: string;
  seller?: string;
  website?: string;
  minRating?: number;
}

export interface DiscoverySearchResult {
  query: string;
  appliedFilters: SearchFilterCriteria;
  totalFound: number;
  products: NormalizedProduct[];
  sources: string[];
  summary: string;
}

export interface CODVerificationResult {
  available: boolean;
  reason: string;
  product_id: string;
  seller: string;
  postal_code?: string;
  city?: string;
  fee: number;
}
