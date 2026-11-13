/* =====================================================================
   PERMISSÕES · quem pode ver o quê
   ---------------------------------------------------------------------
   Para mudar o que um perfil enxerga, mexa só aqui.
   IMPORTANTE: isto controla a INTERFACE. A segurança de verdade (quem
   consegue ler/gravar cada dado) fica no banco, em
   supabase/01-schema-unificado.sql. Mesmo que alguém altere este arquivo
   no navegador, o banco recusa o que o perfil não pode.
   ===================================================================== */

/* Módulos (cada um é um sistema completo, carregado só para quem tem acesso).
   A página do módulo é sempre buscada nova (?v=hora atual): assim cada atualização publicada aparece
   sem o navegador usar uma versão antiga guardada. Os scripts de cada módulo continuam com a própria versão. */
var VMOD = Date.now();
var MODULOS = {
  comercial: {
    rotulo: 'Comercial',
    descricao: 'Pontos, propostas e mídia kit',
    url: 'modulos/comercial/index.html?v=' + VMOD
  },
  operacional: {
    rotulo: 'Operacional',
    descricao: 'Gestão operacional: VTs, rotas, manutenção, checking',
    url: 'modulos/operacional/index.html?v=' + VMOD
  },
  financeiro: {
    rotulo: 'Financeiro',
    descricao: 'Faturamento: nota fiscal dos checkings concluídos',
    url: 'modulos/financeiro/index.html?v=' + VMOD
  },
  r2: {
    rotulo: 'R2',
    descricao: 'Mídia kit e checking no modelo R2 Mídia OOH',
    url: 'modulos/r2/index.html?v=' + VMOD
  }
};

/* Áreas exclusivas da casca (só administrador) */
var AREAS = {
  inicio:   { rotulo: 'Início',   descricao: 'Tela inicial com atalhos' },
  usuarios: { rotulo: 'Usuários', descricao: 'Criar usuários e definir o perfil de cada um' },
  avisos:   { rotulo: 'Avisos',   descricao: 'Enviar aviso (notificação do navegador) para a equipe' },
  backup:   { rotulo: 'Backup',   descricao: 'Backup completo dos dois sistemas' },
  protocolo: { rotulo: 'Protocolo', descricao: 'Gerar protocolo de entrega (Word e PDF)' },
  pi:        { rotulo: 'PI de repasse', descricao: 'Gerar pedido de inserção para exibidoras (Word e PDF)' }
};

/* Visual da tela de Início (igual para todos os perfis): 'claro' ou 'escuro' */
var INICIO_ESTILO = 'claro';

/* Tema do painel do ADMINISTRADOR: 'vidro' (azul Mega, escuro) ou 'branco' (claro e limpo). Só o admin usa. */
var ADMIN_TEMA = 'vidro';

/* Perfis */
var PERMISSOES = {
  admin: {
    rotulo: 'Administrador',
    modulos: ['comercial', 'operacional', 'financeiro', 'r2'],
    areas: ['inicio', 'avisos', 'protocolo', 'pi', 'usuarios', 'backup'],
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
    areas: ['inicio', 'protocolo', 'pi'],
    inicial: 'inicio'
  },
  operacional: {
    rotulo: 'Operacional',
    modulos: ['operacional', 'r2'],
    areas: ['inicio'],
    inicial: 'inicio'
  },
  manutencao: {
    rotulo: 'Manutenção',
    modulos: ['operacional'],
    areas: ['inicio'],
    inicial: 'inicio'
  },
  motoboy: {
    rotulo: 'Motoboy',
    modulos: ['operacional'],
    areas: ['inicio'],
    inicial: 'operacional'   /* abre direto na tela "Fotos perto de você" */
  },
  financeiro: {
    rotulo: 'Financeiro',
    modulos: ['financeiro'],
    areas: ['inicio'],
    inicial: 'inicio'
  }
};

/* Perfis sem acesso (aguardando liberação ou bloqueado) não aparecem acima de propósito. */
