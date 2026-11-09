# Sistema Mega · Comercial + Operacional em um só lugar

Um endereço, um login, um banco de dados e um backup para os dois sistemas.
Cada pessoa entra e vê **só a parte dela**, de acordo com o perfil.

| Perfil | O que vê | O que o banco permite |
|---|---|---|
| **Administrador** | Barra no topo: **Comercial · Operacional · Usuários · Backup** | Tudo |
| **Comercial** | Só o sistema Comercial, em tela cheia | Pontos (leitura), próprias sugestões e propostas |
| **Operacional** | Só a Gestão Operacional, em tela cheia | VTs, rotas, fotos, checking, manutenção. Não altera pontos fixos/variáveis nem configurações |
| **Manutenção** | A tela de chamados (celular) | Só os chamados de manutenção |
| Pendente / Bloqueado | Aviso de acesso negado | Nada |

> **Segurança de verdade:** esconder a tela não basta. Quem barra o acesso aos dados é o **banco**
> (`supabase/01-schema-unificado.sql`). Um comercial não consegue ler dados operacionais nem se
> alterar o código no navegador, e o contrário também vale.

---

## 1. Como o código está organizado (para manutenção futura)

```
index.html              a casca: tela de login única
config.js               URL e chave do Supabase (único lugar)
core/
  permissoes.js         QUEM VÊ O QUÊ (perfis, módulos, áreas)  ← mexa aqui para mudar acessos
  casca.js              login, interface de cada perfil, ponte com os módulos
  casca.css             visual da casca
  backup.js             tela de Backup do administrador
  vendor/supabase.js    biblioteca do Supabase (compartilhada)
modulos/
  comercial/            o sistema Comercial (versão "Atualização 35"), sem mudanças de lógica
    index.html  css/  js/  assets/
  operacional/          a Gestão Operacional (versão matriz-vt-v9 + nuvem)
    index.html  css/app.css  assets/  gerador-checking.html
    js/01-base.js … 13-iniciar.js   o código antigo (um arquivo de 5 mil linhas) dividido por assunto e indentado
supabase/
  01-schema-unificado.sql   tabelas + regras de segurança dos dois sistemas (rodar 1x)
  02-seed-comercial.sql     os 137 pontos e a configuração do mídia kit (rodar 1x)
  03-migrar-dados-antigos.md  como trazer os dados dos dois sistemas antigos
  functions/                players-status (4YouSee) e notify-suggestion (e-mail de sugestões)
  testes/                   testes das regras do banco (92 verificações) e o resultado
.github/workflows/backup-diario.yml   backup diário automático dos dois sistemas
teste/                      ambiente de testes (banco de mentira no navegador) e testes automáticos
docs/originais/             os guias e SQL dos dois sistemas antigos, só para consulta
```

**Onde mexer em cada assunto**

| Quero mudar… | Arquivo |
|---|---|
| Quem enxerga o quê | `core/permissoes.js` (e as regras do banco em `supabase/01-schema-unificado.sql`) |
| Cores/visual da casca | `core/casca.css` |
| Algo do Comercial | `modulos/comercial/js/…` (cada arquivo tem um assunto: `engine`, `ui`, `history`, `dashboard`, `users`…) |
| Algo da Gestão Operacional | `modulos/operacional/js/…` (ex.: manutenção em `05-…`, players em `09-…`, nuvem/login em `12-…`) |
| Atualizar um módulo inteiro | Troque só os arquivos da pasta dele. A casca e o outro módulo não são afetados |

Os dois módulos rodam cada um na sua "moldura" (iframe), compartilhando o **mesmo login**. Por isso um
não interfere no código do outro, e os dois continuam funcionando como já funcionavam.

---

## 2. Ver como vai ficar (ambiente de testes)

O ambiente de testes é o **mesmo código**, ligado a um banco de mentira que roda dentro do navegador,
com dados fictícios. Não usa Supabase, não usa seus dados reais e nada que você fizer ali afeta nada.

Na tela de entrada aparecem 4 botões: **Administrador, Comercial, Operacional, Manutenção** (senha de todos: `teste123`).
Um botão no canto da tela, **Trocar de perfil**, permite comparar as interfaces.

Para remontar a pasta de testes a partir do código: `bash teste/montar-ambiente-de-teste.sh`.
Para rodar de novo os testes automáticos dos perfis: veja `teste/automatico/`.

---

## 3. Colocar no ar (depois de aprovar o teste)

