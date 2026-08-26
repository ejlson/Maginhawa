import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

/* ── THE LINTER, WHICH THIS PROJECT DID NOT ACTUALLY HAVE ─────────────────
   `package.json` has carried `"lint": "next lint"` since the project was
   created, and it never linted anything. ESLint was never configured, so the
   command dropped into `next lint`'s INTERACTIVE SETUP PROMPT — "How would
   you like to configure ESLint?" — and waited for a keypress.

   ⚠️ WHICH IS WORSE THAN HAVING NO LINT SCRIPT AT ALL, and the reason is the
   exit code. A missing linter fails loudly. A linter that blocks on stdin
   HANGS: in CI that is a job that burns its timeout and reports nothing,
   and locally it is a command that looks like it is working. Nothing about
   the script's name suggested any of that.

   `next lint` is also removed in Next 16, so the script now calls the ESLint
   CLI directly rather than going through Next at all.

   ── WHY FlatCompat ──
   ESLint 9 defaults to flat config, and `eslint-config-next` is still
   published in eslintrc form. FlatCompat is the official bridge and is what
   create-next-app itself generates for this exact pairing; it is not a
   workaround to be removed later. When the preset ships flat natively this
   file collapses to a plain array import.

   ── SCOPE ──
   `core-web-vitals` is the stricter of the two Next presets and the right
   one here: this site's whole case is a performance one, and the rules it
   adds over `next` are the image, script and font rules that protect it.
   The ignores are the generated trees — linting `out/` would lint the
   compiled site back at us. */
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

export default [
  {
    /* ⚠️ EVERY GLOB HERE IS DEEP (leading double-star) AND NOT ROOT-SCOPED,
       for a measured reason. Scoped to the root, these ignores let through
       41,000 problems from build output that is not this project's source:
       `.claude/worktrees/` holds a checkout per agent run, each with its OWN
       `.next` directory, and a root-scoped pattern matches only the one at
       the top. The first honest run reported 43,724 problems, of which 577
       files' worth came from there — a linter nobody can read the output of
       is the same as no linter at all. */
    ignores: [
      "**/.next/**",
      "**/.next-*/**",
      "**/out/**",
      "**/node_modules/**",
      ".claude/**",
      ".agents/**",
      "graphify-out/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];
