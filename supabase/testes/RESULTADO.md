# Resultado dos testes do schema unificado

Gerado em 2026-11-09T01:01:39.532Z · Postgres 18.6 (pglite/WASM)

**92/92 testes passaram.**

| | Teste | Detalhe |
|---|---|---|
| ✅ | Schema roda na 1ª vez |  |
| ✅ | Schema roda na 2ª vez (idempotente) |  |
| ✅ | Seed comercial roda 2x sem duplicar | 137 pontos |
| ✅ | E-mail de admins_iniciais nasce admin |  |
| ✅ | Outro cadastro nasce pendente |  |
| ✅ | Cadastro fora do domínio é barrado |  |
| ✅ | Só existe 1 trigger de novo usuário em auth.users |  |
| ✅ | admin_criar_usuario cria "comercial" (ativo, e-mail de fora do domínio) | {"papel":"comercial","ativo":true,"nome":"Usuário comercial"} |
| ✅ | admin_criar_usuario cria "operacional" (ativo, e-mail de fora do domínio) | {"papel":"operacional","ativo":true,"nome":"Usuário operacional"} |
| ✅ | admin_criar_usuario cria "manutencao" (ativo, e-mail de fora do domínio) | {"papel":"manutencao","ativo":true,"nome":"Usuário manutencao"} |
| ✅ | admin_criar_usuario cria "admin" (ativo, e-mail de fora do domínio) | {"papel":"admin","ativo":true,"nome":"Usuário admin"} |
| ✅ | admin_criar_usuario rejeita papel inválido |  |
| ✅ | Comercial NÃO consegue criar usuário |  |
| ✅ | Operacional NÃO consegue redefinir senha |  |
| ✅ | Admin redefine senha |  |
| ✅ | Admin muda papel para bloqueado |  |
| ✅ | Leitura de registros como admin | viu 5, esperado 5 |
| ✅ | Leitura de pontos como admin | viu 137, esperado 137 |
| ✅ | Leitura de config como admin | viu 1, esperado 1 |
| ✅ | Leitura de sugestoes como admin | viu 1, esperado 1 |
| ✅ | Leitura de propostas como admin | viu 1, esperado 1 |
| ✅ | Leitura de registros como comercial | viu 0, esperado 0 |
| ✅ | Leitura de pontos como comercial | viu 137, esperado 137 |
| ✅ | Leitura de config como comercial | viu 1, esperado 1 |
| ✅ | Leitura de sugestoes como comercial | viu 1, esperado 1 |
| ✅ | Leitura de propostas como comercial | viu 1, esperado 1 |
| ✅ | Leitura de registros como operacional | viu 5, esperado 5 |
| ✅ | Leitura de pontos como operacional | viu 0, esperado 0 |
| ✅ | Leitura de config como operacional | viu 0, esperado 0 |
| ✅ | Leitura de sugestoes como operacional | viu 0, esperado 0 |
| ✅ | Leitura de propostas como operacional | viu 0, esperado 0 |
| ✅ | Leitura de registros como manutencao | viu 5, esperado 5 |
| ✅ | Leitura de pontos como manutencao | viu 0, esperado 0 |
| ✅ | Leitura de config como manutencao | viu 0, esperado 0 |
| ✅ | Leitura de sugestoes como manutencao | viu 0, esperado 0 |
| ✅ | Leitura de propostas como manutencao | viu 0, esperado 0 |
| ✅ | Leitura de registros como pendente | viu 0, esperado 0 |
| ✅ | Leitura de pontos como pendente | viu 0, esperado 0 |
| ✅ | Leitura de config como pendente | viu 0, esperado 0 |
| ✅ | Leitura de sugestoes como pendente | viu 0, esperado 0 |
| ✅ | Leitura de propostas como pendente | viu 0, esperado 0 |
| ✅ | Leitura de registros como bloqueado | viu 0, esperado 0 |
| ✅ | Leitura de pontos como bloqueado | viu 0, esperado 0 |
| ✅ | Leitura de config como bloqueado | viu 0, esperado 0 |
| ✅ | Leitura de sugestoes como bloqueado | viu 0, esperado 0 |
| ✅ | Leitura de propostas como bloqueado | viu 0, esperado 0 |
| ✅ | Leitura de registros como operacional inativo | viu 0, esperado 0 |
| ✅ | Leitura de pontos como operacional inativo | viu 0, esperado 0 |
| ✅ | Leitura de config como operacional inativo | viu 0, esperado 0 |
| ✅ | Leitura de sugestoes como operacional inativo | viu 0, esperado 0 |
| ✅ | Leitura de propostas como operacional inativo | viu 0, esperado 0 |
| ✅ | Comercial vê só o próprio perfil |  |
| ✅ | Admin vê todos os perfis |  |
| ✅ | Operacional NÃO altera fx |  |
| ✅ | Operacional NÃO altera vr |  |
| ✅ | Operacional NÃO altera cfg |  |
| ✅ | Operacional altera vt (campanha) |  |
| ✅ | Operacional altera mn |  |
| ✅ | Operacional NÃO cria fx |  |
| ✅ | Operacional cria vr (ponto variável novo) |  |
| ✅ | Operacional NÃO apaga registro |  |
| ✅ | Manutenção altera só mn |  |
| ✅ | Manutenção NÃO cria vt |  |
| ✅ | Manutenção cria mn |  |
| ✅ | Admin altera fx, vr e cfg |  |
| ✅ | Admin apaga registro |  |
| ✅ | Comercial NÃO grava em registros |  |
| ✅ | gravar_registros (operacional): aceita vt novo | {"ok":["vt:novo1"],"antigo":["vt:c1"],"negado":["fx:novo2","fx:p1"]} |
| ✅ | gravar_registros (operacional): nega fx novo e fx existente | {"ok":["vt:novo1"],"antigo":["vt:c1"],"negado":["fx:novo2","fx:p1"]} |
| ✅ | gravar_registros (operacional): marca registro desatualizado | {"ok":["vt:novo1"],"antigo":["vt:c1"],"negado":["fx:novo2","fx:p1"]} |
| ✅ | gravar_registros (comercial): nada é gravado | {"ok":[],"antigo":[],"negado":["vt:com"]} |
| ✅ | gravar_registros (manutenção): só mn passa | {"ok":["mn:viaLote"],"antigo":[],"negado":["vt:viaLote"]} |
| ✅ | Comercial NÃO altera ponto |  |
| ✅ | Comercial NÃO altera config |  |
| ✅ | Admin altera ponto |  |
| ✅ | Comercial cria sugestão (autor preenchido) |  |
| ✅ | Comercial cria proposta |  |
| ✅ | Operacional NÃO cria sugestão |  |
| ✅ | Operacional NÃO cria proposta |  |
| ✅ | Comercial NÃO apaga/edita proposta |  |
| ✅ | Comercial NÃO resolve sugestão |  |
| ✅ | Admin aprova sugestão e ponto é alterado |  |
| ✅ | Comercial NÃO altera o próprio papel |  |
| ✅ | Operacional NÃO altera o próprio papel |  |
| ✅ | Comercial envia foto para sugestoes/<seu id>/ |  |
| ✅ | Comercial NÃO envia foto em pontos/ |  |
| ✅ | Admin envia foto em pontos/ |  |
| ✅ | Operacional NÃO envia foto |  |
| ✅ | Rebaixar um admin (há outro) funciona |  |
| ✅ | Não deixa desativar o ÚLTIMO admin | Precisa existir pelo menos um admin ativo. |
| ✅ | Não deixa rebaixar o ÚLTIMO admin | Precisa existir pelo menos um admin ativo. |
| ✅ | Admin desativado perde o acesso |  |

## O que NÃO foi validado aqui
- Autenticação real do Supabase (GoTrue): login/senha, JWT. O teste simula só `auth.uid()`.
- Tabelas `auth.users`/`auth.identities`/`storage.*` são versões mínimas (shim), não as reais.
- Realtime: a publicação foi criada, mas não há servidor de tempo real.
- O PostgREST (API REST) não participa: testamos as regras direto no banco (RLS), que é onde a segurança fica.
