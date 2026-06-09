// fit-one-line: keep a big display title on a single line by stepping its
// font-size down until it fits the page column. One place for the masthead
// (Shelf) and the cover (Book) so the two cannot drift. Client-only: the no-JS
// fallback is the CSS size, which simply wraps.
//
// Why not measure the element's own box: the cover/masthead titles sit in
// `display:flex; align-items:center` containers, so each title is sized to its
// own content -- `el.scrollWidth === el.clientWidth` -- and a "shrink while the
// element overflows itself" loop never fires. Instead we fit the title's
// natural one-line width (scrollWidth, with nowrap) to the page content column
// (`--width-page`, capped to the viewport less the body gutter), the same width
// the header rule and footer span. The title is centered in its column, so it
// overflows a narrower inner body symmetrically and stays centered.
export function fitOneLine(selector: string, minPx = 28): void {
  function columnWidth(): number {
    const root = getComputedStyle(document.documentElement);
    const page = parseFloat(root.getPropertyValue("--width-page")) || Infinity;
    const body = getComputedStyle(document.body);
    const gutter = (parseFloat(body.paddingLeft) || 0) + (parseFloat(body.paddingRight) || 0);
    return Math.min(page, document.documentElement.clientWidth - gutter);
  }
  function run() {
    const avail = columnWidth();
    document.querySelectorAll(selector).forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      el.style.whiteSpace = "nowrap";
      el.style.fontSize = "";
      let size = parseFloat(getComputedStyle(el).fontSize);
      // scrollWidth is the title's natural one-line width even when the element
      // is a shrink-to-content flex item; fit it to the column.
      while (el.scrollWidth > avail && size > minPx) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
    });
  }
  const kick = () => requestAnimationFrame(run);
  if (document.readyState === "loading") {
    addEventListener("DOMContentLoaded", kick);
  } else {
    kick();
  }
  addEventListener("resize", run);
  // Web fonts change the measured width; re-fit once they are ready.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
}
