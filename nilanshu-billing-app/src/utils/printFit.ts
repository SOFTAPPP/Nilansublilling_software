// Shrinks each .a4-page just enough to fit on a single A4 sheet when printing.
// The print dialog may ignore the @page margin from index.css (WebView2 was seen
// using ~14mm), so size against the smallest printable area we expect to get.
const MAX_MARGIN_MM = 15;
const PRINTABLE_WIDTH_MM = 210 - 2 * MAX_MARGIN_MM;
const PRINTABLE_HEIGHT_MM = 297 - 2 * MAX_MARGIN_MM;
const SAFETY = 0.97; // screen measurement differs slightly from print layout
const MIN_SCALE = 0.6;

const mmToPx = (mm: number) => (mm * 96) / 25.4;

let restoreList: Array<[HTMLElement, string | null]> = [];

const setStyle = (el: HTMLElement, prop: string, value: string) => {
  if (!restoreList.some(([e]) => e === el)) restoreList.push([el, el.getAttribute('style')]);
  el.style.setProperty(prop, value, 'important');
};

const restore = () => {
  restoreList.forEach(([el, style]) => {
    if (style === null) el.removeAttribute('style');
    else el.setAttribute('style', style);
  });
  restoreList = [];
};

// Height of the page as it would print at the given zoom. The page width stays
// at the printable width (in print it is 100%, which zoom does not shrink), so
// shrinking also un-wraps long product names and the height drops faster than
// the scale itself.
const measureAt = (page: HTMLElement, scale: number) => {
  setStyle(page, 'zoom', String(scale));
  setStyle(page, 'width', `${PRINTABLE_WIDTH_MM / scale}mm`);
  return page.getBoundingClientRect().height;
};

const findScale = (page: HTMLElement, available: number) => {
  if (measureAt(page, 1) <= available) return 1;
  if (measureAt(page, MIN_SCALE) > available) return MIN_SCALE;
  let lo = MIN_SCALE; // fits
  let hi = 1; // does not fit
  for (let i = 0; i < 7; i++) {
    const mid = (lo + hi) / 2;
    if (measureAt(page, mid) <= available) lo = mid;
    else hi = mid;
  }
  return lo;
};

const fitPages = () => {
  restore();
  const pages = Array.from(document.querySelectorAll<HTMLElement>('.a4-page'));
  if (pages.length === 0) return;

  // Approximate the print layout while still in screen mode: no forced height,
  // screen-only controls hidden and print-only blocks shown.
  pages.forEach(page => {
    setStyle(page, 'min-height', '0');
    page.querySelectorAll<HTMLElement>('.no-print, [class*="print:hidden"]').forEach(el => setStyle(el, 'display', 'none'));
    page.querySelectorAll<HTMLElement>('[class*="print:block"]').forEach(el => setStyle(el, 'display', 'block'));
    page.querySelectorAll<HTMLElement>('[class*="print:flex"]').forEach(el => setStyle(el, 'display', 'flex'));
    page.querySelectorAll<HTMLElement>('[class*="print:inline"]').forEach(el => setStyle(el, 'display', 'inline'));
  });

  const available = mmToPx(PRINTABLE_HEIGHT_MM) * SAFETY;
  const scales = pages.map(page => findScale(page, available));
  restore();

  pages.forEach((page, i) => {
    const scale = scales[i];
    if (scale >= 1) return;
    setStyle(page, 'zoom', scale.toFixed(3));
    // zoom also shrinks the page's own min-height (100vh in index.css); compensate
    // so the zoomed page still fills exactly one sheet
    setStyle(page, '--print-fit-vh', `calc(100vh / ${scale.toFixed(3)})`);
  });
};

export const initPrintFit = () => {
  window.addEventListener('beforeprint', fitPages);
  window.addEventListener('afterprint', restore);
};
