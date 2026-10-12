// Mise en page commune du deck (deck.html, index.html, export autonome).
//
// 1. prepareSlides() — avant Reveal.initialize : dans chaque slide qui a un titre <h2> direct,
//    tout ce qui suit l'en-tête (kicker, h2, barline, et le sous-titre <p class="small|muted">
//    placé juste après la barline) est regroupé dans
//    <div class="slide-body"><div class="slide-fit">…</div></div>.
//    Les slides sans h2 direct (couverture, section, simulations plein cadre) ne sont pas touchées.
// 2. startSlideLayout() — après Reveal.initialize :
//    - fitCanvas : le cadre 1280×720 prend les proportions de la fenêtre (plus de bande vide) ;
//    - fitBody : sur la slide affichée, le contenu sous l'en-tête est centré verticalement dans
//      la place restante et mis à l'échelle (CSS zoom) pour l'occuper : agrandi jusqu'à ×1,1 s'il
//      reste de la place, réduit jusqu'à ×0,6 s'il déborde. Slides contenant une iframe : échelle 1.

const FIT_MIN = 0.6, FIT_MAX = 1.1;
const FIT_FILL = 0.88;   // part de la hauteur disponible que le contenu peut occuper (le reste : de l'air)

function prepareSlides() {
  document.querySelectorAll(".reveal .slides > section").forEach(sec => {
    if (sec.querySelector(":scope > .slide-body") || !sec.querySelector(":scope > h2")) return;
    // en-tête = suite d'éléments .kicker / h2 / .barline en tête de slide (style, notes et <svg> de
    // définitions de taille nulle ignorés : ils restent où ils sont)
    const kids = [...sec.childNodes].filter(n => !(n.nodeType === 1 && n.matches('aside.notes, style, script, svg[width="0"]')));
    // le sous-titre (<p class="small"> ou "muted" juste après la barline) reste avec l'en-tête
    let i = 0, anchor = null;
    for (; i < kids.length; i++) {
      const n = kids[i];
      if (n.nodeType !== 1) { if (n.textContent.trim()) break; continue; }
      const sub = anchor && anchor.matches(".barline") && n.matches("p.small, p.muted");
      if (!n.matches(".kicker, h2, .barline") && !sub) break;
      anchor = n;
      if (sub) { i++; break; }
    }
    const rest = kids.slice(i);
    if (!anchor || anchor.matches(".kicker") || !rest.some(n => n.nodeType === 1)) return;
    const body = document.createElement("div"), fit = document.createElement("div");
    body.className = "slide-body"; fit.className = "slide-fit"; body.appendChild(fit);
    rest.forEach(n => fit.appendChild(n));
    anchor.after(body);
    sec.classList.add("has-body");
  });
}

function fitCanvas() {
  const el = document.querySelector(".reveal");
  const W = el.clientWidth, H = el.clientHeight;
  if (!W || !H) return;
  const r = H / W;
  const size = r >= 720 / 1280
    ? { width: 1280, height: Math.round(1280 * r) }
    : { width: Math.round(720 / r), height: 720 };
  const cur = Reveal.getConfig();
  if (cur.width !== size.width || cur.height !== size.height) { Reveal.configure(size); fitBody(); }
}

function fitBody(sec) {
  sec = sec || Reveal.getCurrentSlide();
  const body = sec && sec.querySelector(":scope > .slide-body");
  if (!body) return;
  const fit = body.firstElementChild;
  const room = () => FIT_FILL * body.getBoundingClientRect().height;
  const need = z => { fit.style.zoom = z; return fit.getBoundingClientRect().height; };
  if (!room()) return;
  // une iframe (simulation, vidéo) ne suit pas bien le zoom CSS et coûte plus cher à dessiner
  // agrandie : ces slides restent à l'échelle 1, simplement centrées
  if (fit.querySelector("iframe")) { fit.style.zoom = 1; return; }
  // plus grand zoom tel que le contenu tienne dans la place restante (recherche par dichotomie)
  let lo = FIT_MIN, hi = FIT_MAX;
  if (need(hi) <= room()) lo = hi;
  else for (let i = 0; i < 9; i++) { const m = (lo + hi) / 2; if (need(m) <= room()) lo = m; else hi = m; }
  fit.style.zoom = lo;
}

function startSlideLayout() {
  fitCanvas();
  fitBody();
  Reveal.on("slidechanged", e => fitBody(e.currentSlide));
  Reveal.on("resize", () => fitBody());
  window.addEventListener("resize", fitCanvas);
  // images et polices chargées après coup : recalcul de la slide affichée
  window.addEventListener("load", () => fitBody());
  document.querySelectorAll(".slide-body img").forEach(img => {
    if (!img.complete) img.addEventListener("load", () => { if (img.closest("section.present")) fitBody(); });
  });
  if (document.fonts) document.fonts.ready.then(() => fitBody());
}
