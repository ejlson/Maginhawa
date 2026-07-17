/**
 * Liquid-glass SVG filters — the CSS+SVG refraction technique (ekino /
 * kube.io / the liquid-glass reference implementations):
 *
 * 1. A displacement map — X offset encoded in the Red channel, Y in
 *    Green, 0x80 = rest — built from a pair of screen-blended axis
 *    gradients with a blurred neutral-grey core matching the element's
 *    shape: no displacement in the middle, a soft refraction ramp at
 *    the rim. feImage stretches it to the element's bounds.
 * 2. feDisplacementMap bends the backdrop through the map — run THREE
 *    times at slightly different scales, each pass isolated to one
 *    colour channel (feColorMatrix) and screen-blended back together:
 *    red bends a touch more than blue, i.e. real chromatic dispersion
 *    at the rim.
 *
 * Applied via `backdrop-filter: url(#lg-*)`, so the glass refracts the
 * real page behind it (type included) instead of painting over it.
 * Displacement through backdrop-filter is Chromium territory — other
 * engines fall back to the plain blur/saturate glass declared before
 * the url() line in each component's CSS.
 */

const map = (core: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>` +
      `<defs>` +
      `<linearGradient id='x' x1='0' y1='0' x2='1' y2='0'>` +
      `<stop offset='0' stop-color='#000000'/><stop offset='1' stop-color='#ff0000'/>` +
      `</linearGradient>` +
      `<linearGradient id='y' x1='0' y1='0' x2='0' y2='1'>` +
      `<stop offset='0' stop-color='#000000'/><stop offset='1' stop-color='#00ff00'/>` +
      `</linearGradient>` +
      `<filter id='b'><feGaussianBlur stdDeviation='7'/></filter>` +
      `</defs>` +
      `<rect width='128' height='128' fill='url(#x)'/>` +
      `<rect width='128' height='128' fill='url(#y)' style='mix-blend-mode:screen'/>` +
      core +
      `</svg>`
  )}`;

/* circular lens (the cursor) — neutral core, refraction ring at the rim */
const LENS_MAP = map(
  `<circle cx='64' cy='64' r='46' fill='#808080' filter='url(#b)'/>`
);

/* pill / rounded plate — neutral core with rounded shoulders */
const PILL_MAP = map(
  `<rect x='12' y='12' width='104' height='104' rx='34' fill='#808080' filter='url(#b)'/>`
);

/* keep-one-channel matrices (alpha passes through) */
const KEEP = {
  R: "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
  G: "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
  B: "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",
};

/* ca (chromatic spread) stays tiny: the channel copies must land within
   a couple of pixels of each other so thin glyph strokes read as ONE
   line with a colour fringe — larger spreads split an "I" into three
   separated ghost stems */
const FILTERS: { id: string; href: string; scale: number; ca: number }[] = [
  { id: "lg-lens", href: LENS_MAP, scale: 36, ca: 0.03 }, // cursor
  { id: "lg-pill", href: PILL_MAP, scale: 20, ca: 0.03 }, // glass pills
  { id: "lg-card", href: PILL_MAP, scale: 12, ca: 0.025 }, // glass plates
];

export default function GlassFilters() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        {FILTERS.map((f) => (
          <filter
            key={f.id}
            id={f.id}
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feImage
              href={f.href}
              x="0%"
              y="0%"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              result="map"
            />
            {/* chromatic dispersion: red bends the most, blue the least */}
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale={f.scale * (1 + f.ca)}
              xChannelSelector="R"
              yChannelSelector="G"
              result="dispR"
            />
            <feColorMatrix
              in="dispR"
              type="matrix"
              values={KEEP.R}
              result="chR"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale={f.scale}
              xChannelSelector="R"
              yChannelSelector="G"
              result="dispG"
            />
            <feColorMatrix
              in="dispG"
              type="matrix"
              values={KEEP.G}
              result="chG"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale={f.scale * (1 - f.ca)}
              xChannelSelector="R"
              yChannelSelector="G"
              result="dispB"
            />
            <feColorMatrix
              in="dispB"
              type="matrix"
              values={KEEP.B}
              result="chB"
            />
            {/* screen-blend the single-channel passes back into one image */}
            <feBlend in="chR" in2="chG" mode="screen" result="chRG" />
            <feBlend in="chRG" in2="chB" mode="screen" />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
