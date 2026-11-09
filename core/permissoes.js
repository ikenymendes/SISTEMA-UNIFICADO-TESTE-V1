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
    url: 'modulos/comercial/index.html?v=20261109n'
  },
  operacional: {
    rotulo: 'Operacional',
    descricao: 'Gestão operacional: VTs, rotas, manutenção, checking',
    url: 'modulos/operacional/index.html?v=20261109n'
  },
  financeiro: {
    rotulo: 'Financeiro',
    descricao: 'Faturamento: nota fiscal dos checkings concluídos',
    url: 'modulos/financeiro/index.html?v=20261109n'
  }
};

/* Áreas exclusivas da casca (só administrador) */
var AREAS = {
  inicio:   { rotulo: 'Início',   descricao: 'Tela inicial com atalhos' },
  usuarios: { rotulo: 'Usuários', descricao: 'Criar usuários e definir o perfil de cada um' },
  backup:   { rotulo: 'Backup',   descricao: 'Backup completo dos dois sistemas' }
};

/* Visual da tela de Início (igual para todos os perfis): 'claro' ou 'escuro' */
var INICIO_ESTILO = 'claro';

/* Tema do painel do ADMINISTRADOR: 'vidro' (azul Mega, escuro) ou 'branco' (claro e limpo). Só o admin usa. */
var ADMIN_TEMA = 'vidro';

/* Perfis */
var PERMISSOES = {
  admin: {
    rotulo: 'Administrador',
    modulos: ['comercial', 'operacional', 'financeiro'],
    areas: ['inicio', 'usuarios', 'backup'],
    inicial: 'inicio'
  },
  comercial: {
    rotulo: 'Comercial',
    modulos: ['comercial'],
    areas: ['inicio'],
    inicial: 'inicio'
  },
  gerente_comercial: {
    rotulo: 'Gerente comercial',
    modulos: ['comercial'],
    areas: ['inicio'],
    inicial: 'inicio'
  },
  operacional: {
    rotulo: 'Operacional',
    modulos: ['operacional'],
    areas: ['inicio'],
    inicial: 'inicio'
  },
  manutencao: {
    rotulo: 'Manutenção',
    modulos: ['operacional'],
    areas: ['inicio'],
    inicial: 'inicio'
  },
  financeiro: {
    rotulo: 'Financeiro',
    modulos: ['financeiro'],
    areas: ['inicio'],
    inicial: 'inicio'
  }
};

/* Perfis sem acesso (aguardando liberação ou bloqueado) não aparecem acima de propósito. */
