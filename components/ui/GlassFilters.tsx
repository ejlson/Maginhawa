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

        {/* ═══ #cta-fuse — THE HOUSE ACTION'S MENISCUS ═══════════════════
            The pill and the disc in PillCta close on each other; this is
            what makes the join between them read as two cells FUSING
            rather than as two shapes overlapping. Where the arcs cross,
            the raw silhouette has a sharp concave vertex. Blurring the
            alpha and thresholding it back rounds that vertex into a
            smooth neck, and the neck snaps shut just before the geometry
            does — which is exactly the signature of surface tension
            closing a bridge.

            THIS IS A SECOND ATTEMPT. `#cta-merge` stood here, did the same
            thing, and was deleted; the note it left behind said not to
            bring one back without reading the derivation first. Both of
            its failures were real and both are answered here:

              · IT SWELLED AND WOBBLED AT REST. It thresholded a blur wide
                enough to reach across the gap while the cells were still
                apart, and it re-composited the crisp source on top of the
                result, so every edge was drawn twice. Here the blur is
                --cta-goo — a TENTH of the control's height, so at rest the
                two alpha fields fall to ~0.22 where they meet, well under
                the 0.5 cut, and each shape is simply re-traced at its own
                edge. Nothing is composited back over it.
              · IT LEFT A PINCHED WAIST ON HOVER. It was being asked to
                CLOSE the gap. It is not, now: the geometry already lands
                the body's cap exactly on the disc's centre at full close
                (the R = a + b equation in PillCta.module.css), so the end
                state is a mathematically clean pill whatever this filter
                does. The filter only has the transit to render.

            THE THRESHOLD IS CENTRED ON 0.5 — alpha_out = 20a − 10, so it
            cuts at 0.5 and saturates at 0.55. A blurred straight edge
            crosses 0.5 at its ORIGINAL position, which is why the pill's
            flat sides do not move; a blurred circle of radius r crosses it
            σ²/2r inside, which at σ = 0.1h is under half a pixel at every
            size this control takes. The old matrix cut at 9/19 = 0.474,
            i.e. below half, which is a dilation — the swelling.

            THE 0.05-WIDE RAMP IS THE ANTI-ALIASING, not sloppiness. Alpha
            falls about 0.4/σ per pixel across a blurred edge, so the ramp
            resolves to roughly two thirds of a pixel of soft edge. A hard
            step (a much steeper matrix) would give the neck a stair.

            sRGB, NOT linearRGB. The default filter colour space would
            blur and threshold in linear light, which moves the 0.5 contour
            off the shape's edge and shifts the fill's colour with it. */}
        <filter
          id="cta-fuse"
          x="-15%"
          y="-60%"
          width="130%"
          height="220%"
          colorInterpolationFilters="sRGB"
        >
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 20 -10"
          />
        </filter>
      </defs>
    </svg>
  );
}
