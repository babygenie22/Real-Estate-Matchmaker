import { db } from "./db";
import { agents } from "@shared/schema";
import { eq } from "drizzle-orm";

const seedAgents = [
  {
    name: "Sarah Mitchell",
    photo: "https://randomuser.me/api/portraits/women/68.jpg",
    bio: "With over 15 years in Metro Detroit luxury real estate, I bring unmatched market knowledge and a personal touch to every transaction. I specialize in helping families find their forever homes in Birmingham, Bloomfield Hills, and the Grosse Pointes.",
    licenseNumber: "MI-6501234567",
    specialties: ["Luxury Homes", "First-Time Buyers", "Relocation"],
    serviceAreas: ["Birmingham", "Bloomfield Hills", "Grosse Pointe", "48009", "48304"],
    languages: ["English", "Spanish"],
    priceRangeMin: 400000,
    priceRangeMax: 3000000,
    rating: 4.9,
    reviewCount: 127,
    transactionCount: 243,
    avgDaysOnMarket: 18,
    saleToListRatio: 1.03,
    yearsExperience: 15,
    personalityTags: ["Analytical", "Patient", "Detail-Oriented"],
    isApproved: true,
    subscriptionStatus: "active",
  },
  {
    name: "Michael Torres",
    photo: "https://randomuser.me/api/portraits/men/75.jpg",
    bio: "Top producer in Metro Detroit for 10 consecutive years, I've closed over $200M in transactions. My deep network and negotiation expertise ensure my clients always get the best deal. Former mortgage banker — I understand the financial side inside and out.",
    licenseNumber: "MI-6502345678",
    specialties: ["Investment Properties", "Commercial", "Multi-Family"],
    serviceAreas: ["Detroit", "Dearborn", "Livonia", "48226", "48124"],
    languages: ["English", "Spanish", "Portuguese"],
    priceRangeMin: 150000,
    priceRangeMax: 2000000,
    rating: 4.8,
    reviewCount: 214,
    transactionCount: 387,
    avgDaysOnMarket: 14,
    saleToListRatio: 1.02,
    yearsExperience: 18,
    personalityTags: ["Bold", "Negotiator", "Community-Focused"],
    isApproved: true,
    subscriptionStatus: "active",
  },
  {
    name: "Priya Sharma",
    photo: "https://randomuser.me/api/portraits/women/44.jpg",
    bio: "I'm passionate about helping first-time buyers navigate Ann Arbor's competitive market. With a background in urban planning, I offer unique insights into neighborhood potential and long-term value. Let's find your perfect Michigan home together!",
    licenseNumber: "MI-6503456789",
    specialties: ["First-Time Buyers", "New Construction", "Condos"],
    serviceAreas: ["Ann Arbor", "Ypsilanti", "Saline", "48103", "48197"],
    languages: ["English", "Hindi"],
    priceRangeMin: 200000,
    priceRangeMax: 700000,
    rating: 4.7,
    reviewCount: 89,
    transactionCount: 142,
    avgDaysOnMarket: 22,
    saleToListRatio: 0.99,
    yearsExperience: 8,
    personalityTags: ["Patient", "Educational", "Detail-Oriented"],
    isApproved: true,
    subscriptionStatus: "active",
  },
  {
    name: "James Washington",
    photo: "https://randomuser.me/api/portraits/men/32.jpg",
    bio: "A Detroit native with 20+ years of experience, I know every neighborhood like the back of my hand — from Midtown's historic homes to Royal Oak's thriving corridor. I help clients find properties that fit their lifestyle and budget perfectly.",
    licenseNumber: "MI-6504567890",
    specialties: ["Urban Properties", "Historic Homes", "Multi-Family"],
    serviceAreas: ["Detroit", "Royal Oak", "Ferndale", "48202", "48067"],
    languages: ["English"],
    priceRangeMin: 100000,
    priceRangeMax: 800000,
    rating: 4.9,
    reviewCount: 301,
    transactionCount: 512,
    avgDaysOnMarket: 20,
    saleToListRatio: 1.01,
    yearsExperience: 22,
    personalityTags: ["Analytical", "Responsive", "Community-Focused"],
    isApproved: true,
    subscriptionStatus: "active",
  },
  {
    name: "Emily Chen",
    photo: "https://randomuser.me/api/portraits/women/90.jpg",
    bio: "Tech-forward realtor serving Oakland County's premier suburbs. I leverage data analytics and 3D virtual tours to give clients an edge in competitive situations. Specializing in helping corporate relocations land in Troy, Novi, and Farmington Hills.",
    licenseNumber: "MI-6505678901",
    specialties: ["Relocation", "New Construction", "Luxury Homes"],
    serviceAreas: ["Troy", "Novi", "Farmington Hills", "48083", "48374"],
    languages: ["English", "Mandarin"],
    priceRangeMin: 350000,
    priceRangeMax: 1500000,
    rating: 4.8,
    reviewCount: 156,
    transactionCount: 198,
    avgDaysOnMarket: 16,
    saleToListRatio: 1.04,
    yearsExperience: 10,
    personalityTags: ["Tech-Savvy", "Analytical", "Responsive"],
    isApproved: true,
    subscriptionStatus: "active",
  },
];

export async function seedDatabase() {
  const existing = await db.select().from(agents).limit(1);
  if (existing.length === 0) {
    for (const agent of seedAgents) {
      await db.insert(agents).values(agent as any);
    }
    console.log("Database seeded with sample agents.");
  } else {
    // Keep seeded agents in sync with current seed data
    for (const agent of seedAgents) {
      await db.update(agents).set({
        photo: agent.photo,
        bio: agent.bio,
        serviceAreas: agent.serviceAreas,
        specialties: agent.specialties,
        licenseNumber: agent.licenseNumber,
        priceRangeMin: agent.priceRangeMin,
        priceRangeMax: agent.priceRangeMax,
      }).where(eq(agents.name, agent.name));
    }
  }
}