### 3.1 Projeto novo no Supabase
1. https://supabase.com → **New project** (nome `mega-unificado`, região **South America (São Paulo)**).
2. **Authentication → Sign In / Providers → Email**: desligue **Allow new users to sign up** e **Confirm email**.
3. **SQL Editor → New query**: cole **todo** o `supabase/01-schema-unificado.sql` → **Run**. Depois cole **todo** o
   `supabase/02-seed-comercial.sql` → **Run**.
4. **Authentication → Users → Add user**: crie `operacional@megamidiaooh.com.br` com senha, marcando *Auto Confirm User*.
   Esse e-mail nasce **administrador** sozinho.
5. **Project Settings → API**: copie a **Project URL** e a chave **anon public**. Nunca use a `service_role` na página.

### 3.2 Configurar
Abra `config.js` e cole a URL e a chave anon entre as aspas. Só isso, vale para os dois sistemas.

### 3.3 Publicar no GitHub
1. Crie um repositório (ex.: `sistema-mega`) e envie **todo o conteúdo desta pasta** (inclusive `.github` e `.nojekyll`).
   Páginas grátis exigem repositório público: o código fica visível, os dados não (quem protege é o login + o banco).
2. **Settings → Pages → Deploy from a branch → main / (root)**.
3. Em 1 a 2 minutos o endereço aparece. No Supabase: **Authentication → URL Configuration → Site URL** = esse endereço.
4. **Não envie** para o GitHub as pastas `teste/` e `docs/` se não quiser (elas não são usadas em produção).

### 3.4 Usuários e dados
- Entre como administrador → **Usuários** → crie cada pessoa com e-mail, senha e perfil. (Não há auto-cadastro: só o admin cria.)
- Para trazer os dados dos sistemas antigos (fotos novas, rotas, checking, propostas, usuários), use `migrar/LEIA-ME.md`. O guia manual `supabase/03-migrar-dados-antigos.md` é a alternativa sem programa.
  As **senhas antigas não migram** (o Supabase não permite); os usuários são recriados.

---

## 4. Backup (todas as camadas, dos dois sistemas)

1. **Barra do administrador → Backup**: baixa um arquivo único com o Operacional, o Comercial e os usuários (sem senhas).
2. **Backup automático diário** (`.github/workflows/backup-diario.yml`): um robô do GitHub copia tudo para um
   repositório **privado** toda manhã (5h) e guarda 60 dias. Para ativar, crie o repositório privado de backup e 4 *Secrets*
   (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `BACKUP_REPO`, `BACKUP_TOKEN`); a explicação passo a passo está no começo do próprio arquivo.
   O arquivo `operacional-registros.json` gerado é aceito pelo **Importar backup** da Gestão Operacional.
3. **Dentro da Gestão Operacional continua tudo igual:** backup automático em pasta do Drive
   (`matriz-vt-auto.json`, `matriz-vt-fechamento.json`), cópia ao fechar a página, Exportar/Importar backup.
   O formato indentado/organizado do arquivo foi preservado.

Como restaurar o Operacional: **Operacional → Admin → Dados e planilha → Importar backup**.

---

## 5. Recursos opcionais (como antes)

- **Verificação de players (4YouSee):** continua igual. Instale a função `supabase/functions/players-status` no projeto novo
  e crie o *Secret* `FOURYOUSEE_TOKEN` (passo a passo na seção "Verificação de players" de `docs/originais/orig-operacional-LEIA-ME.md`).
  Já foi ajustada para ler os perfis da tabela unificada.
- **E-mail de aviso de sugestões:** `supabase/functions/notify-suggestion` (passo 6 de `docs/originais/orig-comercial-README.md`).

---

## 6. O que foi e o que não foi verificado

Verificado:
- **Regras do banco** num Postgres de verdade (92 verificações, `supabase/testes/RESULTADO.md`): cada perfil lê/grava só o que deve; o
  comercial não lê dados operacionais e vice-versa; manutenção só mexe em chamados; não dá para ficar sem administrador.
- **Interface de cada perfil num navegador real** contra o banco simulado: cada um vê só o seu módulo (e a página dos outros
  módulos nem é baixada); entrar, sair, trocar de perfil, tela do celular, backup e usuários funcionam sem erros de JavaScript.

**Não verificado (só dá para validar na sua conta):**
- O login e o tempo real de um **Supabase de verdade** (o teste usou um simulador).
- A gravação do backup diário no repositório privado (a parte de baixar os dados foi testada).
- A importação do histórico antigo de propostas do Comercial: o sistema antigo só exporta, não importa (veja o guia de migração).

Recomendado: faça primeiro tudo num projeto Supabase **de teste** (passo 3.1 com outro nome) antes de usar o definitivo.
