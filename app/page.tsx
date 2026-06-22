import Experience from "@/components/Experience";
import { GroupPressJsonLd } from "@/lib/jsonld";

export default function Home() {
  return (
    <>
      <GroupPressJsonLd />
      <Experience />
    </>
  );
}
