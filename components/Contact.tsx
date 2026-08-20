"use client";

/* THIS FILE BECAME A CLIENT COMPONENT WHEN THE FORM STARTED WORKING, and
   that costs nothing here: its only caller is ContactPage, which is
   already "use client" for its menu state, so this subtree was being
   shipped to the browser either way. What changed is that it now has
   state worth shipping. */

import { useRef, useState } from "react";
import styles from "./Contact.module.css";
import PillCta from "./PillCta";
import Reveal from "./Reveal";
import { CONTACT } from "@/lib/contact";

type ContactProps = {
  /**
   * True on /contact, where this section is the FIRST thing on the page and
   * needs top padding to clear the fixed nav — without it the "CONTACT US"
   * wordmark renders straight under the nav links and the two collide.
   * The home page leaves this off: there the section deliberately butts
   * straight up against the Locations film above it.
   */
  standalone?: boolean;
};

type Values = { firstName: string; lastName: string; email: string; message: string };
type Errors = Partial<Record<"firstName" | "email" | "message", string>>;

const EMPTY: Values = { firstName: "", lastName: "", email: "", message: "" };

/* THE EMAIL TEST IS DELIBERATELY LOOSE.
   It asks for something before an @, something after it, a dot, and
   something after that — and nothing else. The temptation is RFC 5322,
   and every attempt at it in a one-line regex rejects addresses that are
   genuinely valid (new TLDs, plus-addressing, apostrophes, unicode
   locals) while still failing to catch the only mistake that matters,
   which is a real address typed wrong. A form that refuses a diner's
   actual email address is a worse failure than one that lets a typo
   through, because the typo gets a bounce and the refusal gets silence.
   The browser's own `type="email"` heuristic is about this strict. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(v: Values): Errors {
  const e: Errors = {};
  /* Only the FIRST name is required. A last name is asked for because it
     is useful and left optional because plenty of people do not have one
     to give, and a form that will not accept a mononym is a form that
     turns a diner away over a data-modelling assumption. */
  if (!v.firstName.trim()) e.firstName = "Please tell us your name.";
  if (!v.email.trim()) e.email = "Please add an email address so we can reply.";
  else if (!EMAIL.test(v.email.trim())) e.email = "That does not look like an email address — please check it.";
  if (!v.message.trim()) e.message = "Please tell us what your enquiry is about.";
  return e;
}

