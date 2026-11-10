/* =====================================================================
   APP NO CELULAR · instalar o sistema na tela de início (PWA)
   - registra o service worker (sw.js)
   - mostra um convite "Instalar o app" no celular (Android: botão;
     iPhone: passo a passo do Compartilhar → Adicionar à Tela de Início)
   ===================================================================== */
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  var instalado = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (instalado) { document.documentElement.classList.add('app-instalado'); return; }

  var ua = navigator.userAgent || '';
  var iOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var celular = iOS || /Android|Mobile/i.test(ua);
  if (!celular) return;

  function adiado() {
    try { return Date.now() < (+localStorage.getItem('app_convite_ate') || 0); } catch (e) { return false; }
  }
  function adiar(dias) {
    try { localStorage.setItem('app_convite_ate', String(Date.now() + dias * 864e5)); } catch (e) {}
  }

  var pedido = null, el = null;
  function fechar(dias) { if (el) { el.remove(); el = null; } adiar(dias); }
  function mostrar() {
    if (el || adiado()) return;
    el = document.createElement('div');
    el.className = 'app-convite';
    var passo = iOS
      ? '<small>No Safari, toque em <b>Compartilhar</b> <span class="ico-share">⬆︎</span> e depois em <b>Adicionar à Tela de Início</b>.</small>'
      : '<small>Fica com o ícone da Mega na tela de início, abre em tela cheia e continua logado.</small>';
    el.innerHTML = '<img src="core/assets/app/icone-192.png" alt=""><div class="txt"><b>Instale o app da Mega</b>' + passo + '</div>' +
      (iOS ? '' : '<button type="button" class="ok">Instalar</button>') +
      '<button type="button" class="x" aria-label="Agora não">×</button>';
    document.body.appendChild(el);
    var ok = el.querySelector('.ok');
    if (ok) ok.onclick = function () {
      if (!pedido) { fechar(1); return; }
      pedido.prompt();
      pedido.userChoice.then(function (r) { fechar(r && r.outcome === 'accepted' ? 365 : 7); pedido = null; });
    };
    el.querySelector('.x').onclick = function () { fechar(7); };
  }

  /* Android/Chrome: o navegador avisa quando dá para instalar */
  window.addEventListener('beforeinstallprompt', function (ev) { ev.preventDefault(); pedido = ev; setTimeout(mostrar, 1500); });
  window.addEventListener('appinstalled', function () { fechar(365); });
  /* iPhone: não existe esse aviso, então mostramos o passo a passo */
  if (iOS) setTimeout(mostrar, 2500);
})();
