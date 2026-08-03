/* TYPOGRAPHIC CONSISTENCY AUDIT — static, across every stylesheet.

   The design system lives in app/globals.css as --font-*, --t-*, --lh-*,
   --tr-* tokens. This walks every .css file and reports, per property, which
   declarations go through a token and which are written as literals. A
   literal is not automatically wrong (a one-off optical correction is a real
   thing) but each one is a place the system can drift, so they are the list
   worth reading.

   usage: node scripts/audit-type.mjs */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["app", "components"];
const PROPS = [
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
];

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".css")) files.push(p);
  }
};
ROOTS.forEach(walk);

// the declared design tokens, so we can say what EXISTS to be used
const globals = readFileSync("app/globals.css", "utf8");
const tokens = {};
for (const [, name, value] of globals.matchAll(
  /(--(?:font|t|lh|tr)-[a-z0-9-]+)\s*:\s*([^;]+);/g,
)) {
  if (!(name in tokens)) tokens[name] = value.trim();
}

console.log("=== DECLARED TOKENS ===");
for (const group of ["--font-", "--t-", "--lh-", "--tr-"]) {
  const hits = Object.entries(tokens).filter(([n]) => n.startsWith(group));
  if (!hits.length) continue;
  console.log(`\n  ${group}*`);
  for (const [n, v] of hits) console.log(`    ${n.padEnd(22)} ${v}`);
}

// every declaration of the properties we care about
const found = Object.fromEntries(PROPS.map((p) => [p, []]));
for (const f of files) {
  const src = readFileSync(f, "utf8");
  /* Strip comments so commented-out CSS isn't counted as shipped — but
     replace each one with its OWN newlines, not with nothing. Deleting a
     multi-line comment outright shifts every line after it, and the reported
     line numbers then point at whatever happens to sit there in the real
     file. (Learned the hard way: the first version of this script sent me to
     a `display: none` and an unrelated closing brace.) */
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, (m) =>
    "\n".repeat((m.match(/\n/g) ?? []).length),
  );
  const lines = clean.split("\n");
  lines.forEach((line, i) => {
    for (const prop of PROPS) {
      const m = line.match(new RegExp(`(?:^|[;{\\s])${prop}\\s*:\\s*([^;]+)`));
      if (m) found[prop].push({ file: f, line: i + 1, value: m[1].trim() });
    }
  });
}

const usesToken = (v) => /var\(--/.test(v);

for (const prop of PROPS) {
  const all = found[prop];
  const literals = all.filter((d) => !usesToken(d.value));
  console.log(
    `\n\n=== ${prop.toUpperCase()} — ${all.length} declarations, ${all.length - literals.length} via token, ${literals.length} literal ===`,
  );
  // group the literals by value so repeats are obvious
  const byValue = new Map();
  for (const d of literals) {
    if (!byValue.has(d.value)) byValue.set(d.value, []);
    byValue.get(d.value).push(d);
  }
  const sorted = [...byValue.entries()].sort((a, c) => c[1].length - a[1].length);
  for (const [value, uses] of sorted) {
    console.log(`\n  ${value}   (${uses.length}x)`);
    for (const u of uses.slice(0, 8)) {
      console.log(`      ${u.file}:${u.line}`);
    }
    if (uses.length > 8) console.log(`      … and ${uses.length - 8} more`);
  }
  if (!literals.length) console.log("  (all tokenised)");
}
