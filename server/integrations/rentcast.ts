/**
 * RentCast API integration for local real estate market data.
 *
 * Requires env var: RENTCAST_API_KEY
 * Get a free key at: https://app.rentcast.io/app/api-access
 * Free tier: 50 API calls/month
 *
 * Docs: https://developers.rentcast.io/reference
 */

const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY;
const BASE_URL = "https://api.rentcast.io/v1";

export interface MarketStats {
  zipCode: string;
  medianListPrice: number | null;
  medianSalePrice: number | null;
  averageDaysOnMarket: number | null;
  totalListings: number | null;
  pricePerSqft: number | null;
  monthOverMonthChange: number | null; // percentage
  city?: string;
  state?: string;
}

export interface RentEstimate {
  rent: number;
  rentRangeLow: number;
  rentRangeHigh: number;
  latitude: number;
  longitude: number;
  listings: any[];
}

export async function getMarketStatsByZip(zipCode: string): Promise<MarketStats> {
  if (!RENTCAST_API_KEY) {
    // Return realistic mock data when no key is set
    return getMockMarketStats(zipCode);
  }

  try {
    const res = await fetch(`${BASE_URL}/markets?zipCode=${zipCode}&historyRange=1`, {
      headers: { "X-Api-Key": RENTCAST_API_KEY },
    });

    if (!res.ok) {
      console.warn(`RentCast API returned ${res.status} for zip ${zipCode}, using mock data`);
      return getMockMarketStats(zipCode);
    }

    const data = await res.json();
    const saleData = data?.saleData;

    return {
      zipCode,
      medianListPrice: saleData?.averageListPrice ?? null,
      medianSalePrice: saleData?.averageSalePrice ?? null,
      averageDaysOnMarket: saleData?.averageDaysOnMarket ?? null,
      totalListings: saleData?.activeListing ?? null,
      pricePerSqft: saleData?.averagePricePerSquareFoot ?? null,
      monthOverMonthChange: saleData?.listPriceMonthOverMonthChange ?? null,
      city: data?.city,
      state: data?.state,
    };
  } catch (err) {
    console.warn("RentCast API error, using mock data:", err);
    return getMockMarketStats(zipCode);
  }
}

export async function getRentEstimate(address: string, bedrooms?: number): Promise<RentEstimate | null> {
  if (!RENTCAST_API_KEY) return null;

  try {
    const params = new URLSearchParams({ address });
    if (bedrooms) params.append("bedrooms", String(bedrooms));

    const res = await fetch(`${BASE_URL}/avm/rent/long-term?${params}`, {
      headers: { "X-Api-Key": RENTCAST_API_KEY },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Mock data for when RentCast API key is not configured
function getMockMarketStats(zipCode: string): MarketStats {
  // Seed with zip code digits for consistent but varied mock data
  const seed = zipCode.split("").reduce((acc, c) => acc + parseInt(c || "0"), 0);
  const base = 450000 + (seed * 23000);
  return {
    zipCode,
    medianListPrice: base,
    medianSalePrice: Math.round(base * 0.97),
    averageDaysOnMarket: 18 + (seed % 20),
    totalListings: 45 + (seed % 80),
    pricePerSqft: 280 + (seed % 150),
    monthOverMonthChange: ((seed % 10) - 3) * 0.8, // -2.4% to +5.6%
    city: "Your City",
    state: "CA",
  };
}
