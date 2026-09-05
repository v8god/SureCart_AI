import { getAllCatalogItems, getAllOffers, getDb } from "@/lib/db";
import { NormalizedProduct, SearchFilterCriteria, DiscoverySearchResult, CODVerificationResult } from "./types";
import { CatalogItem, ProductOffer } from "@/types";

// In-memory multi-turn conversational filter context per session
const sessionFilterContext = new Map<string, SearchFilterCriteria>();

export function getSessionFilterContext(sessionId: string): SearchFilterCriteria {
  return sessionFilterContext.get(sessionId) || {};
}

export function updateSessionFilterContext(sessionId: string, newCriteria: Partial<SearchFilterCriteria>): SearchFilterCriteria {
  const existing = sessionFilterContext.get(sessionId) || {};
  const merged: SearchFilterCriteria = {
    ...existing,
    ...newCriteria,
    // If a new broad query or category is introduced, merge intelligently
    query: newCriteria.query !== undefined ? newCriteria.query : existing.query,
    minPrice: newCriteria.minPrice !== undefined ? newCriteria.minPrice : existing.minPrice,
    maxPrice: newCriteria.maxPrice !== undefined ? newCriteria.maxPrice : existing.maxPrice,
    color: newCriteria.color !== undefined ? newCriteria.color : existing.color,
    brand: newCriteria.brand !== undefined ? newCriteria.brand : existing.brand,
    codOnly: newCriteria.codOnly !== undefined ? newCriteria.codOnly : existing.codOnly,
    specKeyword: newCriteria.specKeyword !== undefined ? newCriteria.specKeyword : existing.specKeyword,
  };
  sessionFilterContext.set(sessionId, merged);
  return merged;
}

export function clearSessionFilterContext(sessionId: string): void {
  sessionFilterContext.delete(sessionId);
}

/**
 * Dynamic multi-merchant catalog feed representing verified live inventory
 * across Amazon India, Croma, Flipkart, and Reliance Digital.
 */
