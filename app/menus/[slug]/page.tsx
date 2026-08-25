import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MenuPage from "@/components/MenuPage";
import { RESTAURANTS, getRestaurant } from "@/lib/restaurants";
import { SITE_URL } from "@/lib/site";
import { StructuredData } from "@/lib/StructuredData";

/* ═══ ONE ROUTE PER MENU, WRITTEN AT BUILD TIME ═══
 *
 * The site's second dynamic segment, after /blog/[slug], and it works the
 * same way: under `output: "export"` there is no server to be dynamic on,
 * so Next asks generateStaticParams what the segment can be and writes one
 * folder of HTML per answer. /menus/hoodwood is a real
 * out/menus/hoodwood/index.html on Cloudflare's edge.
 *
 * ⚠️ WHICH MEANS THE LIST BELOW IS THE WHOLE ROUTE TABLE. A venue that
 * gains `menuPages` after a deploy has no page until the next build, and a
 * URL not in this list is served by the static 404 — the `notFound()` here
 * only ever fires in development.
 *
 * ── WHY `/menus/`, NOT `/restaurants/<slug>/menu` ──
 * The nested form reads better and was the first choice. It was dropped on
 * two counts, neither of them aesthetic:
 *   1. THERE IS NO `/restaurants/<slug>`. The venue detail route was
 *      removed (see the note on primaryAction in lib/restaurants.ts), so
 *      the nested form publishes a URL whose parent 404s — and trimming a
 *      path back one segment is a thing readers actually do.
 *   2. `public/menu/` IS AN ASSET TREE. The pages themselves are served
 *      from /menu/hoodwood/page-1.png. A route at /menu/hoodwood would put
 *      an index.html in the same exported folder as the images it renders,
 *      which works right up until it does not.
 * Plural `menus` for routes, singular `menu` for assets — different words,
 * no collision, no orphan.
 */

/** the venues that actually have a menu on file — Bunso has none */
const withMenus = () => RESTAURANTS.filter((r) => r.menuPages?.length);

export function generateStaticParams() {
  return withMenus().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const r = getRestaurant(slug);
  if (!r?.menuPages?.length) return {};

  /* ⚠️ THE TAGLINE IS NOT LOWERCASED, and it was. `.toLowerCase()` read
     naturally in the template and turned "Caribbean Cuisine" into
     "caribbean cuisine" — it does not know a proper adjective from a
     common one, and four of the seven taglines lead with one (Caribbean,
     Filipino, Filipino-Japanese). It is set as written instead.

     THE VENUE BLURB IS APPENDED ONLY IF IT FITS. Google truncates a meta
     description around 155 characters; the lead sentence alone is 70-90
     across the set, so the blurb lands for some venues and not others,
     and a sentence cut mid-word is worse than one that is simply absent. */
  const lead = `The current ${r.name} menu — ${r.tagline} in ${r.location}.`;
  const description =
    lead.length + 1 + r.description.length <= 155
      ? `${lead} ${r.description}`
      : lead;

  return {
    /* BARE. The root layout's title.template adds " — Maginhawa Group";
       a full string here would render it twice, which is the defect
       app/restaurants/page.tsx documents at length. "Menu" leads because
       that is the word people type next to the venue's name. */
    title: `${r.name} Menu`,
    description,
    /* ⚠️ ITS OWN CANONICAL, ALWAYS. Metadata inherits on this site, so an
       absent canonical is not neutral — it silently claims to be the home
       page and asks crawlers to fold this route into it. Same note. */
    alternates: { canonical: `/menus/${r.slug}` },
    openGraph: {
      type: "website",
      title: `${r.name} Menu — Maginhawa Group`,
      description: r.description,
      url: `/menus/${r.slug}`,
      images: [
        {
          /* the VENUE's photograph, not a menu page. A share card wants the
             room; a 4961x7016 sheet of A4 cropped to 1200x630 is an
             unreadable band of the middle of a menu. */
          url: r.image,
          width: 1200,
          height: 630,
          alt: `${r.name} — ${r.tagline}`,
        },
      ],
    },
  };
}

export default async function VenueMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = getRestaurant(slug);
  if (!r?.menuPages?.length) notFound();

  /* A schema.org Menu, hung off the venue the organisation record already
     declares. `hasMenu` is the property that joins them, and the venue's
     @id is spelled the way lib/jsonld.tsx and app/restaurants/page.tsx
     spell it — the three agree on that fragment or they describe two
     different restaurants. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${SITE_URL}/menus/${r.slug}#menu`,
    name: `${r.name} Menu`,
    url: `${SITE_URL}/menus/${r.slug}`,
    inLanguage: "en-GB",
    ...(r.menuLabel ? { dateModified: r.menuLabel } : {}),
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: {
      "@type": r.bookable ? "Restaurant" : "FoodEstablishment",
      "@id": `${SITE_URL}/restaurants#${r.slug}`,
      name: r.name,
      servesCuisine: r.cuisine,
      url: r.website ?? `${SITE_URL}/restaurants`,
      hasMenu: { "@id": `${SITE_URL}/menus/${r.slug}#menu` },
    },
  };

  return (
    <>
      <StructuredData data={jsonLd} />
      <MenuPage restaurant={r} pages={r.menuPages} />
    </>
  );
}
