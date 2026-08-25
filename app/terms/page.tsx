import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { Pending } from "@/components/legal/LegalPage";
import { CONTACT } from "@/lib/contact";
import { LEGAL_ENTITY, LEGAL_UPDATED } from "@/lib/legal";
import { SITE_URL } from "@/lib/site";
import { StructuredData } from "@/lib/StructuredData";

/* ⚠️ A DRAFT WRITTEN FROM THE CODE, NOT LEGAL ADVICE — the same caveat the
 * banner on app/privacy/page.tsx sets out at length.
 *
 * The parts worth a solicitor's attention in particular are the liability
 * section and the allergen wording. Both are written CONSERVATIVELY on
 * purpose: they disclaim what a website can honestly disclaim and then
 * explicitly preserve the reader's statutory rights, because a UK consumer
 * contract that tries to exclude those is not merely unenforceable — the
 * attempt is itself a breach. Where the drafting had a choice between a
 * broad exclusion and a narrow one, it takes the narrow one. */

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${SITE_URL}/terms#webpage`,
  name: "Terms of Use — Maginhawa Group",
  description:
    "The terms on which you may use the Maginhawa Group website.",
  url: `${SITE_URL}/terms`,
  dateModified: LEGAL_UPDATED,
  isPartOf: { "@id": `${SITE_URL}/#website` },
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "The terms on which you may use the Maginhawa Group website — what the site is, what it is not, reservations, menus and allergens, and our liability.",
  alternates: { canonical: "/terms" },
  openGraph: {
    type: "website",
    title: "Terms of Use — Maginhawa Group",
    description: "The terms on which you may use the Maginhawa Group website.",
    url: "/terms",
    images: [
      {
        url: "/og/maginhawa-og.jpg",
        width: 1200,
        height: 630,
        alt: "Maginhawa Group",
      },
    ],
  },
};

export default function TermsPage() {
  return (
    <>
      <StructuredData data={jsonLd} />
      <LegalPage
        title="Terms of Use"
        standfirst="The terms on which you may use this website — what it is, what it isn’t, and where our responsibility begins and ends."
      >
        <h2>Who these terms are with</h2>
        <p>
          This website is operated by{" "}
          {LEGAL_ENTITY.companyName ?? (
            <Pending what="registered company name" />
          )}
          {LEGAL_ENTITY.companyNumber ? (
            <> (company number {LEGAL_ENTITY.companyNumber})</>
          ) : (
            <>
              {" "}
              (company number <Pending what="Companies House number" />)
            </>
          )}
          , trading as Maginhawa Group. By using this site you accept these
          terms. If you do not accept them, please do not use the site.
        </p>

        <h2>What this site is</h2>
        <p>
          This is an information site about our restaurants — who we are, where
          we are, what we cook, who is writing about us and who we are hiring.
          Nothing on it is an offer to enter into a contract, and nothing on it
          guarantees that a table, a dish or a role is available.
        </p>

        <h2>Reservations are made elsewhere</h2>
        <p>
          You cannot book a table on this website. Our reservation links hand
          you over to the platform each venue uses — OpenTable, SevenRooms or
          ResDiary — or to that restaurant’s own site. Your booking is a matter
          between you and whoever operates that service, on their terms, and
          any change, cancellation or dispute is dealt with there.
        </p>

        <h2>Menus, prices and availability</h2>
        <p>
          Our kitchens change what they cook. Menus and prices shown here are
          published in good faith and are the ones we had at the time; they can
          change without notice, dishes sell out, and a menu on this site is not
          a promise that a particular dish will be available on a particular
          day. The menu in the restaurant is the one that applies.
        </p>

        <h2>Allergens and dietary requirements</h2>
        <p>
          <strong>
            Do not rely on this website for allergen information.
          </strong>{" "}
          Our kitchens handle nuts, shellfish, dairy, gluten, sesame, soy and
          other allergens, and we cannot guarantee that any dish is free from
          traces of them. If you have an allergy or intolerance, tell the
          restaurant when you book and tell your server before you order, every
          time. They have the current information; this page does not.
        </p>

        <h2>What belongs to us</h2>
        <p>
          The photography, writing, design, logos and restaurant names on this
          site belong to us or to the people we licensed them from. You are
          welcome to look at them, link to any page, and quote us fairly in
          press coverage or on social media with attribution. You may not copy
          our photography or copy for your own commercial use, or present our
          material as yours, without asking first — write to{" "}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> and we are
          usually glad to help.
        </p>

        <h2>Using the site properly</h2>
        <p>
          Please do not attempt to gain unauthorised access to this site or the
          servers behind it, introduce anything malicious, scrape it in a way
          that degrades it for other people, or use the contact and careers
          forms to send unsolicited marketing.
        </p>

        <h2>Links to other sites</h2>
        <p>
          We link out to our restaurants’ own websites, to booking platforms, to
          Google Maps, to our Instagram, and to publications who have written
          about us. Those sites are not ours and we are not responsible for
          their content or their practices. A link is not an endorsement of
          everything on the other end of it.
        </p>

        <h2>Careers submissions</h2>
        <p>
          If you send us an application, please send information that is true
          and that is yours to send. We handle what you send us as described in
          our <Link href="/privacy">privacy notice</Link>. We cannot promise to reply
          to every application, and sending one does not create any obligation
          on either side.
        </p>

        <h2>Availability</h2>
        <p>
          We would like this site to be available all the time and correct in
          every detail, but we do not guarantee either. We may change, suspend
          or withdraw any part of it without notice.
        </p>

        <h2>Our responsibility to you</h2>
        <p>
          We do not exclude or limit our liability to you where it would be
          unlawful to do so. That includes liability for death or personal
          injury caused by our negligence, for fraud or fraudulent
          misrepresentation, and{" "}
          <strong>
            any of the rights you have as a consumer under UK law, which these
            terms do not affect
          </strong>
          .
        </p>
        <p>
          Subject to that, we are not liable for loss that arises because you
          relied on information published on this website — for example a menu
          or an opening time that had changed — or for any loss that was not
          foreseeable when you used the site. If you need to be certain about
          something, please contact the restaurant and ask.
        </p>

        <h2>Which law applies</h2>
        <p>
          These terms are governed by the law of England and Wales, and the
          courts of England and Wales have jurisdiction. If you live elsewhere
          in the United Kingdom you may bring proceedings in your own courts.
        </p>

        <h2>Changes to these terms</h2>
        <p>
          We may revise these terms. The version that applies is the one
          published here when you use the site, and the date at the top of this
          page tells you when it last changed.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms go to{" "}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
        </p>
      </LegalPage>
    </>
  );
}