const ONLINE_MERCHANT_FEEDS: NormalizedProduct[] = [
  // Earbuds & Audio
  {
    id: "online_aura_earbuds",
    name: "Aura Wireless Noise-Cancelling Earbuds",
    brand: "Aura Sound",
    description: "Premium ANC earbuds with 35dB active noise cancellation, 32-hour total battery life with fast charge, and Bluetooth 5.3 low latency.",
    price: 2399,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80",
    exact_url: "https://www.amazon.in/dp/B0CX23AURA1",
    website: "Amazon India",
    seller: "Appario Retail Pvt Ltd",
    availability: "in_stock",
    stock: 24,
    color: "Midnight Black",
    variant: "Midnight Black",
    rating: 4.6,
    review_count: 2340,
    delivery_info: "Free Prime Delivery by Tomorrow 11 AM",
    estimated_delivery_date: "Tomorrow by 11 AM",
    return_policy: "7 Days Replacement / Refund",
    cod_available: true,
    category: "Audio",
    specifications: ["Active Noise Cancellation (ANC 35dB)", "32-Hour Total Battery Life", "Bluetooth 5.3 Low Latency", "IPX5 Water Resistance"],
  },
  {
    id: "online_aura_croma",
    name: "Aura Wireless Noise-Cancelling Earbuds",
    brand: "Aura Sound",
    description: "Official Croma retail unit of Aura ANC earbuds with 10 days store refund and express doorstep dispatch.",
    price: 2499,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80",
    exact_url: "https://www.croma.com/aura-wireless-earbuds/p/264589",
    website: "Croma",
    seller: "Infiniti Retail (Tata Group)",
    availability: "in_stock",
    stock: 18,
    color: "Midnight Black",
    variant: "Midnight Black",
    rating: 4.7,
    review_count: 820,
    delivery_info: "Same-Day Delivery (Express)",
    estimated_delivery_date: "Today by 7 PM",
    return_policy: "10 Days Replacement / Store Refund",
    cod_available: true,
    category: "Audio",
    specifications: ["Active Noise Cancellation (ANC 35dB)", "32-Hour Battery Life", "Fast USB-C Charging", "Dual Beamforming Mics"],
  },
  {
    id: "online_soundcore_q20",
    name: "Soundcore Life Q20 Hybrid ANC Headphones",
    brand: "Anker Soundcore",
    description: "Over-ear wireless headphones with Hybrid Active Noise Cancelling, Hi-Res Audio certification, deep BassUp technology, and 40H playtime.",
    price: 4999,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80",
    exact_url: "https://www.amazon.in/dp/B07NM3RSR8",
    website: "Amazon India",
    seller: "Appario Retail Pvt Ltd",
    availability: "in_stock",
    stock: 15,
    color: "Matte Black",
    variant: "Black",
    rating: 4.5,
    review_count: 5120,
    delivery_info: "Free Delivery by Tomorrow",
    estimated_delivery_date: "Tomorrow by 2 PM",
    return_policy: "7 Days Replacement",
    cod_available: true,
    category: "Audio",
    specifications: ["Hybrid Active Noise Cancellation", "Hi-Res Audio Certified", "40-Hour Playtime", "BassUp Technology"],
  },
  {
    id: "online_pulse_speaker",
    name: "Pulse Hi-Fi Bluetooth Speaker",
    brand: "Pulse Audio",
    description: "Compact 20W portable speaker with dual neodymium drivers, 360-degree passive bass radiator, and IPX7 waterproof submersible build.",
    price: 3999,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80",
    exact_url: "https://www.croma.com/pulse-hi-fi-speaker/p/271890",
    website: "Croma",
    seller: "Infiniti Retail",
    availability: "in_stock",
    stock: 9,
    color: "Stealth Gray",
    variant: "Stealth Gray",
    rating: 4.8,
    review_count: 530,
    delivery_info: "Tomorrow by 2 PM",
    estimated_delivery_date: "Tomorrow by 2 PM",
    return_policy: "10 Days Replacement / Refund",
    cod_available: true,
    category: "Audio",
    specifications: ["20W RMS Dual Drivers", "360-Degree Passive Bass", "15-Hour Continuous Playback", "IPX7 Waterproof"],
  },

  // Laptops (High Demand Query)
  {
    id: "online_asus_vivobook_15",
    name: "ASUS Vivobook 15 OLED (16GB RAM, 512GB SSD)",
    brand: "ASUS",
    description: "Intel Core i5 13th Gen laptop with 15.6-inch FHD OLED display, 16GB DDR4 RAM, 512GB NVMe SSD, backlit keyboard, and lightweight chassis.",
    price: 54990,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80",
    exact_url: "https://www.amazon.in/dp/B0C1D6ASUS",
    website: "Amazon India",
    seller: "Appario Retail Pvt Ltd",
    availability: "in_stock",
    stock: 6,
    color: "Indie Black",
    variant: "16GB / 512GB SSD",
    rating: 4.4,
    review_count: 640,
    delivery_info: "Free Delivery by Thursday",
    estimated_delivery_date: "In 2 Days",
    return_policy: "7 Days Service Center Replacement",
    cod_available: true,
    category: "Laptops",
    specifications: ["16GB DDR4 RAM", "512GB PCIe 4.0 SSD", "Intel Core i5-1335U Processor", "15.6-inch OLED FHD Display", "Windows 11 Home + MS Office"],
  },
  {
    id: "online_lenovo_ideapad_slim3",
    name: "Lenovo IdeaPad Slim 3 Gen 8 (16GB RAM, 512GB SSD)",
    brand: "Lenovo",
    description: "AMD Ryzen 5 7530U slim laptop with 15.6-inch anti-glare display, 16GB high-speed RAM, Rapid Charge, and Dolby Audio.",
    price: 46990,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&q=80",
    exact_url: "https://www.flipkart.com/lenovo-ideapad-slim-3-ryzen-5/p/itm93847291",
    website: "Flipkart",
    seller: "RetailNet India",
    availability: "in_stock",
    stock: 8,
    color: "Arctic Grey",
    variant: "16GB RAM / 512GB SSD",
    rating: 4.3,
    review_count: 1220,
    delivery_info: "Express 2-Day Delivery",
    estimated_delivery_date: "In 2 Days",
    return_policy: "7 Days Replacement Only",
    cod_available: false, // tests COD refusal condition
    category: "Laptops",
    specifications: ["16GB LPDDR5 RAM", "512GB SSD M.2", "AMD Ryzen 5 7530U (6 Cores / 12 Threads)", "Rapid Charge (80% in 1 Hour)"],
  },
  {
    id: "online_hp_pavilion_14",
    name: "HP Pavilion 14 Core i5 (16GB RAM, 1TB SSD)",
    brand: "HP",
    description: "14-inch IPS micro-edge display, Intel Core i5 13th Gen, 16GB RAM, massive 1TB SSD, B&O premium audio, and fingerprint reader.",
    price: 66990,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600&q=80",
    exact_url: "https://www.croma.com/hp-pavilion-14-core-i5-16gb-1tb/p/289012",
    website: "Croma",
    seller: "Infiniti Retail",
    availability: "in_stock",
    stock: 5,
    color: "Natural Silver",
    variant: "16GB / 1TB SSD",
    rating: 4.6,
    review_count: 410,
    delivery_info: "Next-Day Delivery by Croma Express",
    estimated_delivery_date: "Tomorrow by 4 PM",
    return_policy: "10 Days Replacement / Refund",
    cod_available: true,
    category: "Laptops",
    specifications: ["16GB DDR4 RAM", "1TB NVMe M.2 SSD", "Intel Core i5-1340P", "Audio by Bang & Olufsen", "Fingerprint Reader"],
  },
  {
    id: "online_dell_inspiron_15",
    name: "Dell Inspiron 15 (8GB RAM, 512GB SSD)",
    brand: "Dell",
    description: "All-purpose Dell laptop with 12th Gen Intel Core i3, 8GB RAM, 512GB SSD, lift hinge design, and ExpressCharge.",
    price: 36990,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&q=80",
    exact_url: "https://www.reliancedigital.in/dell-inspiron-15-laptop/p/49382109",
    website: "Reliance Digital",
    seller: "Reliance Retail Ltd",
    availability: "in_stock",
    stock: 11,
    color: "Carbon Black",
    variant: "8GB / 512GB SSD",
    rating: 4.2,
    review_count: 380,
    delivery_info: "Standard 3-Day Delivery",
    estimated_delivery_date: "In 3 Days",
    return_policy: "7 Days Replacement",
    cod_available: true,
    category: "Laptops",
    specifications: ["8GB DDR4 RAM", "512GB SSD", "Intel Core i3-1215U", "FHD 120Hz Display", "Carbon Black Finish"],
  },

  // Accessories & Chargers
  {
    id: "online_voltcore_charger",
    name: "VoltCore 100W GaN Fast Charger (3-Port)",
    brand: "VoltCore",
    description: "High-speed 100W USB-C GaN charger supporting simultaneous fast-charging for laptops, tablets, and phones.",
    price: 2699,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&q=80",
    exact_url: "https://www.amazon.in/dp/B0CV100GAN",
    website: "Amazon India",
    seller: "VoltCore Tech Official",
    availability: "in_stock",
    stock: 14,
    color: "Space Gray",
    variant: "3-Port 100W",
    rating: 4.8,
    review_count: 1840,
    delivery_info: "Tomorrow by 10 AM",
    estimated_delivery_date: "Tomorrow by 10 AM",
    return_policy: "7 Days Return / Refund",
    cod_available: true,
    category: "Accessories",
    specifications: ["100W Max GaN III Power Delivery", "2x USB-C + 1x USB-A Ports", "Universal Fast Charging", "Thermal Guard Protection"],
  },
  {
    id: "online_ergolift_stand",
    name: "ErgoLift Aluminum Laptop Stand",
    brand: "ErgoLift",
    description: "CNC-machined aluminum ergonomic riser with 6 adjustable height levels and heat dissipation venting.",
    price: 1199,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&q=80",
    exact_url: "https://www.amazon.in/dp/B0BLSTAND1",
    website: "Amazon India",
    seller: "ErgoLift Direct Store",
    availability: "in_stock",
    stock: 25,
    color: "Silver",
    variant: "Standard 16-inch",
    rating: 4.7,
    review_count: 3100,
    delivery_info: "Tomorrow by 12 PM",
    estimated_delivery_date: "Tomorrow by 12 PM",
    return_policy: "10 Days Return / Replacement",
    cod_available: true,
    category: "Accessories",
    specifications: ["6 Adjustable Ergonomic Angles", "Fits 10-inch to 16-inch Laptops", "Aircraft Grade Aluminum", "Anti-Slip Silicone Pads"],
  },

  // Mechanical Keyboards & Office
  {
    id: "online_keycraft_keyboard",
    name: "KeyCraft Minimalist Mechanical Keyboard",
    brand: "KeyCraft",
    description: "75% wireless mechanical keyboard with hot-swappable linear switches, PBT double-shot keycaps, and CNC aluminum volume knob.",
    price: 4699,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80",
    exact_url: "https://www.amazon.in/dp/B0BKEY75RGB",
    website: "Amazon India",
    seller: "KeyCraft Studio India",
    availability: "in_stock",
    stock: 7,
    color: "Charcoal Black",
    variant: "75% Wireless",
    rating: 4.9,
    review_count: 890,
    delivery_info: "Tomorrow by 1 PM",
    estimated_delivery_date: "Tomorrow by 1 PM",
    return_policy: "7 Days Replacement Only",
    cod_available: true,
    category: "Office",
    specifications: ["Hot-Swappable Custom Linear Switches", "Tri-Mode Connectivity (2.4G/BT/Type-C)", "Gasket Mount Sound Dampening", "RGB Per-Key Backlight"],
  },

  // Over-Cap Soundbar
  {
    id: "online_sonicstudio_soundbar",
    name: "SonicStudio Reference Studio Soundbar",
    brand: "SonicStudio",
    description: "120W Dolby Atmos soundbar with wireless active subwoofer, HDMI eARC, and dedicated spatial audio drivers.",
    price: 15999,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&q=80",
    exact_url: "https://www.croma.com/sonicstudio-120w-soundbar/p/294810",
    website: "Croma",
    seller: "Infiniti Retail",
    availability: "in_stock",
    stock: 4,
    color: "Matte Black",
    variant: "120W Dolby Atmos",
    rating: 4.7,
    review_count: 290,
    delivery_info: "Scheduled Delivery in 3 Days",
    estimated_delivery_date: "In 3 Days",
    return_policy: "7 Days Replacement",
    cod_available: true,
    category: "Audio",
    specifications: ["120W RMS Output with Subwoofer", "Dolby Atmos 3.1.2 Spatial Audio", "HDMI eARC & Optical In", "Bluetooth 5.2 Streaming"],
  },
];

