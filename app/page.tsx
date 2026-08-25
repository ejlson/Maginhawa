import Experience from "@/components/home/Experience";
import { GroupPressJsonLd } from "@/lib/jsonld";
import { getJournal } from "@/lib/posts";

export default function Home() {
  return (
    <>
      <GroupPressJsonLd />
      {/* the journal chapter's rail picks its stories out of this by slug
          (HOME_SLUGS in components/Blog.tsx) — passed down rather than
          imported because our own posts are read from disk at build time and
          Experience is a client component. lib/posts.ts explains the shape. */}
      <Experience journal={getJournal()} />
    </>
  );
}
