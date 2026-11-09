/* =====================================================================
   CONFIGURAÇÃO ÚNICA DO SISTEMA MEGA  (vale para Comercial e Operacional)
   ---------------------------------------------------------------------
   1) No Supabase: Project Settings > API
   2) Cole abaixo a "Project URL" e a chave "anon public".
   NUNCA cole aqui a chave "service_role" (ela é secreta).
   ===================================================================== */
window.MEGA_CONFIG = {
  SUPABASE_URL: 'https://xebhmjplgacfibkztlof.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlYmhtanBsZ2FjZmlia3p0bG9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQxODQ2MzAsImV4cCI6MjEwOTc2MDYzMH0.Gfx3o7pDTxggG_daOru1PQJKuMISn9uGv0rH_uuP6GU'
};

/* --- daqui para baixo não precisa mexer --------------------------------
   Os dois módulos antigos liam a configuração com nomes diferentes;
   mantemos os dois nomes apontando para a configuração única acima. */
window.MEGAKIT_CONFIG = window.MEGA_CONFIG;                 // módulo Comercial
window.MVT_CLOUD = {                                        // módulo Operacional
  url: window.MEGA_CONFIG.SUPABASE_URL,
  anon: window.MEGA_CONFIG.SUPABASE_ANON_KEY
};