export default function Contact({ standalone = false }: ContactProps) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState("");
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  /* ── WHEN A FIELD RE-VALIDATES ──
     On change, but ONLY once it has already failed. Validating every
     keystroke from the start means the email field is marked invalid
     from its first character to its last-but-one, which is the form
     scolding someone for not having finished typing yet. Once a message
     is on screen the rule flips: the reader is now trying to satisfy it,
     and clearing it the moment they do is the feedback they are looking
     for. (Nielsen's "reward early, punish late", and the reason there is
     no onBlur validation here either — tabbing past an empty optional
     field is not an error.) */
  const onChange =
    (key: keyof Values) =>
    (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next = { ...values, [key]: ev.target.value };
      setValues(next);
      if (key in errors) {
        const re = validate(next);
        setErrors((prev) => {
          const { [key as keyof Errors]: _drop, ...rest } = prev;
          return re[key as keyof Errors]
            ? { ...rest, [key]: re[key as keyof Errors] }
            : rest;
        });
      }
    };

  const handleSubmit = (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();

    const found = validate(values);
    setErrors(found);

    const keys = Object.keys(found) as (keyof Errors)[];
    if (keys.length) {
      setSent(false);
      /* THE COUNT IS THE WHOLE POINT OF THIS SENTENCE. A live region that
         says "there is a problem" tells a screen-reader user something
         they already knew; a count tells them how much work is ahead and
         whether they fixed all of it on the next attempt. */
      setStatus(
        keys.length === 1
          ? "There is 1 problem with the form. It is described below the field it belongs to."
          : `There are ${keys.length} problems with the form. Each is described below the field it belongs to.`,
      );
      /* Focus the first invalid field IN DOM ORDER, not in the order the
         validator happened to find them — `found` is keyed and key order
         is an implementation detail, whereas the reader's expectation is
         "take me to the first thing wrong on the page". */
      const order: (keyof Errors)[] = ["firstName", "email", "message"];
      const firstKey = order.find((k) => k in found);
      const id =
        firstKey === "firstName"
          ? "contact-first"
          : firstKey === "email"
            ? "contact-email"
            : "contact-message";
      formRef.current?.querySelector<HTMLElement>(`#${id}`)?.focus();
      return;
    }

    /* ── DELIVERY IS A mailto: HAND-OFF, AND THAT IS A DECISION ──
       This site is a STATIC EXPORT (next.config.mjs, `output: "export"`)
       — there is no server of ours at request time, so there is nothing
       here that could receive a POST. The three ways out of that are a
       third-party form service, a serverless function, or handing the
       message to the reader's own email client. This is the third, and
       it is what the careers form already does (JoinUs.tsx), so the site
       now answers both forms the same way.

       WHAT IT BUYS: no new data processor to name in the privacy notice,
       no API key in the bundle, no CSP change — `form-action 'self'` in
       public/_headers would block a cross-origin POST anyway — and the
       message arrives from the reader's real address, so replying works.

       WHAT IT COSTS, STATED PLAINLY TO THE READER RATHER THAN HIDDEN:
       nothing is actually sent until they press send in their own mail
       app, and if they have no mail client configured nothing opens at
       all. Both cases are covered by the card the success branch renders
       — which is why it says "should now be open" and offers the address
       as a fallback, rather than claiming "message sent". A form that
       lies about delivery is worse than one that does not send. */
    const subject = `Website enquiry — ${values.firstName} ${values.lastName}`.trim();
    const body = [
      `Name: ${values.firstName} ${values.lastName}`.trim(),
      `Email: ${values.email}`,
      "",
      "Message:",
      values.message,
    ].join("\n");

    window.location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    setSent(true);
    setStatus(
      `A draft email to ${CONTACT.email} has been opened in your email app. It is not sent until you send it.`,
    );
  };

  return (
    <section
      className={`${styles.section}${standalone ? ` ${styles.sectionTop}` : ""}`}
      id="contact-us"
    >
      <div className="container">
        {/* THE PAGE'S <h1> WHEN THIS SECTION IS THE PAGE.
            /contact had no h1 at all — this wordmark was an <h2> and the
            "Come and visit us." aside below it was another, so the document
            opened at level two and never had a level one. The heading was
            always HERE; it was only labelled wrong.

            IT STAYS AN <h2> WHEN NOT STANDALONE. Today `standalone` is
            always true — ContactPage is the only caller — but the flag
            already means "this section is the top of the page", which is
            exactly the condition that decides the level. Hard-coding h1
            would make dropping this section back onto a longer page a
            silent two-h1 bug rather than a prop nobody passed.

            THE ACCESSIBLE NAME COMES FROM THE SVG, which carries
            role="img" and aria-label="Contact Us" — a heading whose only
            content is a labelled image takes that label as its text, so
            the outline reads "Contact Us" rather than empty. */}
        <Reveal className={styles.wordmark} as={standalone ? "h1" : "h2"}>
          {/* Full-width wordmark. lengthAdjust is "spacing", NOT
              "spacingAndGlyphs" — the latter stretches the letterforms
              themselves, which visibly widened Contralto's strokes. font-size
              17 sets "CONTACT US" close to the 100-unit box on its own, so
              only the letterfit is adjusted (matches the footer wordmark). */}
          <svg
            className={styles.wordSvg}
            viewBox="0 0 100 16"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Contact Us"
          >
            <text
              className={styles.wordText}
              x="0"
              y="13.4"
              fontSize="17"
              textLength="100"
              lengthAdjust="spacing"
            >
              CONTACT US
            </text>
          </svg>
        </Reveal>

        <div className={styles.grid}>
          <div className={`${styles.info} measure`}>
            <Reveal>
              <div className={styles.label}>Enquiries</div>
              {/* the phone line only appears once there is a real number to
                  dial — see lib/contact.ts. Email carries enquiries alone
                  until then. */}
              {CONTACT.phone ? (
                <p>
                  <a
                    className={styles.infoLink}
                    href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
                  >
                    {CONTACT.phone}
                  </a>
                </p>
              ) : null}
              <p>
                <a className={styles.infoLink} href={`mailto:${CONTACT.email}`}>
                  {CONTACT.email}
                </a>
              </p>
            </Reveal>
            {/* THE LABEL IS LOAD-BEARING — do not let it drift back to
                "Opening Times". On a restaurant group's contact page that
                wording reads as when the RESTAURANTS are open, and these are
                not those: lib/contact.ts:13 marks the value a placeholder for
                head-office hours, and the field is called `officeHours`. An
                unqualified "09:00 – 17:00" under the wrong label is the kind
                of wrong that sends someone to a locked door on a Saturday.
                A second line spelling the same distinction out in prose used
                to sit under the times. It has been removed: "OFFICE HOURS"
                already carries it, and the sentence was the label restated at
                greater length. If the label ever changes, the sentence has to
                come back with it. */}
            <Reveal delay={0.08} className={styles.infoTail}>
              <div className={styles.label}>Office Hours</div>
              <p>{CONTACT.officeHours.days}</p>
              <p>{CONTACT.officeHours.time}</p>
            </Reveal>
          </div>

          {/* the form takes the second and third tracks of the shared
              dark-zone rail — see .formCell */}
          <Reveal delay={0.1} className={styles.formCell}>
            <form
              ref={formRef}
              className={styles.form}
              onSubmit={handleSubmit}
              /* noValidate TURNS OFF THE BROWSER'S OWN BUBBLES so this
                 form can show its own. The native messages cannot be
                 styled, are worded by the vendor, appear one at a time,
                 vanish on the next click and are not exposed to a screen
                 reader as page content — on a maroon dark zone they also
                 render as a white OS tooltip that belongs to no design
                 system at all. The validation itself did not go away; it
                 moved into validate() below, which is what fills the
                 messages under each field. */
              noValidate
            >
              <div className={styles.field}>
                <span className={styles.fieldLabel} id="contact-name-label">
                  Name
                </span>
                {/* THE PAIR IS A GROUP, and the group is what the error
                    belongs to — "Please tell us your name" is about the
                    pair, not about the first box. role="group" plus the
                    label above gives the two inputs a shared accessible
                    name, which is the markup a fieldset would give without
                    the fieldset's unstyleable box. */}
                <div
                  className={styles.row}
                  role="group"
                  aria-labelledby="contact-name-label"
                >
                  <label className="sr-only" htmlFor="contact-first">
                    First name
                  </label>
                  <input
                    id="contact-first"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    placeholder="First name"
                    value={values.firstName}
                    onChange={onChange("firstName")}
                    aria-invalid={errors.firstName ? true : undefined}
                    aria-describedby={
                      errors.firstName ? "contact-first-error" : undefined
                    }
                  />
                  <label className="sr-only" htmlFor="contact-last">
                    Last name
                  </label>
                  <input
                    id="contact-last"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Last name"
                    value={values.lastName}
                    onChange={onChange("lastName")}
                  />
                </div>
                {/* THE MESSAGE IS NOT role="alert".
                    All of them would fire at once on a failed submit and a
                    screen reader would read three interruptions over each
                    other. Instead each message is wired to its field with
                    aria-describedby and submit moves FOCUS to the first
                    invalid input — so the field announces itself, its
                    label and its error in one natural utterance, and the
                    reader can tab through the rest at their own pace. The
                    count in the status region below carries the summary. */}
                {errors.firstName && (
                  <p className={styles.error} id="contact-first-error">
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="contact-email">
                  Email
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={values.email}
                  onChange={onChange("email")}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={
                    errors.email ? "contact-email-error" : undefined
                  }
                />
                {errors.email && (
                  <p className={styles.error} id="contact-email-error">
                    {errors.email}
                  </p>
                )}
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="contact-message">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={4}
                  placeholder="Tell us a little about your enquiry"
                  value={values.message}
                  onChange={onChange("message")}
                  aria-invalid={errors.message ? true : undefined}
                  aria-describedby={
                    errors.message ? "contact-message-error" : undefined
                  }
                />
                {errors.message && (
                  <p className={styles.error} id="contact-message-error">
                    {errors.message}
                  </p>
                )}
              </div>
              <div className={styles.submitRow}>
                {/* THE HOUSE ACTION, at the user's instruction — the same
                    control the journal head carries as "Read More", and
                    the same one About and the closing frame carry (see
                    components/PillCta.tsx).

                    WHAT IT REPLACES: this form's own `.submitPill`, whose
                    stylesheet described it as "the ReadyCta 'Join Us' pill
                    recipe, copied in verbatim because CSS modules don't
                    share classes". That copy is exactly the duplication
                    PillCta exists to end — it had drifted into a different
                    object from the site's other buttons (a hollow capsule
                    in the DISPLAY face that filled on hover, against this
                    control's filled pill and closing disc in the mono
                    face). It is one object now, so a reader who has learned
                    what the pill does in the journal head knows this one
                    before reading it.

                    tone="cream" IS THE CREAM BACKGROUND ASKED FOR, and it
                    is a variant the control already had rather than a local
                    override: --cta-fill: var(--cream) over --cta-ink:
                    var(--maroon). It is the right arm on this ground for
                    the same reason the hero uses it — the default fill is
                    maroon, which on this section's maroon would leave the
                    pill invisible and only its label showing. Cream also
                    keeps the old design's intent, which the stylesheet put
                    as "the section's single light moment".

                    type="submit" rather than an href: this posts the form.
                    See the note on Props in PillCta.tsx for why that is a
                    separate arm of the union rather than an `as` prop. */}
                <PillCta type="submit" tone="cream">
                  Submit
                </PillCta>
              </div>

              {/* ── THE ONE LIVE REGION ──
                  role="status" (polite), not role="alert" (assertive): it
                  never interrupts, it waits for a pause. It is in the DOM
                  at all times and only its TEXT changes, which is what
                  makes it announce — a live region inserted at the same
                  moment as its content is frequently missed, because the
                  screen reader has nothing to diff against.
                  It carries both outcomes rather than one each, so the two
                  can never be announced together. */}
              <p className={styles.status} role="status" aria-live="polite">
                {status}
              </p>

              {sent && (
                <div className={styles.sentCard}>
                  <strong>Your email app should now be open.</strong>
                  <span>
                    We have filled in a draft to {CONTACT.email} for you.{" "}
                    <em>Nothing reaches us until you press send.</em> If
                    nothing opened, your browser may not have an email app
                    set up — write to us directly at{" "}
                    <a
                      className={styles.sentLink}
                      href={`mailto:${CONTACT.email}`}
                    >
                      {CONTACT.email}
                    </a>
                    .
                  </span>
                </div>
              )}
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
