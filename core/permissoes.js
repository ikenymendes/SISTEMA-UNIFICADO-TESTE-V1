/* =====================================================================
   PERMISSÕES · quem pode ver o quê
   ---------------------------------------------------------------------
   Para mudar o que um perfil enxerga, mexa só aqui.
   IMPORTANTE: isto controla a INTERFACE. A segurança de verdade (quem
   consegue ler/gravar cada dado) fica no banco, em
   supabase/01-schema-unificado.sql. Mesmo que alguém altere este arquivo
   no navegador, o banco recusa o que o perfil não pode.
   ===================================================================== */

/* Módulos (cada um é um sistema completo, carregado só para quem tem acesso) */
var MODULOS = {
  comercial: {
    rotulo: 'Comercial',
    descricao: 'Pontos, propostas e mídia kit',
    url: 'modulos/comercial/index.html'
  },
  operacional: {
    rotulo: 'Operacional',
    descricao: 'Gestão operacional: VTs, rotas, manutenção, checking',
    url: 'modulos/operacional/index.html'
  }
};

/* Áreas exclusivas da casca (só administrador) */
var AREAS = {
  inicio:   { rotulo: 'Início',   descricao: 'Tela inicial com atalhos' },
  usuarios: { rotulo: 'Usuários', descricao: 'Criar usuários e definir o perfil de cada um' },
  backup:   { rotulo: 'Backup',   descricao: 'Backup completo dos dois sistemas' }
};

/* Perfis */
var PERMISSOES = {
  admin: {
    rotulo: 'Administrador',
    modulos: ['comercial', 'operacional'],
    areas: ['inicio', 'usuarios', 'backup'],
    inicial: 'inicio'
  },
  comercial: {
    rotulo: 'Comercial',
    modulos: ['comercial'],
    areas: [],
    inicial: 'comercial'
  },
  operacional: {
    rotulo: 'Operacional',
    modulos: ['operacional'],
    areas: [],
    inicial: 'operacional'
  },
  manutencao: {
    rotulo: 'Manutenção',
    modulos: ['operacional'],
    areas: [],
    inicial: 'operacional'
  }
};

/* Perfis sem acesso (aguardando liberação ou bloqueado) não aparecem acima de propósito. */
