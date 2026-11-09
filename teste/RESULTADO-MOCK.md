# Resultado do teste do mock (mock-supabase.js)

Executado em 2026-11-09T00:40:30.927Z com Chromium (Playwright) servindo a raiz do repositório.

**108/108 verificações passaram.**


### A login

- ✅ admin@teste.com entra
- ✅ comercial@teste.com entra
- ✅ operacional@teste.com entra
- ✅ manutencao@teste.com entra
- ✅ senha errada é recusada
- ✅ getUser devolve o e-mail
- ✅ JWT tem 3 partes e sub
- ✅ refresh_token renova a sessão
- ✅ refresh inválido → 400
- ✅ signUp fora do domínio é barrado
- ✅ signUp no domínio permitido cria sessão
- ✅ novo cadastro nasce como pendente

### B leitura

- ✅ adm lê profiles: 5 linhas
- ✅ adm lê config: 1 linhas
- ✅ adm lê pontos: 137 linhas
- ✅ adm lê sugestoes: 4 linhas
- ✅ adm lê propostas: 7 linhas
- ✅ adm lê registros: 52 linhas
- ✅ com lê profiles: 1 linhas
- ✅ com lê config: 1 linhas
- ✅ com lê pontos: 137 linhas
- ✅ com lê sugestoes: 4 linhas
- ✅ com lê propostas: 5 linhas
- ✅ com lê registros: 0 linhas
- ✅ op lê profiles: 1 linhas
- ✅ op lê config: 0 linhas
- ✅ op lê pontos: 0 linhas
- ✅ op lê sugestoes: 0 linhas
- ✅ op lê propostas: 0 linhas
- ✅ op lê registros: 52 linhas
- ✅ man lê profiles: 1 linhas
- ✅ man lê config: 0 linhas
- ✅ man lê pontos: 0 linhas
- ✅ man lê sugestoes: 0 linhas
- ✅ man lê propostas: 0 linhas
- ✅ man lê registros: 52 linhas
- ✅ anônimo não lê registros (401)

### C escrita

- ✅ comercial cria sugestão (autor preenchido)
- ✅ comercial não cria sugestão já aprovada (403)
- ✅ comercial não altera sugestão (0 linhas)
- ✅ comercial não grava ponto (403)
- ✅ comercial não apaga ponto (0 linhas)
- ✅ comercial grava proposta (com bv)
- ✅ coluna desconhecida → PGRST204
- ✅ check de formato → 23514
- ✅ proposta não é reescrita (histórico imutável)
- ✅ comercial não grava registro operacional (403)
- ✅ admin grava config (upsert)
- ✅ comercial lê config alterada pelo admin

### D rpc gravar

- ✅ operacional cria VT novo
- ✅ operacional atualiza VT (u maior)
- ✅ u antigo → "antigo"
- ✅ operacional NÃO altera ponto fixo → negado
- ✅ operacional NÃO cria ponto fixo → negado
- ✅ operacional NÃO altera cfg → negado
- ✅ operacional NÃO altera ponto variável → negado
- ✅ operacional CRIA ponto variável novo
- ✅ manutenção altera mn e é negada em vt
- ✅ comercial → tudo negado
- ✅ admin altera ponto fixo
- ✅ pull por rev=gt.N&order=rev.asc traz só os novos, em ordem
- ✅ chave=in.("a","b") (cloudRevert)
- ✅ limit=1

### E filtros

- ✅ order desc + limit
- ✅ range(10,14) → 5 linhas a partir de ord 11
- ✅ count exact + head
- ✅ count pendentes = 2
- ✅ in()
- ✅ maybeSingle com 1 linha
- ✅ maybeSingle com 0 linhas → null sem erro
- ✅ single()
- ✅ propostas ordenadas por criado_em desc (listarPropostas)
- ✅ upsert em lote (insere + atualiza)
- ✅ delete().in()
- ✅ admin muda papel de usuário (update+select)
- ✅ protege o último admin
- ✅ comercial não se promove a admin (0 linhas)
- ✅ alias perfis: operacional aparece como "operador"
- ✅ alias perfis: PATCH "operador" grava "operacional"
- ✅ alias perfis: lista de usuários (cloudUsers)

### F rpc

- ✅ admin cria usuário operacional
- ✅ usuário criado consegue entrar
- ✅ e já nasce com o papel certo
- ✅ comercial NÃO cria usuário
- ✅ papel inválido é recusado
- ✅ e-mail duplicado é recusado
- ✅ admin redefine senha
- ✅ aprovar "adicionar" cria ponto novo (138)
- ✅ aprovar "alterar" edita o ponto (com payload ajustado)
- ✅ resolver de novo → "já foi resolvida"
- ✅ comercial NÃO resolve sugestão
- ✅ comercial vê o novo status das suas sugestões

