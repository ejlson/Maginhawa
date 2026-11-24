/* ═══ PULL THE JOURNAL AND THE JOB BOARD FROM THE CMS, BEFORE `next build` ═══
 *
 * `npm run build` runs this first. It asks the Maginhawa Group's shared
 * Sanity project (edited in the group's Studio, github.com/ejlson/maginhawa-cms)
 * for every post not ticked "Hide from the Maginhawa Group website",
 * downloads each post's photograph, and writes a snapshot that lib/posts.ts
 * reads. Same arrangement as BUNSO's scripts/pull-press.mjs.
 *
 * ── WHY A SNAPSHOT AND NOT A FETCH IN THE PAGE ──
 * The site is `output: "export"`: there is no server, so the content has to
 * exist at build time anyway. Saving it here also means visitors are served
 * every word and every picture from this site's own hosting and never touch
 * Sanity — traffic here cannot use up the CMS's free allowance, and nothing
 * in the built pages names the project. The only Sanity traffic is this
 * script: one query and a couple of image downloads per post, per build.
 *
 * ── WHY THE PHOTOGRAPHS ARE NOT ON CLOUDINARY ──
 * The Cloudinary account is free and shared with Café Mama (CLOUDINARY.md).
 * These are saved at two fixed widths into public/cms/ and served by
 * Cloudflare, free and unmetered. lib/cloudinaryLoader.ts and lib/media.ts
 * both leave `/cms/` paths local for that reason.
 *
 * ── OUR OWN POSTS ARRIVE AS MARKDOWN ──
 * A post of kind "ours" is Portable Text in the CMS. It is turned into
 * markdown here so that lib/markdown.ts renders it exactly as it renders
 * content/posts/*.md: one pipeline, one set of house rules.
 *
 * ── THE JOB BOARD ──
 * The open roles on /careers are one "Job board" document in the Studio.
 * Its open roles are written to .cms/jobs.json, which lib/jobsSource.ts
 * reads. A role with a missing or unknown field stops the build, naming the
 * role, rather than putting a broken card or bad job data on the page.
 * MAGINHAWA_BLOG_SOURCE=local skips the journal only: the roles have no
 * other home than the CMS.
 *
 * ── WHAT IT REFUSES ──
 * It only downloads from Sanity's own image host for this project, only
 * files Sanity reports as WebP/JPEG, only up to MAX_BYTES, never follows a
 * redirect, and names every file after Sanity's content hash — so nothing a
 * person types in the Studio can choose a URL to fetch or a path to write.
 *
 *   node scripts/pull-cms.mjs          fails loudly (the build)
 *   node scripts/pull-cms.mjs --dev    keeps the last snapshot if offline
 *   MAGINHAWA_BLOG_SOURCE=local        skips the journal (lib/blog.ts is used
 *                                      instead); the job board is still pulled
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import cms from "../lib/cms.json" with { type: "json" };

const JOURNAL = process.env.MAGINHAWA_BLOG_SOURCE !== "local";
const DEV = process.argv.includes("--dev");
const ROOT = path.resolve(import.meta.dirname, "..");
const IMAGE_DIR = path.join(ROOT, cms.imageDir);
/* Photographs are written here and swapped in only once every one has
   arrived, so a pull that fails halfway leaves the last good set alone. */
const WORK_DIR = `${IMAGE_DIR}.partial`;
const SNAPSHOT = path.join(ROOT, cms.snapshot);
const JOBS_SNAPSHOT = path.join(ROOT, cms.jobsSnapshot);
const CDN = `https://cdn.sanity.io/images/${cms.project}/${cms.dataset}/`;
const MAX_BYTES = 15 * 1024 * 1024;
const TYPES = { "image/webp": "webp", "image/jpeg": "jpg" };
/* The two widths every photograph is saved at. lib/cloudinaryLoader.ts
   picks between them by name, so they are a contract: change one, change
   both. */
