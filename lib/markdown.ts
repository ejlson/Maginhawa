/* ═══ MARKDOWN → HTML, ONCE, AT BUILD TIME ═══
 *
 * The body of every journal post goes through this. It runs in a server
 * component during `next build` (and during `next dev`), produces a string of
 * HTML, and that string is what lands in the exported page. Nothing here
 * reaches the browser: the reader downloads finished HTML, not a parser.
 *
 * ── ⚠️ WHY THIS IS NOT MDX, WHICH IS WHAT IT WAS FIRST ──
 * The first version used `next-mdx-remote`, which compiles MDX and then
 * evaluates it through a `Function` constructor to hand back React elements.
 * That works in `next build` on this stack and CRASHES IN `next dev`:
 *
 *     Attempted to render <MDXContent> without development properties.
 *     TypeError: Cannot read properties of undefined (reading 'stack')
 *
 * — React 19's development build rejecting elements the evaluated module
 * created with the other JSX runtime. Passing `development: true` through to
 * the compiler did not fix it; the mismatch is in how the package builds the
 * element, not in how the body is compiled.
 *
 * A green production build and a 500 on the dev server is the worst possible
 * arrangement, because the dev server is where a writer looks at their piece
 * before publishing it. So the body is rendered to plain HTML instead, by the
 * same remark/rehype pipeline MDX itself is built on, with no React interop
 * anywhere in it — identical output in development and in production, and
 * nothing to drift the next time React or Next moves.
 *
 * WHAT IS GIVEN UP: JSX inside a post, i.e. dropping a site component into
 * the prose. Nothing needs that today — posts are prose — and if one ever
 * does, the officially supported route is `@next/mdx`, which compiles through
 * the bundler rather than through `eval` and does not have this failure mode.
 */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkSmartypants from "remark-smartypants";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Element, Root } from "hast";

import { asset } from "./media";

/* ── THE TWO THINGS A STYLESHEET CANNOT DECIDE ──
   Everything else a writer types is styled by element in
   JournalPost.module.css. These two are rewritten because each carries a
   decision about the WEB rather than about type. */
function houseRules() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      /* PHOTOGRAPHS IN THE BODY GO THROUGH `asset()`. When
         NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is set, the site's pictures are
         served resized from the CDN — next/image's loader does that for every
         <Image> on the site, but markdown compiles `![](…)` to a raw <img>
         that next/image never sees. `asset()` is the same door for raw tags
         (see lib/media.ts), so a body photograph is delivered on the same
         terms as every other one instead of shipping at source size.

         `loading="lazy"` because a body image is by definition below the
         fold — the lede photograph above it is this page's LCP and should not
         be queueing behind anything. */
      if (node.tagName === "img") {
        const src = node.properties?.src;
        if (typeof src === "string") node.properties.src = asset(src);
        node.properties.loading = "lazy";
        node.properties.decoding = "async";
        // an <img> with no alt at all is a different thing to one with an
        // empty alt: the second says "decorative", the first says nothing
        if (node.properties.alt == null) node.properties.alt = "";
      }

      /* A LINK OUT OF THE SITE OPENS IN A NEW TAB; A LINK WITHIN IT DOES NOT
         — the same rule the feed cards follow (entryLinkProps in lib/blog.ts).
         ⚠️ `rel` is not decoration on a `target="_blank"`: without it the
         opened page gets a handle on this one through `window.opener`. */
      if (node.tagName === "a") {
        const href = node.properties?.href;
        if (typeof href === "string" && /^https?:\/\//.test(href)) {
          node.properties.target = "_blank";
          // hast models `rel` as a token list, not a string
          node.properties.rel = ["noopener", "noreferrer"];
        }
      }
    });
  };
}

const pipeline = unified()
  .use(remarkParse)
  /* GitHub-flavoured markdown: tables, strikethrough, and — the one that
     actually matters here — bare URLs becoming links, which is what a writer
     pasting a link into a sentence expects to happen. */
  .use(remarkGfm)
  /* Curly quotes, real em-dashes, ellipses. The site is set in Contralto and
     Helvetica and typed apostrophes look like feet marks in both; this is the
     difference between prose that reads as typeset and prose that reads as a
     text field. It converts nothing inside code. */
  .use(remarkSmartypants)
  .use(remarkRehype)
  .use(houseRules)
  .use(rehypeStringify);

/* ⚠️ RAW HTML IN A POST IS DROPPED, DELIBERATELY. `remarkRehype` is left
   without `allowDangerousHtml`, so a `<div>` typed into a .md file does not
   survive into the page. The posts are written by people with commit access,
   so this is not a security boundary — it is a consistency one: HTML in the
   body would be styled by none of the .prose rules and would be the one part
   of a post that could quietly break the layout. */
export async function renderMarkdown(body: string): Promise<string> {
  const file = await pipeline.process(body);
  return String(file);
}
