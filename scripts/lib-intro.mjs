/* Shared driving code for the Discover intro probes.

   The whole sequence runs on its own clock from the moment the title lands
   in the middle of the screen, with the page held until the grid is
   standing. So a probe's job is just to walk the chapter into the trigger
   band; everything after that plays by itself. */

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** wait out the loader — the site opens behind one, and a flat sleep
    shoots the loader instead of the page */
export async function ready(page, port) {
  await page.goto(`http://localhost:${port}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#restaurants [data-plate]", { timeout: 60000 });
  await page.waitForFunction(
    () => !document.body.classList.contains("is-loading"),
    { timeout: 60000 },
  );
  await sleep(1000);
}

/** walk the chapter up the screen until the title lands in the trigger band.
    Driven through Lenis — a raw window.scrollTo is pulled straight back to
    Lenis's own target on the next frame. */
export async function arm(page, steps = 60) {
  await page.evaluate(() => {
    const el = document.querySelector("#restaurants");
    window.__lenis?.scrollTo(
      window.scrollY + el.getBoundingClientRect().top - innerHeight * 0.15,
      { immediate: true },
    );
  });
  await sleep(700);
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() =>
      window.__lenis?.scrollTo(window.scrollY + 40, { immediate: true }),
    );
    await sleep(60);
    if (await page.evaluate(() => !!document.querySelector("[data-assembly-armed='1']"))) {
      return true;
    }
  }
  return false;
}

/** wait for the timed choreography to actually leave IDLE, so a probe never
    measures the frame before the clock started */
export async function started(page, max = 40) {
  for (let i = 0; i < max; i++) {
    const step = await page.evaluate(() =>
      Number(
        document.querySelector("#restaurants")?.getAttribute("data-assembly-step") ?? -1,
      ),
    );
    if (step >= 1) return true;
    await sleep(50);
  }
  return false;
}

/** arm the sequence and confirm it is running — what most probes want */
export async function play(page) {
  const armed = await arm(page);
  if (!armed) return { armed: false, scrubbed: false };
  return { armed, scrubbed: await started(page) };
}