const WIDE = 1600;
const NARROW = 800;

async function query(groq) {
  const url = new URL(
    `https://${cms.project}.api.sanity.io/v${cms.apiVersion}/data/query/${cms.dataset}`,
  );
  url.searchParams.set("query", groq);
  url.searchParams.set("perspective", "published");
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Sanity query failed (${res.status}): ${await res.text()}`);
  return (await res.json()).result;
}

/* "image-374db48…-1600x1067-jpg" -> "374db48…". Anything else is refused. */
function hashOf(asset) {
  const m = /^image-([a-f0-9]{20,64})-\d+x\d+-[a-z]+$/.exec(asset?._id ?? "");
  if (!m) throw new Error(`pull-cms: unexpected image id ${JSON.stringify(asset?._id)}`);
  if (!asset.url?.startsWith(CDN)) throw new Error(`pull-cms: image not on ${CDN}: ${asset.url}`);
  return m[1];
}

async function download(asset, width, name) {
  const params = new URLSearchParams({ w: String(width), fm: "webp", q: "80" });
  const url = `${asset.url}?${params}`;
  /* `redirect: "error"` because hashOf checks the INITIAL url against CDN and
     nothing checks where a redirect would land. */
  const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`pull-cms: ${res.status} for ${url}`);
  const ext = TYPES[(res.headers.get("content-type") ?? "").split(";")[0]];
  if (!ext) throw new Error(`pull-cms: ${url} is ${res.headers.get("content-type")}, not WebP/JPEG`);
  const body = Buffer.from(await res.arrayBuffer());
  if (body.length > MAX_BYTES) throw new Error(`pull-cms: ${url} is ${body.length} bytes`);
  const file = `${name}.${ext}`;
  await fs.writeFile(path.join(WORK_DIR, file), body);
  return `${cms.imagePath}/${file}`;
}

/* Both widths, always, even when the original is narrower than NARROW: the
   loader picks a file by name and must never pick one that is not there.
   Never wider than the original — Sanity would upscale. */
const images = new Map();
async function localImage(asset) {
  if (!asset) return null;
  if (!images.has(asset._id)) {
    const hash = hashOf(asset);
    await download(asset, Math.min(NARROW, asset.w), `${hash}-${NARROW}`);
    const src = await download(asset, Math.min(WIDE, asset.w), `${hash}-${WIDE}`);
    images.set(asset._id, src);
  }
  return images.get(asset._id);
}

/* ── PORTABLE TEXT → MARKDOWN ──
   Covers exactly what the Studio's postBody allows: paragraphs, subheadings,
   bullet and numbered lists, bold, italic, links, a pull quote and a photo.
   Anything else is dropped with a warning rather than guessed at. */
const escape = (s) => s.replace(/([\\`*_[\]<>#|~])/g, "\\$1");

/* ── A LINK IN A POST WRITTEN FOR ANOTHER WEBSITE ──
   BUNSO's journal links to "/menu" and "/contact#book", meaning BUNSO's
   own pages. Here those paths are ours, so they are pointed back at the
   website the post was written for (`postHomes` in lib/cms.json). A link
   to another post that this site also carries stays on this site. */
let slugs = new Set();
function hrefFor(href, home) {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const post = /^\/blog\/([^/?#]+)\/?$/.exec(href);
  if (post && slugs.has(post[1])) return href;
  return home ? new URL(href, home).toString() : href;
}

function spans(block, home) {
  const links = new Map((block.markDefs ?? []).map((d) => [d._key, d]));
  return (block.children ?? [])
    .map((span) => {
      let t = escape(span.text ?? "");
      if (!t.trim()) return t;
      for (const m of span.marks ?? []) {
        if (m === "strong") t = `**${t}**`;
        else if (m === "em") t = `_${t}_`;
        else if (links.get(m)?.href) t = `[${t}](<${hrefFor(links.get(m).href, home)}>)`;
      }
      return t;
    })
    .join("");
}

async function toMarkdown(slug, body, home) {
  const out = [];
  let n = 0;
  for (const b of body ?? []) {
    if (b._type === "block") {
      const text = spans(b, home);
      if (b.listItem) {
        n = b.listItem === "number" ? n + 1 : 0;
        out.push({ list: true, text: `${b.listItem === "number" ? `${n}.` : "-"} ${text}` });
        continue;
      }
      n = 0;
      out.push({ text: b.style === "h2" ? `## ${text}` : text });
    } else if (b._type === "pullQuote") {
      n = 0;
      const lines = [`> ${escape(b.text ?? "")}`];
      if (b.who) lines.push(">", `> — ${escape(b.who)}`);
      out.push({ text: lines.join("\n") });
    } else if (b._type === "figure") {
      n = 0;
      const src = await localImage(b.asset);
      if (!src) continue;
      out.push({ text: `![${escape(b.alt ?? "")}](${src})` });
      if (b.caption) out.push({ text: `_${escape(b.caption)}_` });
    } else if (b._type === "video" && /^[A-Za-z0-9_-]{11}$/.test(b.id ?? "")) {
      /* This site has no film player in a post, so a film becomes a link to
         it. The id is held to YouTube's alphabet, so it can only ever be an
         id in that URL. */
      n = 0;
      out.push({
        text: `[Watch the film: ${escape(b.title ?? "on YouTube")}](https://www.youtube.com/watch?v=${b.id})`,
      });
      if (b.caption) out.push({ text: `_${escape(b.caption)}_` });
    } else {
      console.warn(`pull-cms: "${slug}" has a ${b._type} block, which the site does not render.`);
    }
  }
  /* list items sit on consecutive lines; everything else is its own paragraph */
  return out
    .map((x, i) => (i && !(x.list && out[i - 1].list) ? `\n${x.text}` : x.text))
    .join("\n")
    .trim();
}

async function pull() {
  const posts = await query(cms.query);
  slugs = new Set(posts.map((p) => p.slug));
  await fs.rm(WORK_DIR, { recursive: true, force: true });
  await fs.mkdir(WORK_DIR, { recursive: true });

  const shaped = [];
  for (const p of posts) {
    shaped.push({
      kind: p.kind,
      slug: p.slug,
      title: p.title,
      date: p.date,
      summary: p.summary,
      restaurants: p.restaurants ?? [],
      author: p.author ?? null,
      url: p.url ?? null,
      coverage: p.coverage ?? null,
      outlet: p.outlet ?? null,
      image: { src: await localImage(p.image?.asset), alt: p.image?.alt ?? "" },
      body:
        p.kind === "ours"
          ? await toMarkdown(p.slug, p.body, (p.restaurants ?? []).map((r) => cms.postHomes[r]).find(Boolean))
          : null,
    });
  }

  await fs.rm(IMAGE_DIR, { recursive: true, force: true });
  await fs.rename(WORK_DIR, IMAGE_DIR);
  await fs.mkdir(path.dirname(SNAPSHOT), { recursive: true });
  await fs.writeFile(
    SNAPSHOT,
    JSON.stringify({ pulledAt: new Date().toISOString(), posts: shaped }, null, 2),
  );
  console.log(`pull-cms: ${shaped.length} posts, ${images.size} photographs -> ${cms.imageDir}`);
}

/* ── THE JOB BOARD ──
   The site types these exactly (lib/jobs.ts): its filters and Google's job
   data read them. */
const EMPLOYMENT = ["Full-time", "Part-time", "Casual"];
const AREAS = ["Kitchen", "Front of House", "Bar", "Group"];
const LINK_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Something in the CMS this site will not build, as opposed to the CMS
 *  being out of reach. */
class ContentError extends Error {}

const text = (v) => typeof v === "string" && v.trim() !== "";
const lines = (v) => Array.isArray(v) && v.length > 0 && v.every(text);

/* The role as lib/jobs.ts types it, or an error naming the role and what
   is wrong, so the person who published it can find it in the Studio. */
function checkRole(r, i) {
  if (!r || typeof r !== "object") {
    throw new ContentError(`pull-cms: job board role ${i + 1} is empty. Fix it in the Studio.`);
  }
  const fail = (what) => {
    throw new ContentError(`pull-cms: job board role ${i + 1} ("${r?.title ?? "untitled"}") ${what}. Fix it in the Studio.`);
  };
  for (const f of ["title", "restaurant", "location", "summary"]) if (!text(r[f])) fail(`has no ${f}`);
  if (!text(r.id) || !LINK_NAME.test(r.id)) fail("has no valid link name");
  if (!/^[a-z0-9]+$/.test(r.restaurant)) fail(`has an unknown restaurant "${r.restaurant}"`);
  if (!Array.isArray(r.employment) || !r.employment.length || !r.employment.every((t) => EMPLOYMENT.includes(t)))
    fail("needs Full-time, Part-time or Casual ticked");
  if (new Set(r.employment).size !== r.employment.length) fail("has an hours option ticked twice");
  if (!AREAS.includes(r.area)) fail("has no team");
  if (!lines(r.responsibilities)) fail("has no responsibilities, or an empty line in them");
  if (!lines(r.requirements)) fail("has no requirements, or an empty line in them");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.posted ?? "")) fail("has no date posted");
  const a = r.address ?? {};
  const filled = [a.street, a.locality, a.postcode].filter(text).length;
  if (filled !== 0 && filled !== 3) fail("has part of a street address");
  return {
    id: r.id,
    title: r.title.trim(),
    restaurant: r.restaurant,
    location: r.location.trim(),
    ...(filled ? { address: { street: a.street.trim(), locality: a.locality.trim(), postcode: a.postcode.trim() } } : {}),
    type: r.employment,
    area: r.area,
    summary: r.summary.trim(),
    responsibilities: r.responsibilities.map((l) => l.trim()),
    requirements: r.requirements.map((l) => l.trim()),
    posted: r.posted,
  };
}

async function pullJobs() {
  const board = await query(cms.jobsQuery);
  /* No document at all is a broken CMS, not "no open roles": refuse it
     rather than tell visitors nobody is hiring. */
  if (!board) throw new ContentError('pull-cms: there is no published "Job board" in the CMS.');
  const roles = (board.roles ?? []).map(checkRole);
  const seen = new Set();
  for (const r of roles) {
    if (seen.has(r.id)) throw new ContentError(`pull-cms: two open roles share the link name "${r.id}". Fix it in the Studio.`);
    seen.add(r.id);
  }
  await fs.mkdir(path.dirname(JOBS_SNAPSHOT), { recursive: true });
  await fs.writeFile(JOBS_SNAPSHOT, JSON.stringify({ pulledAt: new Date().toISOString(), roles }, null, 2));
  console.log(`pull-cms: ${roles.length} open roles -> ${cms.jobsSnapshot}`);
}

/* Offline on a laptop is not a reason to refuse to start the dev server, as
   long as there is a previous snapshot to show. A build never gets this
   pass: deploying yesterday's journal or roles without saying so is worse
   than a failed deploy. A role the CMS holds but this site refuses is not
   "offline": it fails even with --dev, so it is seen before it deploys. */
async function attempt(step, snapshot) {
  try {
    await step();
  } catch (err) {
    if (DEV && !(err instanceof ContentError) && existsSync(snapshot)) {
      console.warn(`pull-cms: could not reach the CMS, using the last snapshot.\n  ${err.message}`);
    } else {
      throw err;
    }
  }
}

if (JOURNAL) await attempt(pull, SNAPSHOT);
else console.log("pull-cms: MAGINHAWA_BLOG_SOURCE=local, journal skipped.");
await attempt(pullJobs, JOBS_SNAPSHOT);