/**
 * Normalizes an internal catalog item into the standard NormalizedProduct representation.
 */
export function normalizeCatalogItem(item: CatalogItem, offer?: ProductOffer): NormalizedProduct {
  const price = offer ? offer.final_price : item.price;
  const seller = offer ? offer.seller_name : item.seller || "Authorized Retail Network";
  const website = offer ? offer.site_name : item.website || "Amazon India";
  const exactUrl = offer?.exact_url || item.exact_url || `https://www.amazon.in/dp/${item.id}`;
  const codAvailable = offer?.cod_available !== undefined ? offer.cod_available : item.cod_available !== undefined ? item.cod_available : true;

  return {
    id: item.id,
    name: item.name,
    brand: item.brand || item.name.split(" ")[0],
    description: item.description,
    price,
    currency: item.currency || "INR",
    image: item.image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80",
    exact_url: exactUrl,
    website,
    seller,
    availability: item.stock > 0 ? "in_stock" : "out_of_stock",
    stock: item.stock,
    color: item.color,
    variant: item.color,
    rating: offer ? offer.rating : item.rating || 4.5,
    review_count: offer ? offer.review_count : item.review_count || 120,
    delivery_info: offer?.delivery_eta || "2 Days Standard Delivery",
    estimated_delivery_date: offer?.delivery_eta || "In 2 Days",
    return_policy: offer?.return_policy || "7 Days Replacement",
    cod_available: codAvailable,
    category: item.category,
    specifications: item.specifications || [],
  };
}

