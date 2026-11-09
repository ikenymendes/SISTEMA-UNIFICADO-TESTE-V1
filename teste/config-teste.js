/* Configuração do AMBIENTE DE TESTES: aponta para o Supabase de mentira (mock-supabase.js).
 * Defina os três nomes que os módulos leem:
 *   - MEGA_CONFIG     : casca / unificado
 *   - MVT_CLOUD       : módulo operacional (url, anon)
 *   - MEGAKIT_CONFIG  : módulo comercial (SUPABASE_URL, SUPABASE_ANON_KEY)
 * A chave "anon" abaixo é falsa: serve só para passar nas validações de formato. */
(function () {
  var URL = 'https://teste.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS10ZXN0ZSIsInJlZiI6InRlc3RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6NDEwMjQ0NDgwMH0.assinatura-de-teste-nao-valida';
  window.MEGA_CONFIG    = { SUPABASE_URL: URL, SUPABASE_ANON_KEY: ANON, MODO_TESTE: true };
  window.MVT_CLOUD      = { url: URL, anon: ANON };
  window.MEGAKIT_CONFIG = { SUPABASE_URL: URL, SUPABASE_ANON_KEY: ANON };
})();
