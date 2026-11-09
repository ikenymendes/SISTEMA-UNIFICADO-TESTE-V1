/* =====================================================================
   USUÁRIOS (área exclusiva do administrador)
   Criar usuários, liberar cadastros, definir a função (inclui Financeiro),
   bloquear e redefinir senha. Fica no menu principal, fora do Comercial.
   (As assinaturas da contracapa continuam na aba "Assinaturas" do Comercial.)
   ===================================================================== */
var USUARIOS = (function () {
  var PAPEIS = [['admin', 'Administrador'], ['comercial', 'Comercial'], ['operacional', 'Operacional'], ['manutencao', 'Manutenção'], ['financeiro', 'Financeiro']];
  var ROTULO = { admin: 'Administrador', comercial: 'Comercial', operacional: 'Operacional', manutencao: 'Manutenção', financeiro: 'Financeiro', pendente: 'Pendente', bloqueado: 'Bloqueado' };
  var cli = null, euId = null, raiz = null, listaEl = null, pendEl = null, lista = [];

  function h(tag, attrs, filhos) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') el.className = attrs[k]; else if (k === 'text') el.textContent = attrs[k];
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), attrs[k]); else el.setAttribute(k, attrs[k]);
    });
    (filhos || []).forEach(function (f) { if (f) el.appendChild(f); });
    return el;
  }
  function msg(e) { return (e && (e.message || e.details)) || String(e); }
  function dataBR(s) { try { return new Date(s).toLocaleDateString('pt-BR'); } catch (e) { return '—'; } }
  function campo(rot, el) { return h('label', { class: 'uc' }, [h('span', { text: rot }), el]); }
  function senha(ph) {
    var i = h('input', { type: 'password', placeholder: ph, autocomplete: 'new-password' });
    var b = h('button', { type: 'button', class: 'olho', title: 'Mostrar ou ocultar', text: '👁', onclick: function () { i.type = i.type === 'password' ? 'text' : 'password'; } });
    return { input: i, el: h('div', { class: 'usr-pw' }, [i, b]) };
  }
  function acesso(email, s) { return 'Sistema Mega Mídia OOH\nSite: ' + location.href.split('#')[0].split('?')[0] + '\nE-mail: ' + email + '\nSenha: ' + s; }
  function copiar(t, btn) {
    var ok = function () { btn.textContent = 'Copiado ✓'; }, no = function () { btn.textContent = 'Não foi possível copiar'; };
    try { navigator.clipboard.writeText(t).then(ok, no); } catch (e) { no(); }
  }
  function aviso(el, txt, erro) { el.className = 'usr-st' + (erro ? ' err' : ''); el.textContent = txt || ''; }

  /* janela simples (mesma ideia do modal do Comercial) */
  function modal(titulo, corpo, botoes) {
    var fundo = h('div', { class: 'usr-modal' });
    function fechar() { if (fundo.parentNode) fundo.parentNode.removeChild(fundo); }
    var rodape = h('div', { class: 'usr-bar' }, botoes.map(function (f) { return f(fechar); }));
    fundo.appendChild(h('div', { class: 'usr-card' }, [h('h3', { text: titulo })].concat(corpo, [rodape])));
    fundo.addEventListener('click', function (e) { if (e.target === fundo) fechar(); });
    document.body.appendChild(fundo);
    return fechar;
  }

  function formNovo() {
    var nome = h('input', { type: 'text', placeholder: 'Nome', autocomplete: 'off' });
    var email = h('input', { type: 'email', placeholder: 'e-mail do usuário', autocomplete: 'off' });
    var sn = senha('Senha (mínimo 6 caracteres)');
    var papel = h('select', {}, PAPEIS.map(function (o) { return h('option', { value: o[0], text: o[1] }); }));
    papel.value = 'comercial';
    var st = h('p', { class: 'usr-st' }), btn = h('button', { class: 'usr-btn pri', type: 'button', text: 'Criar usuário' });
    btn.onclick = async function () {
      var em = email.value.trim().toLowerCase(), se = sn.input.value;
      if (!em || !se) return aviso(st, 'Preencha e-mail e senha.', true);
      if (se.length < 6) return aviso(st, 'A senha precisa ter pelo menos 6 caracteres.', true);
      if (papel.value === 'admin' && !window.confirm('Criar ' + em + ' como ADMINISTRADOR? Ele terá acesso a tudo.')) return;
      btn.disabled = true; aviso(st, 'Criando…');
      try {
        var r = await cli.rpc('admin_criar_usuario', { p_email: em, p_senha: se, p_nome: nome.value.trim(), p_papel: papel.value });
        if (r.error) throw r.error;
        var tx = acesso(em, se), rot = ROTULO[papel.value];
        nome.value = ''; email.value = ''; sn.input.value = ''; sn.input.type = 'password'; aviso(st, '');
        modal('Usuário criado', [
          h('p', { class: 'usr-dica', text: em + ' já pode entrar como ' + rot.toLowerCase() + '.' }),
          h('div', { class: 'usr-cred' }, [h('div', {}, [h('span', { text: 'E-mail' }), h('b', { text: em })]), h('div', {}, [h('span', { text: 'Senha' }), h('b', { text: '••••••••' })])]),
          h('p', { class: 'usr-dica', text: 'A senha fica oculta. Copie o acesso e envie à pessoa. Depois de fechar esta janela ela não aparece mais.' })
        ], [
          function () { return h('button', { class: 'usr-btn pri', type: 'button', text: 'Copiar acesso', onclick: function (e) { copiar(tx, e.target); } }); },
          function (f) { return h('button', { class: 'usr-btn', type: 'button', text: 'Fechar', onclick: f }); }
        ]);
        carregar();
      } catch (e) { aviso(st, msg(e), true); }
      btn.disabled = false;
    };
    return h('section', { class: 'usr-caixa' }, [
      h('h2', { text: 'Criar usuário' }),
      h('p', { class: 'usr-dica', text: 'Defina e-mail e senha e passe o acesso à pessoa. Ela já entra liberada, sem confirmar e-mail.' }),
      h('div', { class: 'usr-grade' }, [campo('Nome', nome), campo('E-mail', email), campo('Senha', sn.el), campo('Função', papel)]),
      h('div', { class: 'usr-bar' }, [btn]), st
    ]);
  }

  async function mudar(u, novo, sel) {
    if (u.papel === 'admin' && novo !== 'admin' && !window.confirm('Remover o acesso de administrador de ' + u.email + '?')) { if (sel) sel.value = u.papel; return; }
    try {
      var r = await cli.from('profiles').update({ papel: novo }).eq('id', u.id);
      if (r.error) throw r.error;
      u.papel = novo; desenhar();
    } catch (e) { window.alert('Não foi possível salvar: ' + msg(e)); carregar(); }
  }

  function redefinir(u) {
    var sn = senha('Nova senha (mínimo 6 caracteres)'), er = h('p', { class: 'usr-st' });
    modal('Redefinir senha', [h('p', { class: 'usr-dica', text: u.email }), campo('Nova senha', sn.el), er], [
      function (f) {
        return h('button', { class: 'usr-btn pri', type: 'button', text: 'Salvar nova senha', onclick: async function (e) {
          var b = e.target; if (sn.input.value.length < 6) return aviso(er, 'Mínimo de 6 caracteres.', true);
          b.disabled = true;
          try {
            var r = await cli.rpc('admin_redefinir_senha', { p_id: u.id, p_senha: sn.input.value });
            if (r.error) throw r.error;
            var tx = acesso(u.email, sn.input.value); f();
            try { navigator.clipboard.writeText(tx); } catch (x) {}
            window.alert('Senha de ' + u.email + ' atualizada. O acesso foi copiado para você enviar.');
          } catch (x) { aviso(er, msg(x), true); b.disabled = false; }
        } });
      },
      function (f) { return h('button', { class: 'usr-btn', type: 'button', text: 'Cancelar', onclick: f }); }
    ]);
  }

  function desenhar() {
    pendEl.innerHTML = ''; listaEl.innerHTML = '';
    var ps = lista.filter(function (u) { return u.papel === 'pendente'; });
    if (!ps.length) pendEl.appendChild(h('p', { class: 'usr-dica', text: 'Nenhuma solicitação pendente.' }));
    ps.forEach(function (u) {
      pendEl.appendChild(h('div', { class: 'usr-pend' }, [
        h('span', { class: 'quem', text: u.email + (u.nome && u.nome !== u.email.split('@')[0] ? ' · ' + u.nome : '') }),
        h('div', { class: 'usr-acoes' }, PAPEIS.map(function (p) { return h('button', { class: 'usr-btn peq', type: 'button', text: 'Liberar como ' + p[1].toLowerCase(), onclick: function () { mudar(u, p[0]); } }); })
          .concat([h('button', { class: 'usr-btn peq perigo', type: 'button', text: 'Bloquear', onclick: function () { mudar(u, 'bloqueado'); } })]))
      ]));
    });
    lista.forEach(function (u) {
      var eu = u.id === euId;
      var sel = h('select', {}, PAPEIS.concat([['pendente', 'Pendente'], ['bloqueado', 'Bloqueado']]).map(function (o) { return h('option', { value: o[0], text: o[1] }); }));
      sel.value = u.papel;
      if (eu) { sel.disabled = true; sel.title = 'Você não pode alterar a própria função.'; }
      sel.addEventListener('change', function () { mudar(u, sel.value, sel); });
      listaEl.appendChild(h('div', { class: 'usr-linha' + (u.papel === 'bloqueado' ? ' bloq' : '') }, [
        h('div', { class: 'quem' }, [h('b', { text: (u.nome || u.email.split('@')[0]) + (eu ? ' (você)' : '') }), h('span', { text: u.email }), h('small', { text: 'Cadastro em ' + dataBR(u.criado_em) })]),
        h('div', { class: 'func' }, [h('span', { class: 'etq papel-' + u.papel, text: ROTULO[u.papel] || u.papel }), sel]),
        h('button', { class: 'usr-btn peq', type: 'button', text: 'Redefinir senha', onclick: function () { redefinir(u); } })
      ]));
    });
  }

  async function carregar() {
    try {
      var r = await cli.from('profiles').select('*').order('criado_em', { ascending: true });
      if (r.error) throw r.error;
      lista = r.data || []; desenhar();
    } catch (e) { listaEl.innerHTML = ''; listaEl.appendChild(h('p', { class: 'usr-st err', text: 'Não foi possível carregar: ' + msg(e) })); }
  }

  function tela(client, meuId) {
    cli = client; euId = meuId;
    pendEl = h('div', { class: 'usr-pendentes' }); listaEl = h('div', { class: 'usr-lista' });
    raiz = h('div', { class: 'conteudo usr' }, [
      h('h1', { text: 'Usuários' }),
      h('p', { class: 'sub', text: 'Quem entra no sistema e o que cada um pode ver.' }),
      formNovo(),
      h('section', { class: 'usr-caixa' }, [h('h2', { text: 'Aguardando liberação' }), pendEl]),
      h('section', { class: 'usr-caixa' }, [h('h2', { text: 'Todos os usuários' }),
        h('p', { class: 'usr-dica', text: 'Administrador vê tudo. Comercial vê só o Comercial. Operacional vê só a Gestão Operacional. Manutenção vê só os chamados de manutenção. Financeiro vê só os faturamentos. Bloqueado não entra.' }),
        listaEl])
    ]);
    carregar();
    return raiz;
  }
  return { tela: tela, atualizar: function () { if (cli) carregar(); } };
})();
