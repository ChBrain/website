// fit-one-line: keep a big display title on a single line by stepping its
// font-size down until it stops overflowing. One place for the masthead (Shelf)
// and the cover (Book) so the two cannot drift. Client-only: the no-JS fallback
// is the CSS size, which simply wraps.
//
// For each element matching `selector`, force `white-space: nowrap`, reset any
// prior inline size, then shrink from the CSS size down to `minPx` until the
// content fits its box. Re-runs on resize and once web fonts have loaded (their
// metrics change the measured width).
export function fitOneLine(selector: string, minPx = 28): void {
  function run() {
    document.querySelectorAll(selector).forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      el.style.whiteSpace = "nowrap";
      el.style.fontSize = "";
      let size = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollWidth > el.clientWidth && size > minPx) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
    });
  }
  run();
  addEventListener("resize", run);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
}
