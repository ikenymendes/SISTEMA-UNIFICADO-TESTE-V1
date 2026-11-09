/* =====================================================================
   Módulo operacional · Inicialização do sistema
   (arquivo 13 de 13; carregados em ordem pelo index.html)
   ===================================================================== */

snap();
render();
bkInit().then(() => {
  if (BK.st === "on") bkSched();
});
cloudBoot();
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    fechaBk();
    if (BK.t) {
      clearTimeout(BK.t);
      BK.t = null;
      bkNow();
    }
  } else pull();
});
window.addEventListener("focus", pull);
setInterval(() => {
  if (!document.hidden) pull();
}, 5000);
document.addEventListener("focusout", () =>
  setTimeout(() => {
    if (!PEND) return;
    const a = document.activeElement;
    if (!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && $("app").contains(a))) {
      keep();
      render();
    }
  }, 400),
);
