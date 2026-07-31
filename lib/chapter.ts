/**
 * ONE SIGNAL: is the chapter currently performing?
 *
 * A chapter that stages its own arrival (the restaurant grid's assembly)
 * owns the viewport while it runs — it parks the composition mid-screen and
 * locks the page. ChapterPin also wants to own the viewport, and if it
 * engages first the two fight in a way that has exactly one visible
 * outcome: the pin cancels the scroll, so the title can never reach the
 * middle of the screen, so the performance arms hundreds of pixels late
 * with the next chapter's ground already showing under it.
 *
 * They have to be sequenced, and the only thing that knows when the
 * performance is over is the chapter. Hence a signal rather than geometry:
 * no measurement can tell a pin "this chapter has not said its piece yet".
 *
 * A module-level store rather than context: the value changes twice in the
 * lifetime of the page and nothing between the two components needs to
 * re-render on it. Default TRUE, so a chapter that stages nothing — which
 * is every other chapter — behaves exactly as if this did not exist.
 */
type Listener = (ready: boolean) => void;

let ready = true;
const listeners = new Set<Listener>();

export function setChapterReady(next: boolean) {
  if (next === ready) return;
  ready = next;
  listeners.forEach((f) => f(ready));
}

export function onChapterReady(f: Listener) {
  listeners.add(f);
  f(ready);
  return () => {
    listeners.delete(f);
  };
}
