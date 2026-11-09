/* ======================================================================
 *  CARREGADOR DO AMBIENTE DE TESTES
 *  Basta UMA linha, antes de todos os outros scripts da página
 *  (na casca e em cada página de módulo / iframe):
 *
 *      <script src="../../teste/teste.js"></script>     (ajuste o caminho)
 *
 *  Ele carrega, nesta ordem e no mesmo diretório dele:
 *      config-teste.js   → define MEGA_CONFIG / MVT_CLOUD / MEGAKIT_CONFIG
 *      dados-teste.js    → define MEGA_TESTE_SEED (dados fictícios)
 *      mock-supabase.js  → instala o Supabase de mentira (fetch + WebSocket)
 *
 *  Em produção, simplesmente NÃO inclua esta linha (e use o config.js real).
 * ====================================================================== */
(function () {
  var atual = document.currentScript;
  var base = atual ? atual.src.replace(/[^\/]*$/, '') : 'teste/';
  ['config-teste.js', 'dados-teste.js', 'mock-supabase.js'].forEach(function (arq) {
    document.write('<script src="' + base + arq + '"><\/script>');
  });
})();
