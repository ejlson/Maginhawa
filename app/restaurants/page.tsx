import type { Metadata } from "next";
import RestaurantsShowcase from "@/components/RestaurantsShowcase";

export const metadata: Metadata = {
  title: "Restaurants — Maginhawa Group",
};

export default function RestaurantsPage() {
  return <RestaurantsShowcase />;
}
