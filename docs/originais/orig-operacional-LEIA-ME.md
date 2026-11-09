# Matriz VT na nuvem (GitHub Pages + Supabase)

Este pacote coloca o seu sistema na internet, com **login e senha**, no endereço
`https://SEU-USUARIO.github.io/matriz-vt/`.

## Como funciona (em 30 segundos)

| Peça | Para que serve | Custo |
|---|---|---|
| **GitHub Pages** | Hospeda a página (`index.html`). | Grátis (repositório público) |
| **Supabase** | Guarda os dados e faz o login/senha. | Grátis para este tamanho |

- O GitHub Pages só entrega a página; **ele não guarda senha nem dados**. Por isso o login e os dados ficam no Supabase.
- O código da página fica visível (repositório público), mas **os dados só aparecem para quem tem login**. Nenhum dado seu vai para o GitHub.
- Dois papéis:
  - **Admin**: faz tudo, inclusive alterar/apagar pontos (endereços fixos e variáveis), configurações e usuários.
  - **Operador**: faz tudo no sistema (VTs, rotas, fotos, checking, faturamento, manutenção, eventos, estáticos), **menos alterar ou apagar pontos** e mexer em configurações. Operador pode **cadastrar** um ponto variável novo ao criar um VT; depois, só o admin edita ou apaga.
  - Essas regras são aplicadas **no banco de dados**, não só escondidas na tela. Mesmo alguém que mexa no código do navegador não consegue burlar.

## Arquivos deste pacote

```
index.html                       o sistema (é o matriz-vt-v9.html com o modo nuvem)
config.js                        onde você cola a URL e a chave do Supabase
.nojekyll                        faz o GitHub Pages servir os arquivos como estão
supabase/schema.sql              cria as tabelas e as permissões no Supabase
supabase/functions/players-status/index.ts   função da Verificação de players (ver seção própria)
workflow-backup/backup-privado.yml     backup diário opcional (passo 11, item 3)
LEIA-ME.md                       este guia
```

---

## Passo a passo

### 1) Criar o projeto no Supabase
1. Entre em **https://supabase.com** → *Start your project* → entre com e-mail ou GitHub.
2. **New project**. Nome: `matriz-vt`. Região: **South America (São Paulo)**. Crie uma senha do banco e **guarde-a**.
3. Espere uns 2 minutos até o projeto ficar pronto.

### 2) Criar as tabelas e as permissões
1. No menu da esquerda: **SQL Editor** → **New query**.
2. Abra o arquivo `supabase/schema.sql` no Bloco de Notas, copie **tudo** e cole no editor.
3. Clique em **Run**. Deve aparecer *Success. No rows returned*. (Pode rodar de novo sem problema.)

### 3) Fechar o cadastro público
Para que **só o admin crie usuários**:
1. **Authentication** → **Sign In / Providers** (ou *Providers*) → **Email**.
2. Desligue **Allow new users to sign up** (Permitir novos cadastros). Salve.
3. (Opcional, mais simples) Desligue também **Confirm email**.

### 4) Criar os usuários
1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Informe e-mail e senha e marque **Auto Confirm User**. Clique em *Create user*.
3. **O primeiro usuário criado vira ADMIN automaticamente** (crie o seu primeiro). Os próximos entram como **Operador**.
4. Para promover alguém a admin, ou bloquear um usuário, depois use o sistema: **Admin → Usuários**.

### 5) Copiar a URL e a chave
1. **Project Settings** (engrenagem) → **API** (ou *Data API / API Keys*).
2. Copie a **Project URL** (algo como `https://abcdefgh.supabase.co`).
3. Copie a chave **anon public** (às vezes chamada *publishable key*). Ela é longa.
4. **Nunca use a chave `service_role` na página.** Essa é secreta.

### 6) Preencher o config.js
Abra `config.js` no Bloco de Notas e cole os dois valores entre aspas:

```js
window.MVT_CLOUD = {
  url:  "https://abcdefgh.supabase.co",
  anon: "eyJhbGciOi... (a chave anon, inteira)"
};
```
A chave `anon` pode ficar pública: sem login, o banco não entrega nada.

### 7) Subir para o GitHub
1. Crie uma conta em **https://github.com** (se ainda não tiver).
2. **New repository** → nome `matriz-vt` → **Public** → *Create repository*.
   (Páginas grátis só funcionam em repositório público.)
3. Na página do repositório: **uploading an existing file** (ou *Add file → Upload files*).
4. Arraste `index.html`, `config.js`, `.nojekyll`, `LEIA-ME.md` e a pasta `supabase` e clique **Commit changes**. (A pasta `workflow-backup` só é usada no backup opcional do passo 11.)
   - Se o navegador não mostrar o arquivo `.nojekyll` (começa com ponto), use *Add file → Create new file*, digite o nome `.nojekyll` e confirme.

