/* ═══ THE ONE PLACE A JSON-LD BLOCK IS WRITTEN INTO THE DOCUMENT ═══
 *
 * Every `<script type="application/ld+json">` on this site renders through
 * this component. There is nothing to it but a stringify and a replace — and
 * the replace is the reason it exists at all.
 *
 * ── ⚠️ `JSON.stringify` DOES NOT ESCAPE `<`, AND AN HTML PARSER DOES NOT
 *    CARE THAT IT IS INSIDE A STRING ──
 * A `<script>` element's contents are raw text. The parser is not reading
 * JSON; it is scanning for the first `</script` and ending the element
 * there. So a JSON string value containing `</script>` closes the block
 * early and everything after it parses as MARKUP:
 *
 *     { "headline": "</script><script>alert(1)</script>" }
 *
 * stringifies to exactly that text, verbatim, because `<` and `/` are both
 * legal unescaped characters in JSON. The document then contains a real,
 * executing script tag that nobody wrote.
 *
 * Escaping `<` as its `<` form closes it: that is a valid JSON escape
 * which `JSON.parse` turns back into `<`, so every consumer — Google, Bing,
 * an LLM crawler — reads the identical object it always did, while the HTML
 * parser never sees a `<` to act on. Escaping that one character is
 * sufficient: `</script`, `<script` and `<!--` all begin with it.
 *
 * ── ⚠️ THE CSP CANNOT BE THE BACKSTOP HERE, WHICH IS WHY THIS IS NOT
 *    BELT-AND-BRACES ──
 * `script-src` in public/_headers carries `'unsafe-inline'`, and that file
 * explains at length why it is not removable: `output: "export"` means there
 * is no server at request time, so the per-response nonce that would replace
 * it cannot be generated. An injected inline script would therefore RUN.
 * This escape is the only thing standing between a string and execution.
 *
 * ── WHY A COMPONENT RATHER THAN A HELPER FUNCTION ──
 * The escape used to be absent from thirteen hand-written copies of the same
 * four lines. Thirteen copies of a security-critical line is not a bug that
 * gets fixed once; it is a shape that regenerates the bug every time someone
 * adds a fourteenth block by copying a nearby one. Passing `data` to a
 * component is now the only spelling available, and it cannot be got wrong.
 *
 * ⚠️ NOTHING IS IMPORTED HERE ON PURPOSE. components/FAQ.tsx is a client
 * component and renders a block of its own; if this lived in lib/jsonld.tsx
 * beside the records, importing it would pull RESTAURANTS and PRESS into the
 * browser bundle for a component that needs neither.
 */

export function StructuredData({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