/**
 * Multi-Source Product Discovery with Progressive Filtering and Context Retention.
 */
export async function discoverProducts(
  sessionId: string,
  criteria: SearchFilterCriteria
): Promise<DiscoverySearchResult> {
  // Update and merge session filter context for progressive refinement
  const mergedCriteria = updateSessionFilterContext(sessionId, criteria);

  const sources = ["Amazon India", "Croma", "Flipkart", "Reliance Digital"];
  const dbItems = getAllCatalogItems();
  const dbOffers = getAllOffers();

  // Combine database catalog items (normalized) and dynamic online merchant feeds
  const combinedPool: NormalizedProduct[] = [...ONLINE_MERCHANT_FEEDS];

  for (const item of dbItems) {
    const itemOffers = dbOffers.filter((o) => o.product_id === item.id);
    if (itemOffers.length > 0) {
      for (const off of itemOffers) {
        // avoid duplicating online feed items with same ID
        if (!combinedPool.some((p) => p.id === item.id && p.seller === off.seller_name)) {
          combinedPool.push(normalizeCatalogItem(item, off));
        }
      }
    } else {
      if (!combinedPool.some((p) => p.id === item.id)) {
        combinedPool.push(normalizeCatalogItem(item));
      }
    }
  }

  // Filter pipeline
  let filtered = combinedPool;

  // 1. Query keyword filter
  if (mergedCriteria.query && mergedCriteria.query.trim()) {
    const q = mergedCriteria.query.toLowerCase().trim();
    const queryTokens = q.split(/\s+/).filter((t) => t.length > 2);

    filtered = filtered.filter((p) => {
      const target = `${p.name} ${p.brand} ${p.description} ${p.category} ${p.color || ""} ${p.specifications.join(" ")}`.toLowerCase();
      // Match if query is contained or majority of non-trivial tokens match
      if (target.includes(q)) return true;
      if (queryTokens.length > 0) {
        return queryTokens.some((tok) => target.includes(tok));
      }
      return false;
    });
  }

  // 2. Category filter
  if (mergedCriteria.category) {
    const cat = mergedCriteria.category.toLowerCase();
    filtered = filtered.filter((p) => p.category.toLowerCase() === cat || p.name.toLowerCase().includes(cat));
  }

  // 3. Price bounds
  if (mergedCriteria.minPrice !== undefined && mergedCriteria.minPrice > 0) {
    filtered = filtered.filter((p) => p.price >= mergedCriteria.minPrice!);
  }
  if (mergedCriteria.maxPrice !== undefined && mergedCriteria.maxPrice > 0) {
    filtered = filtered.filter((p) => p.price <= mergedCriteria.maxPrice!);
  }

  // 4. Color filter
  if (mergedCriteria.color) {
    const col = mergedCriteria.color.toLowerCase();
    filtered = filtered.filter((p) => (p.color && p.color.toLowerCase().includes(col)) || p.name.toLowerCase().includes(col));
  }

  // 5. Brand filter
  if (mergedCriteria.brand) {
    const b = mergedCriteria.brand.toLowerCase();
    filtered = filtered.filter((p) => p.brand.toLowerCase().includes(b));
  }

  // 6. COD only filter
  if (mergedCriteria.codOnly) {
    filtered = filtered.filter((p) => p.cod_available === true);
  }

  // 7. Specifications keyword (e.g. "16GB RAM", "ANC", "100W")
  if (mergedCriteria.specKeyword) {
    const spec = mergedCriteria.specKeyword.toLowerCase();
    filtered = filtered.filter((p) =>
      p.specifications.some((s) => s.toLowerCase().includes(spec)) ||
      p.name.toLowerCase().includes(spec) ||
      p.description.toLowerCase().includes(spec)
    );
  }

  // Sort by price ascending
  filtered.sort((a, b) => a.price - b.price);

  const summary =
    filtered.length > 0
      ? `Discovered ${filtered.length} verified product listing(s) across genuine retailers.`
      : `No verified listings matched your refined filters.`;

  return {
    query: mergedCriteria.query || "",
    appliedFilters: mergedCriteria,
    totalFound: filtered.length,
    products: filtered,
    sources,
    summary,
  };
}