### 8) Ligar o GitHub Pages
1. No repositório: **Settings** → **Pages**.
2. *Source*: **Deploy from a branch**. *Branch*: **main** e pasta **/ (root)** → **Save**.
3. Em 1 a 2 minutos aparece o endereço: `https://SEU-USUARIO.github.io/matriz-vt/`.

### 9) Primeiro acesso e envio dos seus dados
1. Abra o endereço e entre com o e-mail e a senha do admin.
2. Para subir os dados que você já tem: **Admin → Dados e planilha → Importar backup** e escolha o seu `matriz-vt-auto.json` mais recente. Os dados sobem sozinhos para a nuvem.
3. Confira no topo da tela: **● nuvem sincronizada** com o horário.
4. Entre em outro navegador (ou aba anônima) com um **operador** e veja os mesmos dados.

### 10) Teste rápido (10 minutos)
- [ ] Operador entra e vê os dados; em **Admin** só aparecem *Status dos VTs* e *Manutenções*.
- [ ] Operador cria um VT, marca foto, faz checking, marca faturamento: o admin vê em até 5 segundos.
- [ ] Operador cria um VT novo com um endereço novo (ponto variável): funciona. Depois ele não consegue editar nem apagar esse ponto; o admin consegue.
- [ ] Operador gera a mensagem de manutenção para o WhatsApp.
- [ ] Admin cria um usuário novo no Supabase e ele entra.
- [ ] Admin desmarca *ativo* de um usuário em **Admin → Usuários**: em até 30 segundos esse usuário é desconectado.

### 11) Backup (várias camadas)
1. **Pasta do Drive (automático, como antes).** No computador do admin, abra o sistema, vá em **Admin → Dados e planilha → Backup automático em pasta** e escolha a pasta do Drive. Enquanto o sistema estiver aberto, ele grava `matriz-vt-auto.json` (formato organizado e indentado) e `matriz-vt-fechamento.json` ao fechar.
2. **Exportar backup** (Admin → Dados e planilha): baixa um arquivo na hora. Faça antes de mudanças grandes.
3. **Backup diário automático para um repositório privado (opcional).**
   1. Crie outro repositório no GitHub, **Private**, chamado `matriz-vt-backup`.
   2. Em *GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens*: crie um token só com acesso a `matriz-vt-backup` e permissão **Contents: Read and write**.
   3. No repositório `matriz-vt` → **Settings → Secrets and variables → Actions → New repository secret**. Crie 4:
      - `SUPABASE_URL`: a Project URL
      - `SUPABASE_SERVICE_KEY`: a chave **service_role** (Supabase → Project Settings → API). Fica guardada como segredo e **nunca** vai para a página.
      - `BACKUP_REPO`: `seuusuario/matriz-vt-backup`
      - `BACKUP_TOKEN`: o token do passo anterior
   4. No repositório `matriz-vt`: *Add file → Create new file*. No nome, digite `.github/workflows/backup-privado.yml` (as barras criam as pastas). Cole o conteúdo do arquivo `workflow-backup/backup-privado.yml` e confirme.
   5. Aba **Actions** → *Backup diário da nuvem* → **Run workflow** para testar. Depois ele roda todo dia às 5h.
   - Este item eu testei só na parte de baixar os dados (inclusive com mais de 1.000 registros); a parte de gravar no repositório privado só dá para validar na sua conta, na primeira execução.
   - Não use "artefatos" do Actions em repositório público: qualquer pessoa logada no GitHub consegue baixar. Por isso o backup vai para um repositório privado.
4. **Supabase Pro** (pago) tem backups diários próprios. No plano grátis, use as opções acima.

**Como restaurar:** Admin → Dados e planilha → **Importar backup**. Aceita o `matriz-vt-auto.json`, o arquivo exportado e também o `matriz-vt-AAAA-MM-DD.json` do backup diário. Os dados importados sobem para a nuvem.

### 12) Atualizar o sistema depois
No repositório: **Add file → Upload files** e envie o novo `index.html` (sobrescreve). Em 1 a 2 minutos o endereço já mostra a versão nova; peça para a equipe apertar **Ctrl + F5**. Seu `config.js` não muda.

---

## Usuário de Manutenção (ex.: Eldriano)
Quem faz a manutenção ganha uma **tela própria**, pensada para o celular, só com os chamados.
1. No Supabase: **Authentication → Users → Add user** (e-mail e senha, marque *Auto Confirm User*).
2. No sistema, como admin: **Admin → Usuários**. Coloque o nome (ex.: `ELDRIANO - Manutenção`), escolha o papel **Manutenção** e clique em **Salvar**.
3. **Se você já tinha rodado o `schema.sql` antes desta versão**, rode-o de novo (SQL Editor → New query → colar → Run). Pode rodar quantas vezes quiser; ele só acrescenta o papel novo.

