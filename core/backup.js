/* =====================================================================
   BACKUP (área exclusiva do administrador)
   Baixa, num único arquivo, os dados dos DOIS sistemas:
     Operacional : registros (VTs, pontos, fotos, manutenção, ...)
     Comercial   : pontos, configuração do kit, sugestões, propostas
     Usuários    : perfis (sem senhas, que nunca saem do Supabase)
   O arquivo tem uma parte "operacional.registros" no mesmo formato que o
   "Importar backup" da Gestão Operacional aceita.
   O backup AUTOMÁTICO diário (GitHub) está em backup/backup-diario.yml.
   ===================================================================== */
var BACKUP = (function () {
  var TABELAS = [
    { grupo: 'operacional', tabela: 'registros',  rotulo: 'Operacional · registros (VTs, pontos, fotos, manutenção…)', ordem: 'rev', cols: 'chave,tipo,dados,u,excluido,rev' },
    { grupo: 'comercial',   tabela: 'pontos',     rotulo: 'Comercial · pontos', ordem: 'id', cols: '*' },
    { grupo: 'comercial',   tabela: 'config',     rotulo: 'Comercial · configuração do kit', ordem: 'id', cols: '*' },
    { grupo: 'comercial',   tabela: 'sugestoes',  rotulo: 'Comercial · sugestões', ordem: 'id', cols: '*' },
    { grupo: 'comercial',   tabela: 'propostas',  rotulo: 'Comercial · propostas geradas', ordem: 'id', cols: '*' },
    { grupo: 'usuarios',    tabela: 'profiles',   rotulo: 'Usuários e perfis', ordem: 'id', cols: 'id,email,nome,papel,ativo,criado_em' }
  ];
  var clienteRef = null, corpoTabela = null, status = null, botao = null;

  function h(tag, attrs, filhos) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') el.className = attrs[k]; else if (k === 'text') el.textContent = attrs[k];
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), attrs[k]); else el.setAttribute(k, attrs[k]);
    });
    (filhos || []).forEach(function (f) { if (f) el.appendChild(f); });
    return el;
  }

  /* Lê a tabela inteira, de mil em mil, em ordem estável. */
  async function lerTudo(t) {
    var linhas = [], de = 0, passo = 1000;
    for (;;) {
      var r = await clienteRef.from(t.tabela).select(t.cols).order(t.ordem, { ascending: true }).range(de, de + passo - 1);
      if (r.error) throw r.error;
      linhas = linhas.concat(r.data);
      if (r.data.length < passo) break;
      de += passo;
    }
    return linhas;
  }
  async function contar(t) {
    var r = await clienteRef.from(t.tabela).select(t.ordem, { count: 'exact', head: true });
    if (r.error) throw r.error;
    return r.count || 0;
  }

  async function baixar() {
    botao.disabled = true; status.textContent = 'Preparando o backup…';
    try {
      var pacote = { sistema: 'Mega · backup completo', versao: 1, geradoEm: new Date().toISOString(), operacional: {}, comercial: {}, usuarios: {} };
      for (var i = 0; i < TABELAS.length; i++) {
        var t = TABELAS[i];
        status.textContent = 'Lendo ' + t.rotulo + '…';
        var dados = await lerTudo(t);
        if (t.grupo === 'operacional') pacote.operacional[t.tabela] = dados;
        else if (t.grupo === 'comercial') pacote.comercial[t.tabela] = dados;
        else pacote.usuarios[t.tabela] = dados;
      }
      var nome = 'mega-backup-completo-' + new Date().toISOString().slice(0, 10) + '.json';
      var blob = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' });
      var a = h('a', { href: URL.createObjectURL(blob), download: nome }); document.body.appendChild(a); a.click(); a.remove();
      status.textContent = 'Backup baixado: ' + nome;
    } catch (e) {
      status.textContent = 'Não foi possível gerar o backup: ' + ((e && e.message) || e);
    }
    botao.disabled = false;
  }

  async function atualizar() {
    if (!corpoTabela) return;
    corpoTabela.innerHTML = '';
    for (var i = 0; i < TABELAS.length; i++) {
      var t = TABELAS[i], n = '—';
      try { n = String(await contar(t)); } catch (e) { n = 'sem acesso'; }
      corpoTabela.appendChild(h('tr', {}, [h('td', { text: t.rotulo }), h('td', { class: 'n', text: n })]));
    }
  }

  function tela(client) {
    clienteRef = client;
    corpoTabela = h('tbody');
    status = h('p', { text: '' });
    botao = h('button', { class: 'btn', text: 'Baixar backup completo (.json)', onclick: baixar });
    return h('div', { class: 'conteudo' }, [
      h('h1', { text: 'Backup' }),
      h('p', { class: 'sub', text: 'Uma cópia de segurança dos dois sistemas, num só lugar.' }),
      h('div', { class: 'caixa' }, [
        h('h2', { text: 'O que existe hoje no banco' }),
        h('table', {}, [h('thead', {}, [h('tr', {}, [h('th', { text: 'Dados' }), h('th', { text: 'Registros' })])]), corpoTabela]),
        botao, status
      ]),
      h('div', { class: 'caixa' }, [
        h('h2', { text: 'Backup automático todo dia' }),
        h('p', { text: 'Um robô do GitHub copia os dois sistemas para um repositório PRIVADO todos os dias, às 5h, e guarda os últimos 60 dias. Configuração no LEIA-ME (arquivo .github/workflows/backup-diario.yml).' })
      ]),
      h('div', { class: 'caixa' }, [
        h('h2', { text: 'Backups que continuam dentro da Gestão Operacional' }),
        h('p', { text: 'Em Operacional → Admin → Dados e planilha continuam o backup automático em pasta do computador (Drive), o backup ao fechar a página, os arquivos matriz-vt-auto.json e matriz-vt-fechamento.json, e o botão Exportar/Importar backup, exatamente como antes.' })
      ])
    ]);
  }

  return { tela: tela, atualizar: atualizar };
})();
