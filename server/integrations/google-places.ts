/**
 * Google Places API integration for discovering real licensed real estate agents.
 *
 * Requires env var: GOOGLE_PLACES_API_KEY
 * Get one at: https://console.cloud.google.com → Enable "Places API (New)"
 *
 * Pricing: ~$32 per 1,000 Nearby Search requests.
 * $200/month free credit = ~6,200 free searches.
 */

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BASE_URL = "https://places.googleapis.com/v1/places:searchText";

export interface GooglePlaceAgent {
  placeId: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  userRatingCount?: number;
  lat?: number;
  lng?: number;
  photoReference?: string;
}

export async function searchRealEstateAgents(location: string, radius = 15000): Promise<GooglePlaceAgent[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error("GOOGLE_PLACES_API_KEY is not set. Add it to your .env file.");
  }

  const body = {
    textQuery: `real estate agent in ${location}`,
    includedType: "real_estate_agency",
    maxResultCount: 20,
    locationBias: {
      circle: {
        center: { latitude: 37.7749, longitude: -122.4194 }, // default SF; gets overridden by text query
        radius,
      },
    },
  };

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.location,places.photos",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Places API error: ${res.status} ${err}`);
  }

  const data = await res.json() as { places?: any[] };
  const places = data.places || [];

  return places.map((p: any): GooglePlaceAgent => ({
    placeId: p.id,
    name: p.displayName?.text || "Unknown Agent",
    address: p.formattedAddress || "",
    phone: p.nationalPhoneNumber,
    website: p.websiteUri,
    rating: p.rating,
    userRatingCount: p.userRatingCount,
    lat: p.location?.latitude,
    lng: p.location?.longitude,
    photoReference: p.photos?.[0]?.name,
  }));
}

export function getPlacePhotoUrl(photoReference: string, maxWidth = 400): string {
  if (!GOOGLE_PLACES_API_KEY) return "";
  return `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=${maxWidth}&key=${GOOGLE_PLACES_API_KEY}`;
}