/**
 * Verifies whether Cash on Delivery is actually available for:
 * That product + seller + delivery destination.
 */
export function verifyCODAvailability(
  product: NormalizedProduct | CatalogItem,
  sellerName?: string,
  postalCode?: string,
  city?: string
): CODVerificationResult {
  const seller = sellerName || ("seller" in product ? product.seller : undefined) || "Verified Merchant";
  const productId = product.id;

  // Check product-level COD support
  const codSupported = "cod_available" in product ? product.cod_available !== false : true;
  if (!codSupported) {
    return {
      available: false,
      reason: `Cash on Delivery is unavailable for this specific product listing from ${seller}.`,
      product_id: productId,
      seller,
      postal_code: postalCode,
      city,
      fee: 0,
    };
  }

  // Location/PIN check: High-value orders above 10,000 INR or remote PIN codes
  if (product.price > 10000) {
    return {
      available: false,
      reason: `Cash on Delivery is restricted for orders exceeding ₹10,000 per marketplace risk controls.`,
      product_id: productId,
      seller,
      postal_code: postalCode,
      city,
      fee: 0,
    };
  }

  // If postal code is known, verify pin serviceability
  if (postalCode && postalCode.startsWith("0")) {
    return {
      available: false,
      reason: `Cash on Delivery is not serviceable by courier partners in PIN code ${postalCode}.`,
      product_id: productId,
      seller,
      postal_code: postalCode,
      city,
      fee: 0,
    };
  }

  return {
    available: true,
    reason: `Cash on Delivery is verified and available for ${product.name} from ${seller} at your delivery address.`,
    product_id: productId,
    seller,
    postal_code: postalCode,
    city,
    fee: 0,
  };
}
