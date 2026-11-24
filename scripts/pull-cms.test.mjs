/* Run: node scripts/pull-cms.test.mjs
 *
 * Checks the job board half of scripts/pull-cms.mjs (checkRole, pullJobs,
 * the --dev fallback) without touching Sanity or this checkout. pull-cms.mjs
 * runs on import and calls the network, so it is not imported: it is copied,
 * with lib/cms.json, into a throwaway folder and run there as a child
 * process, with `fetch` stubbed to answer a made-up job board. Only that
 * folder's .cms/jobs.json is ever written. MAGINHAWA_BLOG_SOURCE=local keeps
 * the journal out of it.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pull-cms-test-"));
fs.mkdirSync(path.join(tmp, "scripts"));
fs.mkdirSync(path.join(tmp, "lib"));
fs.copyFileSync(path.join(ROOT, "scripts/pull-cms.mjs"), path.join(tmp, "scripts/pull-cms.mjs"));
fs.copyFileSync(path.join(ROOT, "lib/cms.json"), path.join(tmp, "lib/cms.json"));
const SNAPSHOT = path.join(tmp, JSON.parse(fs.readFileSync(path.join(tmp, "lib/cms.json"), "utf8")).jobsSnapshot);

/* Answers every query with BOARD (JSON in the env), or fails like a dropped
   connection when OFFLINE is set. Never reaches the network. */
const STUB = path.join(tmp, "stub-fetch.mjs");
fs.writeFileSync(
  STUB,
  `globalThis.fetch = async () => {
    if (process.env.OFFLINE) throw new TypeError("fetch failed");
    return new Response(JSON.stringify({ result: JSON.parse(process.env.BOARD) }), { status: 200 });
  };\n`,
);

function run(board, { dev = false, offline = false } = {}) {
  const res = spawnSync(
    process.execPath,
    ["--import", STUB, path.join(tmp, "scripts/pull-cms.mjs"), ...(dev ? ["--dev"] : [])],
    {
      env: {
        ...process.env,
        MAGINHAWA_BLOG_SOURCE: "local",
        BOARD: JSON.stringify(board),
        ...(offline ? { OFFLINE: "1" } : {}),
      },
      encoding: "utf8",
    },
  );
  return { code: res.status, out: res.stdout + res.stderr };
}

const role = (over = {}) => ({
  id: "head-baker-bunso",
  title: " Head Baker ",
  restaurant: "bunso",
  location: "Kentish Town, London",
  address: null,
  employment: ["Full-time"],
  area: "Kitchen",
  summary: "Bake.",
  responsibilities: [" Bake bread "],
  requirements: ["Right to work in the UK"],
  posted: "2026-11-24",
  ...over,
});

const fails = (board, pattern, opts) => {
  fs.rmSync(SNAPSHOT, { force: true });
  const r = run(board, opts);
  assert.notEqual(r.code, 0, `expected a failure for ${JSON.stringify(board)}`);
  assert.match(r.out, pattern);
  assert.ok(!fs.existsSync(SNAPSHOT), "a refused board must not write a snapshot");
};

try {
  // A good board: written in order, trimmed, employment -> type, no address key
  let r = run({ roles: [role(), role({ id: "chef", title: "Chef", restaurant: "group", employment: ["Full-time", "Casual"] })] });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /2 open roles/);
  let snap = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));
  assert.deepEqual(snap.roles.map((x) => x.id), ["head-baker-bunso", "chef"]);
  assert.equal(snap.roles[0].title, "Head Baker");
  assert.deepEqual(snap.roles[0].responsibilities, ["Bake bread"]);
  assert.deepEqual(snap.roles[0].type, ["Full-time"]);
  assert.equal("employment" in snap.roles[0], false);
  assert.equal("address" in snap.roles[0], false);
  assert.deepEqual(snap.roles[1].type, ["Full-time", "Casual"]);

  // A full address is kept, trimmed
  r = run({ roles: [role({ address: { street: " 1a Hawley Road ", locality: "London", postcode: "NW1 8RP" } })] });
  assert.equal(r.code, 0, r.out);
  snap = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));
  assert.deepEqual(snap.roles[0].address, { street: "1a Hawley Road", locality: "London", postcode: "NW1 8RP" });

  // No open roles is fine: an empty list, not an error
  r = run({ roles: null });
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(JSON.parse(fs.readFileSync(SNAPSHOT, "utf8")).roles, []);

  // Refusals, each naming the role
  fails(null, /no published "Job board"/);
  fails({ roles: [role({ title: "  " })] }, /role 1 \(" {2}"\) has no title/);
  fails({ roles: [role(), role({ summary: undefined })] }, /role 2 \(" Head Baker "\) has no summary/);
  fails({ roles: [role({ location: "" })] }, /has no location/);
  fails({ roles: [role({ restaurant: undefined })] }, /has no restaurant/);
  fails({ roles: [role({ id: null })] }, /has no valid link name/);
  fails({ roles: [role({ id: "Head Baker" })] }, /has no valid link name/);
  fails({ roles: [role({ restaurant: "../x" })] }, /unknown restaurant "\.\.\/x"/);
  fails({ roles: [role({ employment: [] })] }, /needs Full-time, Part-time or Casual/);
  fails({ roles: [role({ employment: null })] }, /needs Full-time, Part-time or Casual/);
  fails({ roles: [role({ employment: ["Full Time"] })] }, /needs Full-time, Part-time or Casual/);
  fails({ roles: [role({ employment: ["Casual", "Casual"] })] }, /ticked twice/);
  fails({ roles: [role({ area: "Front of house" })] }, /has no team/);
  fails({ roles: [role({ responsibilities: [] })] }, /has no responsibilities/);
  fails({ roles: [role({ responsibilities: ["ok", " "] })] }, /has no responsibilities/);
  fails({ roles: [role({ requirements: null })] }, /has no requirements/);
  fails({ roles: [role({ posted: "24/11/2026" })] }, /has no date posted/);
  fails({ roles: [role({ posted: null })] }, /has no date posted/);
  fails({ roles: [role({ address: { street: "1 A St", locality: "", postcode: null } })] }, /part of a street address/);
  fails({ roles: [role(), role({ title: "Other" })] }, /two open roles share the link name "head-baker-bunso"/);

  // --dev: a refused role still fails, even with a snapshot to fall back on
  run({ roles: [role()] });
  r = run({ roles: [role({ area: "Nope" })] }, { dev: true });
  assert.notEqual(r.code, 0);
  assert.match(r.out, /has no team/);

  // --dev offline keeps the last snapshot; a build offline fails
  r = run(null, { dev: true, offline: true });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /using the last snapshot/);
  r = run(null, { offline: true });
  assert.notEqual(r.code, 0);
  fs.rmSync(SNAPSHOT);
  r = run(null, { dev: true, offline: true });
  assert.notEqual(r.code, 0, "offline with no snapshot must fail even with --dev");

  console.log("pull-cms job board tests passed");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
