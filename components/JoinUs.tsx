"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Nav from "./Nav";
import Menu from "./Menu";
import Footer from "./Footer";
import DarkZone from "./DarkZone";
import Reveal from "./Reveal";
import RevealText from "./RevealText";
import MagneticButton from "./MagneticButton";
import styles from "./JoinUs.module.css";
import { JOBS } from "@/lib/jobs";

const PILLARS = [
  {
    mark: "01",
    title: "A family kitchen.",
    body: "Belly, Bintang, Mamasons, Ramo, Guanabana, Café Mama & Sons, Hoodwood — seven kitchens that train together, eat together, and lean on each other when service gets tight.",
  },
  {
    mark: "02",
    title: "Real growth.",
    body: "Chefs at Maginhawa rotate through stations, then through restaurants. Several of our heads of kitchen started as commis here. The path is intentional, and the door is open.",
  },
  {
    mark: "03",
    title: "Hospitality, fairly.",
    body: "Pooled service charge, paid trial shifts, real breaks. London restaurant pay isn't perfect, but we try to make this a place worth staying in.",
  },
];

function Chevron() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6l5 5 5-5" />
    </svg>
  );
}

export default function JoinUs() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [position, setPosition] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  // name of the CV the applicant picked — referenced in the email body
  const [cvName, setCvName] = useState<string>("");
  const formRef = useRef<HTMLDivElement>(null);

  // release any dark backdrop another route may have set
  useEffect(() => {
    const html = document.documentElement;
    const prevHtml = html.style.backgroundColor;
    const prevBody = document.body.style.backgroundColor;
    html.style.backgroundColor = "";
    document.body.style.backgroundColor = "";
    document.body.classList.remove("is-loading");
    return () => {
      html.style.backgroundColor = prevHtml;
      document.body.style.backgroundColor = prevBody;
    };
  }, []);

  // click "Apply" on a role → pre-fill the position field + scroll to form
  const applyFor = (jobTitle: string, restaurant: string) => {
    const label = `${jobTitle} — ${restaurant}`;
    setPosition(label);
    setSubmitted(false);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = (data.get("name") || "").toString().trim();
    const email = (data.get("email") || "").toString().trim();
    const phone = (data.get("phone") || "").toString().trim();
    const pos = (data.get("position") || position || "General application").toString().trim();
    const msg = (data.get("message") || "").toString().trim();

    const subject = `Application — ${pos} — ${name}`;
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : "",
      `Position: ${pos}`,
      // mailto drafts can't carry attachments, so the selected CV is
      // named in the body and the user attaches it before sending
      cvName ? `CV: ${cvName} (attached)` : "",
      "",
      "Message:",
      msg,
    ]
      .filter(Boolean)
      .join("\n");

    const mailto = `mailto:hr@mgnhw.com?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    // open user's email client with a pre-filled message
    window.location.href = mailto;
    setSubmitted(true);
  };

  return (
    <>
      <Nav
        started
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((o) => !o)}
      />
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className={styles.page} data-nav-theme="light">

        {/* ---- careers hero — one horizontal video plate spanning the
             full content width. The big display title sits inside the
             frame (the About hero's type), the old statement rides the
             bottom-right corner as a small italic-serif line. ---- */}
        <section className={styles.section} data-nav-theme="light">
          <Reveal className={styles.heroFrame}>
            <video
              className={styles.heroFrameVideo}
              src="/videos/belly-hero.mov"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden
            />
            <div className={styles.heroFrameScrim} aria-hidden />

            <h1 className={styles.heroFrameTitle}>Careers</h1>

            <p className={styles.heroFrameTagline}>
              Cook with us. Sit with us. Build something with us.
            </p>
          </Reveal>
        </section>

        <div className="container">
          {/* ---- Open roles ---- */}
          <section className={styles.roles} id="open-roles">
            <div className={styles.rolesHead}>
              <div>
                <Reveal as="span" className={styles.eyebrow}>
                  Open Roles
                </Reveal>
                <Reveal>
                  <h2 className={styles.sectionTitle}>
                    {JOBS.length} positions across the group.
                  </h2>
                </Reveal>
              </div>
              <Reveal delay={0.1}>
                <p className={styles.rolesAside} aria-hidden>
                  (Click any role to read the details)
                </p>
              </Reveal>
            </div>

            <ul className={styles.roleList}>
              {JOBS.map((job, i) => {
                const isOpen = openIdx === i;
                return (
                  <Reveal key={job.id} as="li" delay={(i % 4) * 0.05}>
                    <div className={styles.roleItem}>
                      <button
                        type="button"
                        className={styles.roleRow}
                        onClick={() => setOpenIdx(isOpen ? null : i)}
                        aria-expanded={isOpen}
                        aria-controls={`role-detail-${i}`}
                      >
                        <span className={styles.roleTitle}>{job.title}</span>
                        <span className={styles.roleMeta}>
                          {job.restaurantName} · {job.location}
                        </span>
                        <span className={styles.roleType}>
                          {job.type} · {job.area}
                        </span>
                        <span
                          className={`${styles.roleChev} ${isOpen ? styles.roleChevOpen : ""}`}
                          aria-hidden
                        >
                          <Chevron />
                        </span>
                      </button>

                      <motion.div
                        id={`role-detail-${i}`}
                        initial={false}
                        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                        style={{ overflow: "hidden" }}
                      >
                        <div className={styles.roleDetail}>
                          <p className={styles.roleDetailLead}>{job.summary}</p>
                          <div>
                            <p className={styles.roleDetailHead}>You&apos;ll</p>
                            <ul className={styles.roleDetailList}>
                              {job.responsibilities.map((r) => (
                                <li key={r} className={styles.roleDetailItem}>
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className={styles.roleDetailHead}>We hope</p>
                            <ul className={styles.roleDetailList}>
                              {job.requirements.map((r) => (
                                <li key={r} className={styles.roleDetailItem}>
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className={styles.roleApply}>
                            <button
                              type="button"
                              className={styles.roleApplyBtn}
                              onClick={() => applyFor(job.title, job.restaurantName)}
                            >
                              Apply for this role <span aria-hidden>↓</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </Reveal>
                );
              })}
            </ul>
          </section>

          {/* ---- Application form ---- */}
          <section className={styles.form} ref={formRef} id="apply">
            <div className={styles.formHead}>
              <div>
                <Reveal as="span" className={styles.eyebrow}>
                  Apply
                </Reveal>
                <Reveal>
                  <h2 className={styles.sectionTitle}>
                    Send us your application.
                  </h2>
                </Reveal>
              </div>
              <Reveal delay={0.1}>
                <p className={styles.formAside}>
                  Pick a role from the dropdown — or apply generally if you
                  don&apos;t see your fit.
                </p>
              </Reveal>
            </div>

            <Reveal>
              <form className={styles.formInner} onSubmit={onSubmit}>
                <div className={styles.field}>
                  <label htmlFor="apply-name">Full name</label>
                  <input
                    id="apply-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Jane Maginhawa"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="apply-email">Email</label>
                  <input
                    id="apply-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="jane@example.com"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="apply-phone">Phone (optional)</label>
                  <input
                    id="apply-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="07000 000 000"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="apply-position">Position</label>
                  <select
                    id="apply-position"
                    name="position"
                    required
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                  >
                    <option value="" disabled>
                      Select a role…
                    </option>
                    {JOBS.map((j) => {
                      const label = `${j.title} — ${j.restaurantName}`;
                      return (
                        <option key={j.id} value={label}>
                          {label}
                        </option>
                      );
                    })}
                    <option value="General application">
                      General application
                    </option>
                  </select>
                </div>

                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label htmlFor="apply-cv">Upload your CV (PDF or Word)</label>
                  <input
                    id="apply-cv"
                    name="cv"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className={styles.fileInput}
                    onChange={(e) =>
                      setCvName(e.currentTarget.files?.[0]?.name ?? "")
                    }
                  />
                  {/* styled proxy for the hidden native input — both
                      labels point at #apply-cv, so either opens the picker */}
                  <label htmlFor="apply-cv" className={styles.fileTrigger}>
                    <span
                      className={cvName ? styles.fileName : styles.filePlaceholder}
                    >
                      {cvName || "Choose a file…"}
                    </span>
                    <span className={styles.fileBrowse}>Browse</span>
                  </label>
                </div>

                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label htmlFor="apply-message">Why you&apos;d be a good fit</label>
                  <textarea
                    id="apply-message"
                    name="message"
                    required
                    placeholder="A few lines about your experience and why this role."
                  />
                </div>

                <p className={styles.note}>
                  Submitting opens your email client with the application
                  pre-filled — attach the CV you selected before sending.
                  We&apos;ll come back to you within five working days.
                </p>

                <div className={styles.submitRow}>
                  <MagneticButton
                    label="Send application"
                    type="submit"
                    theme="light"
                  />
                </div>

                <AnimatePresence>
                  {submitted && (
                    <motion.div
                      className={styles.successCard}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <strong>Your email is being prepared.</strong>
                      Remember to attach your CV to the draft. If one
                      didn&apos;t open, send your application to hr@mgnhw.com
                      manually — we&apos;ll get it either way.
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </Reveal>
          </section>
        </div>

        <DarkZone>
          <Footer />
        </DarkZone>
      </main>
    </>
  );
}