### G storage

- ✅ comercial sobe foto em sugestoes/<seu-id>/
- ✅ comercial NÃO sobe em pontos/
- ✅ admin sobe em pontos/
- ✅ duplicado sem upsert é recusado
- ✅ URL pública responde 200 image/jpeg via fetch
- ✅ <img> com URL pública é reescrita para data:
- ✅ <img> inexistente vira quadro cinza (innerHTML)

### H funções

- ✅ players-status: admin 200 com lista
- ✅ players-status: operacional 403
- ✅ função desconhecida → 404

### I realtime

- ✅ admin recebe INSERT de sugestão feita pelo comercial
- ✅ comercial recebe a própria sugestão (RLS permite)
- ✅ operacional NÃO recebe eventos de sugestões (RLS)

### J reset

- ✅ reset volta aos dados de fábrica

### I realtime

- ✅ evento criado em OUTRA aba chega à aba do admin (BroadcastChannel)
- ✅ estado compartilhado por localStorage entre abas

### Mensagens de console (warning/error)

- `warning: Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same`
- `warning: Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same`
- `warning: Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same`
- `warning: Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same`
- `warning: Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same`
- `warning: Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same`
- `warning: Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same`
- `warning: Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same`
- `warning: Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same`
- `warning: Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same`
- `warning: Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same`
- `warning: Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same`
- `warning: Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same`
- `warning: Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same`
- `warning: Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same`

## Teste de fumaça com os módulos reais (fora da suíte acima)

Páginas temporárias (não ficam no repositório) com `<script src="teste/teste.js">` no lugar do `config.js`:

- **Operacional** (código atual, ainda com `perfis`/`operador`): login pela tela do próprio módulo com admin@, operacional@ e manutencao@ → entrou, mostrou "● nuvem sincronizada", dashboard com os 3 VTs em andamento / fotos / manutenções, e a tela própria do usuário de Manutenção. Zero erros de console. Funciona graças ao alias `perfis` do mock.
- **Comercial** (arquivos de `modulos/comercial` + o `index.html` antigo da PARTE1): login com admin@ e comercial@ → entrou, carregou os 137 pontos e o kit. Único erro de console: `Cannot set properties of null (setting 'onclick')` porque o `index.html` antigo da PARTE1 não tem o `#menu` que o `app.js` da atualização 35 espera (é do HTML, não do mock; o `index.html` do módulo precisa ter `#menu` e `#bnav`).

## Como usar o ambiente de testes

1. Em TODA página (casca e página de cada módulo/iframe), antes dos outros scripts: `<script src="…/teste/teste.js"></script>` (ele carrega config-teste.js, dados-teste.js e mock-supabase.js na ordem certa e define `MEGA_CONFIG`, `MVT_CLOUD` e `MEGAKIT_CONFIG`). Em produção, troque essa linha pelo `config.js` real.
2. Usuários (senha `teste123`): admin@teste.com · comercial@teste.com · operacional@teste.com · manutencao@teste.com
3. No console do navegador: `MEGA_TESTE.reset()` restaura os dados de fábrica; `MEGA_TESTE.db()` mostra o banco; `MEGA_TESTE.usuarios()` lista os logins.
4. Rodar a suíte de novo: servir a raiz do repositório com `python3 -m http.server 8765` e executar `node teste/_testar-mock.js` (precisa do Playwright).

## Limites conhecidos

- Respostas de RLS seguem o Postgres real: SELECT sem permissão devolve lista vazia (não 403); UPDATE/DELETE sem permissão afetam 0 linhas (200/204); INSERT proibido → 403 `42501`; usuário anônimo → 401.
- `<img src="https://teste.supabase.co/storage/…">` é reescrito por MutationObserver (img criada antes do mock carregar ou em CSS `background-image` não é reescrita). Fotos enviadas ficam em localStorage (limite ~5 MB do navegador; se estourar, ficam só na aba).
- Realtime entrega `postgres_changes` entre abas/iframes por BroadcastChannel; não simula presença/broadcast.
- Schema: segui as regras descritas (profiles único; comercial = admin+comercial; operacional = admin+operacional+manutenção). Se o `01-schema-unificado.sql` do fork A divergir (ex.: comercial vê `registros`?), ajustar `POLITICAS` no topo do mock.
- A coluna `ativo=false` bloqueia o perfil como no SQL; o mock não implementa `pendente`/`bloqueado` além de "sem papel ativo → sem acesso".
- `modulos/comercial/js/vendor/supabase.js` NÃO está no repositório (a cópia inicial só trouxe jspdf e pptxgen). Há uma cópia em `teste/_supabase.vendor.js` só para o smoke; copie o original de `ATUALIZAÇÕES/PARTE1-codigo/js/vendor/supabase.js` para `modulos/comercial/js/vendor/`.
