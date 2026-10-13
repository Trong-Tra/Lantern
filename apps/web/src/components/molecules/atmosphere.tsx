/**
 * Fixed film-grain + vignette overlays — the landing's chiaroscuro
 * atmosphere, shared with the app pages. Pure CSS (lattern.css),
 * pointer-events free. Render once inside a page's <main>.
 */
export function Atmosphere() {
  return (
    <>
      <div className="lattern-vignette" aria-hidden="true" />
      <div className="lattern-grain" aria-hidden="true" />
    </>
  );
}
