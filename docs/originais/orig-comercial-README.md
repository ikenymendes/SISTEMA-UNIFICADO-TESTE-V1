# Gerador de Mídia Kit · Mega Mídia OOH (versão com usuários)

Site estático (hospedado no **GitHub Pages**) + banco e login no **Supabase**.

## O que ele faz

| Perfil | Pode |
|---|---|
| **Administrador** | Tudo: editar pontos, textos e preços base · decidir sugestões · ver o **Dashboard** · ver o **backup de todas as propostas** · liberar/bloquear usuários |
| **Comercial** | Marcar pontos, ajustar preços **só na própria tela**, gerar proposta e mídia kit (PPTX/PDF) · **sugerir** adicionar ou alterar ponto (não altera endereço direto) · ver as próprias sugestões e propostas |
| **Pendente** | Acabou de se cadastrar: espera o administrador liberar |
| **Bloqueado** | Sem acesso |

**Sugestões:** o comercial preenche o formulário → o admin recebe aviso (sino 🔔 no topo, contador na aba *Sugestões*, aviso na tela em tempo real e, se você ativar o passo 6, **e-mail**) → vê o *antes × depois* → **Aprova** (entra no cadastro na hora), **Edita e aprova** ou **Recusa** (com motivo). Quem sugeriu é avisado da decisão.

**Backup das propostas:** toda vez que alguém gera PPTX ou PDF, o sistema grava os **locais incluídos** e os **valores praticados** (tabela, desconto, negociado, final, bruto/líquido, comissão) — **sem fotos**. O histórico não pode ser editado nem apagado por ninguém. O admin exporta em JSON ou CSV (locais e valores) na aba *Propostas*.

**Dashboard (admin):** propostas geradas e variação contra o período anterior, valor negociado, ticket médio, ranking de quem mais gera (🏆), propostas por dia/semana, PPTX × PDF, formatos e pontos mais ofertados, clientes, sugestões por usuário e resumo por usuário.

## Estrutura

```
index.html            página única
css/app.css           visual
js/config.js          >>> você cola aqui a URL e a chave do Supabase <<<
js/store.js           tudo que conversa com o Supabase
js/auth.js            login, cadastro, espera de liberação
js/sync.js            carregar/salvar pontos e configuração
js/app.js             abas, avisos em tempo real
js/suggestions.js     sugestões (comercial) e caixa de decisão (admin)
js/history.js         backup das propostas e histórico/exportação
js/dashboard.js       dashboard do admin
js/users.js           usuários
js/engine.js, data.js, ui.js   motor das páginas do kit e telas (vindos da versão de 07/11 09h47)
js/vendor/            bibliotecas (Supabase, PptxGenJS, jsPDF) — não precisa mexer
assets/               logos, fontes Poppins e 141 fotos da biblioteca
supabase/schema.sql   tabelas + regras de segurança (rodar 1x)
supabase/seed.sql     carga dos 137 pontos e da configuração atuais (rodar 1x)
supabase/functions/notify-suggestion/   e-mail de aviso (opcional)
```

## Passo a passo

### 1. Criar o projeto no Supabase (grátis)
1. Entre em https://supabase.com → **New project** (anote a senha do banco; escolha a região *South America (São Paulo)*).
2. **Authentication → Providers → Email**: deixe ligado. Para o **teste**, desligue **Confirm email** (assim ninguém precisa clicar em link). Em produção, deixe ligado.

### 2. Criar as tabelas e regras
1. **SQL Editor → New query**, cole **todo** o `supabase/schema.sql` → **Run**.
2. Nova query, cole **todo** o `supabase/seed.sql` → **Run** (carrega os 137 pontos).
3. Só o e-mail `operacional@megamidiaooh.com.br` nasce como administrador; qualquer outro cadastro entra como *pendente*. Para trocar/adicionar, edite a tabela `admins_iniciais` **antes** do cadastro. Para testar com outros e-mails (ex.: gmail), libere o domínio descomentando a linha indicada no início do `schema.sql`.

### 3. Ligar o site ao Supabase
Em **Project Settings → API** copie **Project URL** e **anon public key** e cole em `js/config.js`.
(A chave *anon* pode ficar pública no GitHub: quem protege os dados são as regras do `schema.sql`. **Nunca** use a *service_role* aqui.)

### 4. Publicar no GitHub Pages
1. Crie um repositório (ex.: `gerador-midia-kit`) e envie **todos** os arquivos desta pasta.
2. **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root**.
3. Em ~1 minuto o site abre em `https://SEU-USUARIO.github.io/gerador-midia-kit/`.
4. No Supabase: **Authentication → URL Configuration → Site URL** = esse endereço.

### 5. Primeiro acesso
1. Abra o site → **Primeiro acesso? Solicitar cadastro** com `operacional@megamidiaooh.com.br` → você já entra como **administrador**.
2. Peça aos comerciais para se cadastrarem; eles aparecem em **Usuários → Aguardando liberação** → **Liberar como comercial**.

### 6. (Opcional) Aviso por e-mail ao admin
O sino e o contador já funcionam sem isso. Para e-mail:
1. Conta grátis em https://resend.com → crie uma API key.
2. Instale a CLI do Supabase (`npm i -g supabase`), `supabase login`, `supabase link --project-ref SEU_REF`.
3. `supabase secrets set RESEND_API_KEY=... FROM_EMAIL="Gerador Mega <avisos@seudominio.com.br>" SITE_URL=https://SEU-USUARIO.github.io/gerador-midia-kit/ WEBHOOK_SECRET=umtextoqualquer`
4. `supabase functions deploy notify-suggestion --no-verify-jwt`
5. No painel: **Database → Webhooks → Create**: tabela `sugestoes`, evento **Insert**, tipo *Supabase Edge Functions* → `notify-suggestion`, cabeçalho `x-webhook-secret` = o mesmo texto.
*(Sem domínio verificado no Resend, ele só envia para o e-mail da própria conta Resend. Serve para testar.)*

## Observações importantes
- **Fotos novas** vão para o Storage do Supabase (bucket `fotos`). As 141 fotos atuais ficam em `assets/lib` e continuam funcionando.
- **Mapas** nas páginas vêm da Esri/OpenStreetMap: precisa de internet na hora de gerar.
- **Backups do banco:** o plano grátis do Supabase **não** inclui backup automático. Use o botão *Backup completo (JSON)* da aba *Propostas* de vez em quando, e/ou o plano Pro.
- **Pontos têm "foto" por nome** (`o006.jpg` etc.): se você apagar arquivos de `assets/lib`, os pontos ficam sem foto.
- Projeto grátis do Supabase **pausa após 7 dias sem uso**; basta clicar em *Restore* no painel.
- Feito e testado com um banco simulado (login, permissões, sugestões, aprovação, geração de PPTX com backup, dashboard). **Não foi testado contra um Supabase real**: se algo falhar no primeiro acesso, a mensagem de erro aparece na tela; me envie o texto.
