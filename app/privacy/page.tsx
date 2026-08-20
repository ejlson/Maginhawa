import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { Pending } from "@/components/LegalPage";
import { ConsentControl } from "@/components/CookieBanner";
import { analyticsConfigured, marketingConfigured } from "@/lib/consent";
import { CONTACT } from "@/lib/contact";
import { LEGAL_ENTITY, LEGAL_UPDATED } from "@/lib/legal";
import { SITE_URL } from "@/lib/site";

/* ⚠️ THIS IS A DRAFT WRITTEN FROM THE CODE, NOT LEGAL ADVICE.
 *
 * Every factual claim below was checked against what this repository
 * actually does — which forms exist, what fields they carry, which third
 * parties the browser contacts, what is written to storage. That is the half
 * a developer can get right and the half most privacy notices get wrong,
 * because they are copied from a template that describes a site nobody built.
 *
 * What it is NOT is a lawyer's review. Before this goes live somebody
 * qualified should read it against the group's actual operations — the
 * venues, the booking platforms, the CCTV, the staff records, the loyalty
 * data — none of which this codebase can see. The scope section below says
 * as much to the reader, deliberately: it is honest about covering the
 * WEBSITE and not the whole business, and that boundary is exactly what a
 * solicitor will want to widen or confirm.
 *
 * The nulls in lib/legal.ts are the other half of the handover. */

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${SITE_URL}/privacy#webpage`,
  name: "Privacy Notice — Maginhawa Group",
  description:
    "How Maginhawa Group collects and uses personal information through this website, and your rights under UK data protection law.",
  url: `${SITE_URL}/privacy`,
  dateModified: LEGAL_UPDATED,
  isPartOf: { "@id": `${SITE_URL}/#website` },
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export const metadata: Metadata = {
  title: "Privacy Notice",
  description:
    "How Maginhawa Group collects and uses personal information through this website — what we hold, who we share it with, how long we keep it, and your rights under UK GDPR.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "website",
    title: "Privacy Notice — Maginhawa Group",
    description:
      "What this website collects, who receives it, and your rights under UK data protection law.",
    url: "/privacy",
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

export default function PrivacyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LegalPage
        title="Privacy Notice"
        standfirst="What this website collects, why, who else sees it, and what you can ask us to do about it."
      >
        {/* ── A SUMMARY, AND IT IS NOT A SUBSTITUTE FOR THE NOTICE ──
            Added after reviewing this against a standard privacy-policy
            template (Termly's), which opens the same way. The reason it is
            worth having is that almost nobody reads a privacy notice
            end-to-end; a reader arrives with ONE question, usually "do you
            sell my data" or "what did you just set". Six lines they will
            actually read beats twelve sections they will not.
            ⚠️ EVERY CLAIM HERE IS REPEATED IN FULL BELOW. A summary that
            says something the body does not is the worst kind of error in
            this document, because the summary is the part that gets read. */}
        <h2>The short version</h2>
        <ul>
          <li>
            <strong>We do not sell your personal information</strong>, and we
            never share it with anyone for their own marketing.
          </li>
          <li>
            <strong>No cookies are set until you agree to them.</strong> If you
            decline, or ignore the banner, no analytics or advertising script
            is loaded at all.
          </li>
          <li>
            <strong>We have no accounts and no passwords.</strong> This site
            stores nothing about you on a server of ours — there isn&rsquo;t
            one.
          </li>
          <li>
            The only information you actively give us arrives by{" "}
            <strong>ordinary email</strong>, because our forms open a draft in
            your own email app rather than posting anywhere.
          </li>
          <li>
            You can ask us for a copy of what we hold, or to delete it, at any
            time — free, at{" "}
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
          </li>
        </ul>

        <h2>Who we are</h2>
        <p>
          Maginhawa Group is a London family of restaurants. For the purposes
          of UK data protection law, the data controller for this website is{" "}
          {LEGAL_ENTITY.companyName ?? (
            <Pending what="registered company name" />
          )}
          {LEGAL_ENTITY.companyNumber ? (
            <>, registered in England and Wales under company number{" "}
              {LEGAL_ENTITY.companyNumber}</>
          ) : (
            <>
              , registered in England and Wales under company number{" "}
              <Pending what="Companies House number" />
            </>
          )}
          .
        </p>
        {LEGAL_ENTITY.registeredOffice ? (
          <address>
            {LEGAL_ENTITY.registeredOffice.map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
          </address>
        ) : (
          <p>
            Registered office:{" "}
            <Pending what="registered office address" />.
          </p>
        )}
        <p>
          If you have any question about this notice or about the information
          we hold, write to us at{" "}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
        </p>

        <h2>What this notice covers</h2>
        <p>
          This notice describes what happens when you use{" "}
          <strong>this website</strong>. It does not describe everything our
          restaurants do with personal information — dining reservations, gift
          cards, CCTV in our venues, supplier records and employment files are
          each handled separately, and several of them sit with our individual
          restaurants rather than with the group.
        </p>
        <p>
          In particular, <strong>we do not take bookings on this site</strong>.
          When you follow a reservation link you leave us for the booking
          platform that venue uses — OpenTable, SevenRooms, ResDiary — or for
          the restaurant’s own website. Anything you type there is governed by
          that provider’s privacy policy and not by this one.
        </p>

        <h2>What we collect, and when</h2>

        <h3>When you use the enquiry form</h3>
        <p>
          The form on our <Link href="/contact">contact page</Link> asks for your
          first name, last name, email address and a message. It has one
          unusual property worth stating plainly:{" "}
          <strong>
            the form does not send anything to a server of ours
          </strong>
          . Submitting it opens a draft in your own email application with the
          details filled in, and nothing leaves your device until you press
          send yourself. What reaches us is an ordinary email from your own
          address, and we hold it the way we hold any email.
        </p>

        <h3>When you apply for a job</h3>
        <p>
          The form on our <Link href="/careers">careers page</Link> works the same
          way. It collects the role you are interested in, your name, your
          email address, the file name of any CV you intend to attach and your
          message, and it prepares an email to{" "}
          <a href="mailto:careers@mgnhw.com">careers@mgnhw.com</a> for you to
          send. Your CV is attached by you, in your own email client; this
          website never receives or stores it.
        </p>

        <h3>When you simply browse</h3>
        <p>
          Our hosting provider records the technical information any web server
          records in order to serve a page and defend itself from attack —
          your IP address, the page requested, the time, and your browser’s
          user-agent string. We do not combine this with anything else or use
          it to identify you.
        </p>

        <h2>Cookies and similar technologies</h2>
        {/* ⚠️ THIS SECTION HAS TWO VERSIONS AND THE ENV VAR PICKS ONE.
            The notice has to be true in BOTH configurations of the site.
            Before GA4 it said, in bold, that the site set no cookies and ran
            no analytics — which was accurate, and became false the moment a
            measurement ID was set. Rather than leave a paragraph that is
            wrong half the time, the two states are written out and
            `analyticsConfigured` chooses. Delete NEXT_PUBLIC_GA_ID and this
            page goes back to telling the truth on its own. */}
        {analyticsConfigured ? (
          <>
            <p>
              <strong>
                We use Google Analytics, and it only runs if you agree to it.
              </strong>{" "}
              Nothing is measured and no analytics cookie is written until you
              choose “Accept” on the banner. If you decline, or simply ignore
              it, the script is never loaded at all — we do not load it and
              then switch it off, so no request is made to Google and your
              visit stays entirely between you and this website.
            </p>
            <p>
              If you accept, Google Analytics sets two cookies on your device:
            </p>
            <ul>
              <li>
                <strong>_ga</strong> — distinguishes one browser from another
                so a returning visit is not counted as a new person. Expires
                after 2 years.
              </li>
              <li>
                <strong>_ga_&lt;id&gt;</strong> — keeps the state of your
                current visit. Expires after 2 years.
              </li>
            </ul>
            <p>
              We use this to see which pages are read, which restaurants people
              look at, and roughly where our readers are — never to identify
              you personally. We have not enabled Google Signals, advertising
              features or remarketing, and Google Analytics does not receive
              your name, your email address or anything you type into a form on
              this site.
            </p>
            <p>
              <strong>Our lawful basis for this is your consent</strong>, and
              you can withdraw it at any time — as easily as you gave it, using
              the control below. Withdrawing stops any further measurement
              immediately.
            </p>
            {marketingConfigured && (
              <>
                <h3>Advertising and marketing cookies</h3>
                <p>
                  If you accept marketing cookies, we use three advertising
                  tools. All three are off unless you switch them on, and each
                  sets its own cookies:
                </p>
                <ul>
                  <li>
                    <strong>Meta pixel</strong> (Facebook and Instagram) — lets
                    us show our restaurants to people who have visited this
                    site, and tells us whether an Instagram ad led to a
                    booking. Sets <strong>_fbp</strong>, which expires after 3
                    months.
                  </li>
                  <li>
                    <strong>TikTok pixel</strong> — the same, for TikTok ads.
                    Sets <strong>_ttp</strong>, which expires after 13 months.
                  </li>
                  <li>
                    <strong>Google Ads</strong> — measures whether a Google ad
                    led to a booking, and allows us to show ads to people who
                    have been here before. Uses the Google cookies described
                    above together with Google&rsquo;s own advertising cookies.
                  </li>
                </ul>
                <p>
                  These tools work by recognising your browser on other
                  websites and apps, which is what makes them different in kind
                  from the analytics above.{" "}
                  <strong>
                    Our lawful basis is your consent, and you can withdraw it at
                    any time using the control below.
                  </strong>
                </p>

                <h3>Meta as a joint controller</h3>
                <p>
                  For the data collected by the Meta pixel, Maginhawa Group Ltd
                  and Meta Platforms Ireland Limited are{" "}
                  <strong>joint controllers</strong>. In plain terms, we decide
                  together what is collected and why: we choose to install the
                  pixel and what to measure, and Meta determines how it
                  processes what it receives.
                </p>
                <p>
                  Under our arrangement with Meta, Meta is responsible for
                  giving you your data-protection rights over the information it
                  holds — access, erasure and the rest — because Meta holds it
                  and we do not. You can exercise those rights directly through
                  your Facebook or Instagram settings, and you can object to
                  this kind of advertising in Meta&rsquo;s{" "}
                  <a
                    href="https://www.facebook.com/settings?tab=ads"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ad preferences
                  </a>
                  . You can also raise anything with us and we will pass it on.
                </p>
              </>
            )}

            <ConsentControl />
          </>
        ) : (
          <p>
            <strong>
              This website sets no cookies and runs no analytics, advertising or
              tracking scripts.
            </strong>{" "}
            There is no Google Analytics on this site, no advertising pixel and
            no heat-mapping tool. That is why you have not been asked to accept
            any.
          </p>
        )}
        <p>
          We also use browser storage, which is not the same thing as a
          cookie: it is never sent to any server. When you first arrive we
          record a single value in your browser’s <em>session storage</em> to
          note that you have seen the opening animation, so that moving
          between pages does not replay it; your browser discards it when you
          close the tab. {analyticsConfigured ? "Your cookie choice is stored the same way, in local storage, so that we can remember it without setting a cookie to record that you did not want cookies." : ""}
        </p>
        <p>
          Some of the third parties named below may set their own cookies or
          receive your IP address as a necessary part of delivering content to
          your browser. We have no access to anything they collect.
        </p>

        <h2>Who else is involved</h2>
        <p>
          Delivering this site means your browser contacts a small number of
          other companies:
        </p>
        <ul>
          <li>
            <strong>Cloudflare</strong> hosts and serves the site, and sees the
            request information described above.
          </li>
          <li>
            <strong>Adobe Fonts (Typekit)</strong> serves one of our typefaces.
            Your browser requests the font files directly from Adobe, which
            means Adobe receives your IP address and the address of the page
            you are viewing.
          </li>
          <li>
            <strong>Cloudinary</strong> may serve our photography, and receives
            your IP address when it does.
          </li>
          {analyticsConfigured ? (
            <li>
              <strong>Google</strong> provides Google Analytics, and receives
              your IP address, the pages you view and the cookie identifiers
              above — <em>only</em> if you accepted analytics cookies. Google
              is based in the United States; the transfer is covered by the UK
              extension to the EU–US Data Privacy Framework and by Google’s
              standard contractual clauses. You can also opt out of Google
              Analytics across every site using Google’s own{" "}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
              >
                browser add-on
              </a>
              .
            </li>
          ) : null}
          {marketingConfigured ? (
            <li>
              <strong>Meta, TikTok and Google Ads</strong> receive your IP
              address, the pages you view and their own cookie identifiers —{" "}
              <em>only</em> if you accepted marketing cookies. All three are
              based outside the UK; those transfers rely on the UK extension to
              the EU–US Data Privacy Framework and on standard contractual
              clauses. See the joint-controller note above for Meta in
              particular.
            </li>
          ) : null}
          <li>
            <strong>Google Maps</strong> is used only as a destination — the
            address links on our contact page open Google Maps in a new tab.
            Nothing is loaded from Google until you click.
          </li>
        </ul>
        <p>
          We do not sell personal information, and we do not share it with
          anyone for their own marketing.
        </p>

        <h2>Why we are allowed to use it</h2>
        <p>
          Where you contact us, our lawful basis is our{" "}
          <strong>legitimate interest</strong> in answering people who get in
          touch, and — where your message is about a possible booking or
          service — <strong>steps taken at your request before entering into a
          contract</strong>. Where you apply for a role, our basis is again
          taking steps at your request before entering into a contract of
          employment. Where we keep server logs, our basis is our legitimate
          interest in operating and securing the site.
        </p>

        <h2>How long we keep it</h2>
        <ul>
          <li>
            <strong>Enquiries:</strong> kept while we deal with your message
            and for a reasonable period afterwards, then deleted.
          </li>
          <li>
            <strong>Job applications:</strong> kept for the duration of the
            recruitment process. We may keep your details on file afterwards in
            case a suitable role comes up — tell us if you would rather we did
            not.
          </li>
          <li>
            <strong>Server logs:</strong> retained by our hosting provider for
            a short period under their own schedule.
          </li>
        </ul>

        <h2>Where your information goes</h2>
        <p>
          Some of the providers above are based outside the United Kingdom, or
          use infrastructure that is. Where personal information is transferred
          out of the UK, it is protected by the safeguards UK data protection
          law requires, such as an adequacy decision or the International Data
          Transfer Agreement.
        </p>

        <h2>Your rights</h2>
        <p>
          Under UK data protection law you have the right to ask us for a copy
          of the personal information we hold about you, to have it corrected
          if it is wrong, to have it deleted, to ask us to restrict how we use
          it, to object to our using it on the basis of legitimate interests,
          and to receive it in a portable form. Exercising any of these is
          free, and you can do it by writing to{" "}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
        </p>
        <p>
          If you are unhappy with how we have handled your information you can
          complain to the Information Commissioner’s Office at{" "}
          <a
            href="https://ico.org.uk/make-a-complaint/"
            target="_blank"
            rel="noopener noreferrer"
          >
            ico.org.uk
          </a>
          , or by calling their helpline on 0303 123 1113. We would rather you
          came to us first so that we can put it right.
          {LEGAL_ENTITY.icoReference ? (
            <> Our ICO registration reference is {LEGAL_ENTITY.icoReference}.</>
          ) : (
            <>
              {" "}
              Our ICO registration reference is{" "}
              <Pending what="ICO registration reference" />.
            </>
          )}
        </p>

        <h2>How we keep your information safe</h2>
        <p>
          The strongest security measure this site has is how little it does.
          There is no database, no login, no password and no server of ours
          running at request time — the whole site is a set of static files, so
          there is no store of customer data here to breach.
        </p>
        <p>Beyond that:</p>
        <ul>
          <li>
            Everything is served over <strong>HTTPS</strong> and the site is
            HSTS-preloaded, so a browser will not connect to it insecurely even
            if asked to.
          </li>
          <li>
            A <strong>Content Security Policy</strong> restricts what the page
            is allowed to load and where it may send anything, which is what
            stops an injected script from quietly shipping data elsewhere.
          </li>
          <li>
            The site cannot be framed by another site, and browsers are told
            not to guess at file types — the two settings behind most
            clickjacking and content-sniffing attacks.
          </li>
          <li>
            Enquiries and applications reach us as ordinary email and are
            protected by our email provider&rsquo;s security, and by the access
            controls on the accounts that read them.
          </li>
        </ul>
        <p>
          No method of transmission over the internet is completely secure, and
          we cannot promise otherwise. If you ever believe something has gone
          wrong, tell us at{" "}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> and we will
          look into it.
        </p>

        <h2>Other websites we link to</h2>
        <p>
          We link out to our restaurants&rsquo; own sites, to booking platforms,
          to Google Maps, to our Instagram and to publications who have written
          about us. Once you follow one of those links you are on somebody
          else&rsquo;s site, under their privacy policy, and we have no control
          over and no responsibility for what they collect. A link from us is
          not an endorsement of their privacy practices.
        </p>

        <h2>Automated decisions and profiling</h2>
        <p>
          <strong>
            We do not make any decision about you by automated means, and we do
            not profile you.
          </strong>{" "}
          Nothing on this site scores, ranks or sorts individual people, and no
          decision affecting you is taken without a person involved. If you
          accept marketing cookies, the advertising platforms named above build
          their own audiences on their own systems — that is their processing,
          described in their policies, and it is the one thing declining
          marketing cookies switches off entirely.
        </p>

        <h2>Do Not Track and Global Privacy Control</h2>
        <p>
          Most browsers can send a &ldquo;Do Not Track&rdquo; signal. There is
          still no agreed standard for what a website should do with it, so —
          like most sites — we do not respond to it specifically. We would
          rather not claim to honour a signal whose meaning nobody agrees on.
        </p>
        <p>
          It makes no practical difference here: nothing is tracked on this site
          unless you have actively accepted it, which is a stronger position
          than responding to the signal would give you.
        </p>

        <h2>Children</h2>
        <p>
          This website is intended for adults. We do not knowingly collect
          personal information from children through it. If you believe a child
          has sent us information, contact us and we will delete it.
        </p>

        <h2>Changes to this notice</h2>
        <p>
          If we change how this site handles personal information we will update
          this page and change the date at the top of it. The date is the
          reliable indicator — if it has not moved, nothing here has.
        </p>
      </LegalPage>
    </>
  );
}
