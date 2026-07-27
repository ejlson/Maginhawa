"use client";

import { useEffect, useState } from "react";
import Nav from "./Nav";
import Menu from "./Menu";
import Contact from "./Contact";
import FAQ from "./FAQ";
import ReviewUs from "./ReviewUs";
import Footer from "./Footer";
import DarkZone from "./DarkZone";

// The dedicated /contact route — same set of dark-zone blocks the home page
// closes with (Contact form, FAQ accordion, Google review CTA, Footer).
// Keeping this thin so the home page and /contact stay in lockstep without
// any duplicated content.
export default function ContactPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  // release any dark backdrop / loader state another route may have set
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

  return (
    <>
      <Nav
        started
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((o) => !o)}
      />
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main>
        <DarkZone>
          <Contact standalone />
          <FAQ />
          <ReviewUs />
          <Footer />
        </DarkZone>
      </main>
    </>
  );
}
