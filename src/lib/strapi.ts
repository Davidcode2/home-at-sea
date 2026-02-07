const STRAPI_URL = import.meta.env.STRAPI_URL || "http://localhost:1337";

interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface Operator {
  id: number;
  documentId: string;
  name: string;
  description: string;
  website: string;
  phone: string;
  email: string;
}

export interface Ship {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  heroImage: StrapiMedia | null;
  gallery: StrapiMedia[] | null;
  status: "operational" | "under-construction" | "planned";
  yearBuilt: number;
  length: number;
  residenceCount: number;
  operator?: Operator;
  apartments?: Apartment[];
  itineraries?: Itinerary[];
  stories?: Story[];
}

export interface StrapiMedia {
  id: number;
  url: string;
  alternativeText: string | null;
  width: number;
  height: number;
  formats?: {
    thumbnail?: { url: string };
    small?: { url: string };
    medium?: { url: string };
    large?: { url: string };
  };
}

export interface Apartment {
  id: number;
  documentId: string;
  name: string;
  type: "studio" | "bed1" | "bed2" | "bed3" | "penthouse";
  size: number;
  description: string;
  priceFrom: number;
  priceTo: number;
  monthlyFees: number;
  ship?: Ship;
}

export interface Itinerary {
  id: number;
  documentId: string;
  name: string;
  description: string;
  yearRound: boolean;
  ship?: Ship;
  stops?: ItineraryStop[];
}

export interface ItineraryStop {
  id: number;
  documentId: string;
  name: string;
  latitude: number;
  longitude: number;
  arrivalDate: string | null;
  departureDate: string | null;
  description: string;
  order: number;
}

export interface Story {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: string;
  coverImage: StrapiMedia | null;
  ship?: Ship;
}

async function fetchAPI<T>(path: string): Promise<T> {
  const url = `${STRAPI_URL}/api${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Strapi API error: ${res.status} ${res.statusText}`);
  }
  const json: StrapiResponse<T> = await res.json();
  return json.data;
}

export async function getShips(): Promise<Ship[]> {
  return fetchAPI<Ship[]>("/ships?populate[0]=operator&populate[1]=apartments&populate[2]=itineraries.stops&populate[3]=heroImage&populate[4]=gallery&sort=id:asc");
}

export async function getShip(slug: string): Promise<Ship | null> {
  const ships = await fetchAPI<Ship[]>(
    `/ships?filters[slug][$eq]=${slug}&populate[0]=operator&populate[1]=apartments&populate[2]=itineraries.stops&populate[3]=heroImage&populate[4]=gallery&populate[5]=stories`
  );
  return ships.length > 0 ? ships[0] : null;
}

export async function getApartments(shipDocumentId: string): Promise<Apartment[]> {
  return fetchAPI<Apartment[]>(
    `/apartments?filters[ship][documentId][$eq]=${shipDocumentId}&populate[0]=ship`
  );
}

export async function getItineraries(shipDocumentId: string): Promise<Itinerary[]> {
  return fetchAPI<Itinerary[]>(
    `/itineraries?filters[ship][documentId][$eq]=${shipDocumentId}&populate[0]=stops`
  );
}

export async function getStories(): Promise<Story[]> {
  return fetchAPI<Story[]>("/stories?populate[0]=coverImage&populate[1]=ship&sort=createdAt:desc");
}

export async function getStory(slug: string): Promise<Story | null> {
  const stories = await fetchAPI<Story[]>(
    `/stories?filters[slug][$eq]=${slug}&populate[0]=coverImage&populate[1]=ship`
  );
  return stories.length > 0 ? stories[0] : null;
}

export function getStrapiMediaUrl(media: StrapiMedia | null | undefined): string {
  if (!media?.url) return "";
  if (media.url.startsWith("http")) return media.url;
  return `${STRAPI_URL}${media.url}`;
}

export function formatPrice(price: number): string {
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(1)}M`;
  }
  return `$${(price / 1000).toFixed(0)}K`;
}

export function formatApartmentType(type: string): string {
  const map: Record<string, string> = {
    studio: "Studio",
    bed1: "1 Bedroom",
    bed2: "2 Bedrooms",
    bed3: "3 Bedrooms",
    penthouse: "Penthouse",
  };
  return map[type] || type;
}

export function formatStatus(status: string): string {
  const map: Record<string, string> = {
    operational: "Operational",
    "under-construction": "Under Construction",
    planned: "Planned",
  };
  return map[status] || status;
}
