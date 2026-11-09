# Trazer os dados dos dois sistemas antigos para o sistema unificado

Hoje existem **dois projetos Supabase** (Operacional e Comercial). O sistema unificado usa **um projeto novo**.
Faça tudo no projeto novo. Os projetos antigos **não são apagados**: ficam como reserva até você conferir tudo.

> Dica: faça isso primeiro no **ambiente de testes** (um projeto Supabase de teste) e só depois no definitivo.

## 0. Antes de começar (nos sistemas antigos)
1. **Operacional:** entre como admin → **Admin → Dados e planilha → Exportar backup**. Guarde o arquivo (`matriz-vt-AAAA-MM-DD.json`). Se preferir, use o `matriz-vt-auto.json` mais recente da pasta de backup.
2. **Comercial:** entre como admin → aba **Propostas** → **⬇ Backup completo (JSON)**. Guarde o arquivo (`backup-propostas-….json`).
3. Anote a lista de usuários de cada sistema (nome, e-mail e função).

## 1. Criar o projeto novo
1. Em https://supabase.com → **New project** (nome `mega-unificado`, região **South America (São Paulo)**). Guarde a senha do banco.
2. **Authentication → Sign In / Providers → Email**: desligue **Allow new users to sign up** e **Confirm email** (só o admin cria usuários).

## 2. Criar as tabelas e as regras
1. **SQL Editor → New query**, cole **todo** o `supabase/01-schema-unificado.sql` → **Run**. (Pode rodar de novo sem problema.)
2. Nova query, cole **todo** o `supabase/02-seed-comercial.sql` → **Run**. Isso carrega os 137 pontos e os textos/preços do mídia kit.
   - Se você mudou pontos ou preços depois do seed (no sistema comercial antigo), **não rode o seed ainda**: veja o passo 5.

## 3. Usuários (as senhas NÃO migram)
O Supabase guarda as senhas de forma que não dá para copiar de um projeto para outro. Por isso os usuários são **recriados**:
1. Crie o seu usuário admin: **Authentication → Users → Add user → Create new user**, e-mail `operacional@megamidiaooh.com.br` (ele nasce **admin** sozinho), marque *Auto Confirm User*.
2. Entre no sistema unificado com ele. Na barra do topo, em **Usuários**, crie cada pessoa com e-mail, senha provisória e a função:
   - **Administrador** (vê tudo) · **Comercial** (só a parte comercial) · **Operacional** (só a gestão operacional) · **Manutenção** (só os chamados de manutenção).
3. Avise cada pessoa da senha nova. O histórico antigo continua com o nome de quem fez (ele é gravado como texto), mas fica ligado ao usuário *antigo*.

## 4. Dados do Operacional
1. Entre no sistema unificado como **admin** e abra a parte operacional.
2. **Admin → Dados e planilha → Importar backup** e escolha o arquivo do passo 0.1.
3. Confira no topo **● nuvem sincronizada**. Depois entre com um usuário *Operacional* e veja se os VTs, pontos, fotos e manutenções estão lá.

## 5. Dados do Comercial
- **Pontos e configuração:** o `02-seed-comercial.sql` já carregou a versão de 07/11. Se o comercial antigo tem pontos novos ou preços alterados depois dessa data, o jeito mais seguro é **antes de rodar o seed**, abrir o comercial antigo e usar o que ele já tem no banco: no *SQL Editor* do projeto **antigo** rode `select * from pontos` / `select * from config` e exporte (botão *Export → CSV/JSON*), e peça para eu converter em um novo seed. Se não houve mudança, o seed basta.
- **Histórico de propostas:** o sistema só **exporta** o backup das propostas (JSON/CSV); ele **não tem botão para importar**. Guarde o arquivo do passo 0.2 como arquivo de consulta. As propostas novas passam a ser gravadas no projeto unificado a partir do primeiro uso. (Se quiser o histórico antigo dentro do sistema novo, é preciso um pequeno importador; peça que eu faça.)
- **Fotos novas** enviadas pelo comercial (bucket `fotos` do projeto antigo) não migram sozinhas: baixe-as no painel do projeto antigo (Storage → fotos) e envie para o mesmo bucket `fotos` do projeto novo. As 141 fotos da biblioteca ficam no próprio site (`assets/lib`) e não precisam de nada.

## 6. Conferência final (10 minutos)
- [ ] Admin enxerga a parte comercial **e** a operacional.
- [ ] Usuário **Comercial** só vê o comercial; ao tentar abrir a parte operacional não consegue.
- [ ] Usuário **Operacional** só vê a gestão operacional.
- [ ] Usuário **Manutenção** só vê os chamados.
- [ ] Contagem de VTs/pontos operacionais igual à do sistema antigo.
- [ ] Gerar uma proposta de teste no comercial e ver em **Propostas**.
- [ ] Rodar o backup diário (`.github/workflows/backup-diario.yml`) uma vez na mão e abrir os arquivos gerados.

## 7. Desligar os antigos
Só depois de usar o novo por alguns dias: pause os projetos Supabase antigos (não apague). Guarde os arquivos de backup do passo 0.
