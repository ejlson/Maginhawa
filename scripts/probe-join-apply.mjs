/* THE APPLICATION SECTION'S CLAIMS, MEASURED.

   The section was a tinted plate with a rail beside the form and is now a
   narrow centred column under a full-measure rule. Four of the five claims
   in that sentence are geometric and one is an accessibility claim, and all
   five are things a later edit can quietly undo:

   1. THE NARROWING IS REAL AND IT IS THE STANDOUT. The whole argument for
      this structure is that the page stops changing colour and changes
      SHAPE. If the column is not markedly narrower than the measure above
      it, there is no event — so this reports the ratio rather than trusting
      a max-width that a media query may have overridden.
   2. THE RULE IS THE FULL MEASURE. It has to be as wide as the thing it
      closes, or it is a lid on a box and the box is the plate again.
   3. THE FIELDS ARE PAIRED, AND THE PAIRING COLLAPSES ON A PHONE. Two
      columns is what the rail used to force and it was wrong for that
      reason; two columns is now a decision, because the pairs are the
      SEMANTIC pairs (first|last, email|phone, position|CV) and only the
      message runs full width. At 390 a half is 171px, so the grid must be
      one column there — a paired row that survives to the phone is the
      failure, not the pairing itself.
   4. NOTHING IS BESIDE THE FORM. The reasons moved above the rule. If any
      of them ever share a horizontal band with a field, they are arguing
      with it again.
   5. NO PLACEHOLDERS, AND THE HINTS SURVIVE FOCUS. The point of replacing
      placeholder text with hint elements is that the guidance is still
      there while the field is being typed into — so the hints are measured
      WITH THE FIELD FOCUSED, which is the state a placeholder fails in. It
      also checks every field still has a real <label> and that each hint is
      actually wired to its input by aria-describedby, because a hint that
      is only visual is a hint half the audience does not get.

   usage: node scripts/probe-join-apply.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3187";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => {
  if (!c) fails++;
  console.log(`    ${c ? "PASS" : "FAIL"}  ${m}`);
};

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

for (const [VW, VH] of [
  [1440, 900],
  [1920, 1080],
  [820, 1180],
  [390, 844],
]) {
  const page = await b.newPage();
  await page.setViewport({ width: VW, height: VH });
  await page.goto(`http://localhost:${PORT}/careers`, { waitUntil: "networkidle0", timeout: 60000 });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(1500);

  /* SCROLL LIKE A READER. Everything below is inside a `Reveal`, whose
     hidden state is opacity 0 — and `fullPage` capture and `scrollTo`
     teleports both leave IntersectionObserver unfired, so a measurement
     taken without walking down the page measures a section that has not
     arrived. Walk to the form, then let the reveals finish. */
  await page.evaluate(() => {
    document.querySelector("#apply")?.scrollIntoView({ block: "start" });
  });
  await sleep(1400);

  const r = await page.evaluate(() => {
    const g = (s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, w: b.width, h: b.height };
    };
    const shell = g('[class*="formShell"]');
    const rule = g('[class*="threshold"]');
    const reasons = g('[class*="JoinUs_reasons"]');
    const inner = document.querySelector('[class*="formInner"]');
    const innerCS = getComputedStyle(inner);

    // every horizontal band the form's fields occupy, against every band the
    // reasons occupy — an overlap means something is beside the form again
    const fieldBands = [...document.querySelectorAll('[class*="JoinUs_field"]')].map((el) => {
      const b = el.getBoundingClientRect();
      return [b.top, b.bottom, b.left, b.right];
    });
    const reasonBands = [...document.querySelectorAll('[class*="JoinUs_reason__"]')].map((el) => {
      const b = el.getBoundingClientRect();
      return [b.top, b.bottom, b.left, b.right];
    });
    let sideBySide = 0;
    for (const [ft, fb, fl, fr] of fieldBands)
      for (const [rt, rb, rl, rr] of reasonBands)
        if (ft < rb && rt < fb && fl < rr && rl < fr) sideBySide++;

    // the plate's two tells: a tinted background and a radius on the section
    const plateish = [...document.querySelectorAll('[class*="JoinUs_form"]')]
      .map((el) => {
        const cs = getComputedStyle(el);
        return { cls: el.className, bg: cs.backgroundColor, r: cs.borderRadius };
      })
      .filter((x) => x.bg !== "rgba(0, 0, 0, 0)" && x.bg !== "transparent");

    // FIELD BY FIELD: label, placeholder, hint, and the wiring between them
    const controls = [...document.querySelectorAll("#apply input, #apply select, #apply textarea")]
      .filter((el) => el.type !== "file" || el.id === "apply-cv")
      .map((el) => {
        const lab = document.querySelector(`label[for="${el.id}"]`);
        const d = el.getAttribute("aria-describedby");
        const hint = d ? document.getElementById(d) : null;
        return {
          id: el.id,
          tag: el.tagName.toLowerCase(),
          /* A VISIBLE <label> OR AN aria-label. The dial-code select is the
             one control here that legitimately has no visible label of its
             own: the field's visible label ("Phone (optional)") names the
             NUMBER, which is the thing being typed, and the code carries its
             own accessible name instead. What must never be true is a
             control with neither. */
          label: lab ? lab.textContent.trim() : null,
          ariaLabel: el.getAttribute("aria-label"),
          placeholder: el.getAttribute("placeholder"),
          describedby: d,
          hintText: hint ? hint.textContent.trim() : null,
        };
      });

    /* THE PHONE PAIR IS ONE FIELD, and the thing that makes it one is that
       the rule under it belongs to the ROW: two underlines is two fields
       that happen to be adjacent. Checked as geometry — one bottom border on
       the row, none on either control — rather than by reading class names,
       because the failure mode is a specificity accident (`.field select`
       out-ranking a bare class), which is exactly how the CV field's label
       styling went wrong. */
    const cc = document.getElementById("apply-phone-cc");
    const num = document.getElementById("apply-phone");
    const row = cc?.parentElement;
    const bw = (el) => (el ? parseFloat(getComputedStyle(el).borderBottomWidth) : -1);
    const phone = {
      sameRow: !!row && row === num?.parentElement,
      rowBorder: bw(row),
      ccBorder: bw(cc),
      numBorder: bw(num),
      // one baseline, and the number gets the room
      ccW: cc ? Math.round(cc.getBoundingClientRect().width) : 0,
      numW: num ? Math.round(num.getBoundingClientRect().width) : 0,
      options: cc ? cc.options.length : 0,
    };

    // the top of the DarkZone footer, so the form's tail can be checked for
    // room rather than assumed to have some
    const dark = document.querySelector('[class*="DarkZone"], footer');
    /* THE MEASURE IS THE CONTAINER'S CONTENT BOX, NOT ITS BORDER BOX.
       `.container` carries `padding-inline: var(--grid-margin)`, so its
       getBoundingClientRect is 2 x grid-margin wider than the column the page
       actually sets type in. Comparing the rule against the border box
       reported a 46px shortfall at every viewport — a failure invented by the
       probe, on an element that was exactly right. */
    const cEl = document.querySelector(".container");
    const cCS = getComputedStyle(cEl);
    const measure =
      cEl.getBoundingClientRect().width -
      parseFloat(cCS.paddingLeft) -
      parseFloat(cCS.paddingRight);

    return {
      vw: innerWidth,
      container: measure,
      shell,
      rule,
      reasons,
      reasonsCols: getComputedStyle(document.querySelector('[class*="JoinUs_reasons"]'))
        .gridTemplateColumns.split(" ").length,
      formCols: innerCS.gridTemplateColumns.split(" ").length,
      sideBySide,
      plateish,
      controls,
      phone,
      submitLabel: document.querySelector('[class*="submitCtaLabel"]')?.textContent.trim() ?? null,
      submitAside: document.querySelector('[class*="submitAside"]')?.textContent.trim() ?? null,
      submitBottom: g('[class*="submitCta"]')?.bottom ?? null,
      darkTop: dark ? dark.getBoundingClientRect().top : null,
    };
  });

  console.log(`\n=== ${VW}x${VH} ===`);
  console.log(
    `  measure ${r.container?.toFixed(0)}px   rule ${r.rule?.w.toFixed(0)}px   column ${r.shell?.w.toFixed(0)}px  (${((r.shell.w / r.container) * 100).toFixed(0)}% of measure)`,
  );
  console.log(
    `  reasons ${r.reasonsCols}-up over ${r.reasons?.w.toFixed(0)}px, ending ${(r.rule.top - r.reasons.bottom).toFixed(0)}px above the rule   form ${r.formCols} column(s)`,
  );

  ok(
    VW <= 600 ? r.formCols === 1 : r.formCols === 2,
    `the field grid is ${VW <= 600 ? "one column on a phone" : "paired halves"} (${r.formCols})`,
  );
  ok(
    Math.abs(r.rule.w - r.container) < 2,
    `the rule spans the full measure (${r.rule.w.toFixed(0)} vs ${r.container.toFixed(0)})`,
  );
  /* THE NARROWING IS ONLY A CLAIM WHERE THERE IS WIDTH TO NARROW FROM. At
     1440 and 1920 the column is 56% and 41% of the measure and the change of
     shape is the section's whole announcement. At 820 the measure is 774px
     and at 390 it is 358 — there is no room to narrow into, and what marks
     the section there is the threshold rule and the centred head. Asserting
     a ratio at those widths would be asserting something the page cannot do
     and should not try to. */
  ok(
    r.container < 1000 || r.shell.w < r.container * 0.62,
    `the column is a real narrowing (${((r.shell.w / r.container) * 100).toFixed(0)}% of the measure)`,
  );
  ok(
    Math.abs((r.shell.left - 0) - (r.container + (r.container - r.shell.right) - r.shell.right)) < 2 ||
      Math.abs(r.shell.left + r.shell.right - r.vw) < 3,
    `the column is centred in the viewport (${r.shell.left.toFixed(0)} left, ${(r.vw - r.shell.right).toFixed(0)} right)`,
  );
  ok(r.sideBySide === 0, `nothing sits beside a form field (${r.sideBySide} overlaps)`);
  ok(
    r.plateish.length === 0,
    `the section carries no tinted plate (${r.plateish.map((p) => p.bg).join(", ") || "none"})`,
  );

  console.log(
    `  phone: code ${r.phone.ccW}px + number ${r.phone.numW}px, ${r.phone.options} dial codes   borders row ${r.phone.rowBorder} / code ${r.phone.ccBorder} / number ${r.phone.numBorder}`,
  );
  ok(r.phone.sameRow, "the dial code and the number share one row element");
  ok(
    r.phone.rowBorder >= 1 && r.phone.ccBorder === 0 && r.phone.numBorder === 0,
    "…and one underline between them, so they read as one field",
  );
  ok(r.phone.numW > r.phone.ccW, "the number gets more room than the code");

  console.log(
    `  submit: "${r.submitLabel}"   beside it: "${r.submitAside}"`,
  );
  /* THE MAILTO WARNING. This form has no endpoint — it opens the reader's
     mail client and the CV is NOT attached. The paragraph that used to say
     so was removed on request; these two strings are where the two facts
     went, and a later edit that quietly drops them puts the trap back. */
  ok(
    /email/i.test(r.submitLabel ?? ""),
    `the button says what it actually does ("${r.submitLabel}")`,
  );
  ok(
    /attach/i.test(r.submitAside ?? "") && /cv/i.test(r.submitAside ?? ""),
    `the CV warning sits at the control ("${r.submitAside}")`,
  );

  console.log("  fields:");
  for (const c of r.controls) {
    console.log(
      `    ${c.id.padEnd(15)} ${c.tag.padEnd(8)} ${c.label ? `label "${c.label}"` : c.ariaLabel ? `aria-label "${c.ariaLabel}"` : "NO NAME"}${c.hintText ? `  hint→"${c.hintText}"` : ""}${c.placeholder ? `  PLACEHOLDER "${c.placeholder}"` : ""}`,
    );
    ok(
      !!c.label || !!c.ariaLabel,
      `${c.id} has an accessible name (${c.label ? "visible <label>" : c.ariaLabel ? `aria-label "${c.ariaLabel}"` : "NONE"})`,
    );
    ok(!c.placeholder, `${c.id} carries no placeholder`);
    if (c.describedby) ok(!!c.hintText, `${c.id}'s aria-describedby resolves to real text`);
  }

  /* THE HINTS SURVIVE FOCUS — the one thing a placeholder cannot do. Focus
     each hinted control and re-read its hint's rendered box and opacity. */
  const hinted = r.controls.filter((c) => c.describedby);
  for (const c of hinted) {
    const still = await page.evaluate((id) => {
      const el = document.getElementById(id);
      el.focus();
      const hint = document.getElementById(el.getAttribute("aria-describedby"));
      const b = hint.getBoundingClientRect();
      return { vis: b.width > 0 && b.height > 0, op: +getComputedStyle(hint).opacity, text: hint.textContent.trim() };
    }, c.id);
    ok(
      still.vis && still.op > 0.9,
      `"${still.text}" is still on screen with ${c.id} focused`,
    );
  }

  await page.close();
}

console.log(
  `\n  ${fails === 0 ? "THE COLUMN HOLDS AND THE GUIDANCE SURVIVES FOCUS" : `${fails} FAILURE(S)`}\n`,
);
const shutdown = async () => {
  const proc = b.process();
  await Promise.race([b.close().catch(() => {}), sleep(3000)]);
  try {
    proc?.kill("SIGKILL");
  } catch {}
  process.exit(fails === 0 ? 0 : 1);
};
await shutdown();
