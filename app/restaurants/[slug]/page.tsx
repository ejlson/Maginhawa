import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RestaurantDetail from "@/components/RestaurantDetail";
import { RestaurantJsonLd } from "@/lib/jsonld";
import { RESTAURANTS, getRestaurant } from "@/lib/restaurants";
import { pressForRestaurant } from "@/lib/press";

export function generateStaticParams() {
  return RESTAURANTS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const r = getRestaurant(slug);
  if (!r) return { title: "Restaurant not found" };
  const mentions = pressForRestaurant(slug);
  const outlets = Array.from(new Set(mentions.map((m) => m.outlet))).slice(0, 5);
  const trail =
    outlets.length > 0
      ? ` As featured in ${outlets.join(", ")}.`
      : "";
  return {
    title: `${r.name} — ${r.tagline}`,
    description: `${r.description}${trail}`,
    alternates: { canonical: `/restaurants/${r.slug}` },
    openGraph: {
      type: "website",
      title: `${r.name} — Maginhawa Group`,
      description: r.description,
      url: `/restaurants/${r.slug}`,
      images: [{ url: r.image, width: 1200, height: 630, alt: r.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: r.name,
      description: r.tagline,
      images: [r.image],
    },
  };
}

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = getRestaurant(slug);
  if (!restaurant) notFound();
  return (
    <>
      <RestaurantJsonLd restaurant={restaurant} />
      <RestaurantDetail restaurant={restaurant} />
    </>
  );
}