O que ele vê e faz:
- Ao entrar, aparece uma saudação com o nome, a data, a hora e a quantidade de chamados (para ir, aguardando verificação do motoboy e atrasados).
- Painel com contadores, filtros (Para ir, Confirmados pelo motoboy, Atrasados, Aguardando motoboy, Todos) e agrupamento por prioridade ou por região.
- Em cada chamado: ponto, endereço, defeito, o que o **motoboy verificou no local**, prazo, botão **Abrir no mapa**, **Iniciar atendimento**, **Concluir** (com observação opcional) e **Pendência** (anota o que falta). Há também um botão que monta a rota no Google Maps.
- Ele não vê menus de VT, rotas, faturamento etc., e o banco **recusa** qualquer alteração fora dos chamados de manutenção.
- O admin e os operadores continuam podendo marcar **Manutenção feita** na aba Manutenção, e veem quem concluiu, a solução e as pendências.

## Verificação de players (4YouSee)
A aba **Verificação de players** mostra quais players estão fora do ar: 🔴 vermelho = fora do ar há mais tempo, 🔵 azul = fora do ar há pouco tempo, 🟢 verde = online. Quem aparece primeiro é o que está há mais tempo sem contato. Se o nome do player combinar com um ponto do sistema, aparece 📍 com o nome do ponto. Os limites são ajustáveis na própria tela (padrão: verde até 30 min, vermelho a partir de 24 h).

**Segurança:** o e-mail e a senha do 4YouSee **não entram no código da página, nem no GitHub**. A consulta é feita por uma função dentro do Supabase, que guarda um *token* do 4YouSee em um cofre (Secrets). A função só responde a quem está logado no sistema como admin ou operador (o usuário de Manutenção não tem acesso). O token pode ser apagado a qualquer momento no 4YouSee.

Para ativar (uns 10 minutos):
1. **Token no 4YouSee:** entre no painel do 4YouSee → **Configurações → Integrações → Adicionar**. Dê o nome `Matriz VT` e confirme. Copie o token que aparece e não o compartilhe com ninguém.
2. **Instalar a função no Supabase:** **Edge Functions → Deploy a new function → Via Editor**. Nome: `players-status`. Apague o texto de exemplo, cole todo o conteúdo do arquivo `supabase/functions/players-status/index.ts` e clique em **Deploy**.
3. **Guardar o token:** **Edge Functions → Secrets → Add new secret**. Nome: `FOURYOUSEE_TOKEN`. Valor: o token do passo 1. Salve.
4. **Atualizar a página:** envie o novo `index.html` para o GitHub (passo 12) e abra a aba **Verificação de players**. Compare o total mostrado com o total do 4YouSee.

Se algo der errado:
- “função ainda não foi instalada”: refaça o passo 2 (o nome precisa ser exatamente `players-status`).
- “FOURYOUSEE_TOKEN não configurado”: refaça o passo 3.
- “O 4YouSee recusou o token”: gere outro token no passo 1 e atualize o Secret.
- Erro 401 / “Invalid JWT”: nas configurações da função, desligue *Verify JWT* e faça Deploy de novo (a função confere o login sozinha).
- Total diferente do 4YouSee: me avise, que eu ajusto a leitura.

## Usar no Drive em vez da nuvem
Continua funcionando. Abra o `index.html` direto da pasta do Drive **sem o arquivo `config.js` ao lado** (apague ou renomeie). Sem esse arquivo, o sistema roda no modo local/Drive de antes, sem login.

## Cuidados
- **Repositório público:** o código da página fica visível, os dados não. Não coloque backups nem planilhas no repositório.
- **Plano grátis do Supabase** pausa o projeto após cerca de 7 dias sem nenhum acesso. É só entrar no painel do Supabase e clicar em *Restore*. Usando o sistema todo dia, isso não acontece.
- **Sair do sistema** apaga a cópia local naquele navegador (os dados continuam na nuvem). Se houver algo sem enviar, o sistema avisa antes.
- **Sem internet:** o sistema mostra o aviso no topo e envia sozinho quando a conexão voltar.
- Para proteger também os **estáticos** (ou outros tipos) de alteração por operadores, no `schema.sql` acrescente `'es'` nas duas listas `('fx','vr','cfg')` das políticas *reg_alterar* e rode de novo.

## Problemas comuns
| Sintoma | O que fazer |
|---|---|
| Abre sem tela de login | O `config.js` não está ao lado do `index.html` ou está com a URL/chave erradas. Aparece um aviso em amarelo se estiver preenchido errado. |
| "E-mail ou senha incorretos" | Confira o usuário em Authentication → Users. Redefina a senha ali. |
| "Seu usuário ainda não tem perfil" | O usuário foi criado antes de rodar o `schema.sql`. Rode o SQL e crie o usuário de novo. |
| Operador vê "Sem permissão para alterar…" | É esperado: ele tentou alterar um ponto ou configuração. Peça ao admin. |
| Página antiga depois de atualizar | Ctrl + F5. |
