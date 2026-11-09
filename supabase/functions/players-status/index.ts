// Funcao do Supabase: consulta os players no 4YouSee (API oficial) e devolve o estado deles.
// O token do 4YouSee fica SO nos "Secrets" do Supabase. Nunca vai para a pagina nem para o GitHub.
//
// Secrets (Edge Functions -> Secrets). Cada conta do 4YouSee usa um par:
//   FOURYOUSEE_TOKEN     token da conta 1 (Configuracoes -> Integracoes no 4YouSee)
//   FOURYOUSEE_NOME      nome da conta 1 que aparece na tela (opcional, ex.: Mega R2)
//   FOURYOUSEE_TOKEN_2   token da conta 2   |  FOURYOUSEE_NOME_2   nome da conta 2
//   (e assim por diante, ate _5)
// O Supabase ja fornece sozinho o SUPABASE_URL.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const J = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const API = "https://api.4yousee.com.br/v1/players";
let cache: { t: number; body: unknown } | null = null; // evita consultar o 4YouSee mais de 1x por 45 s

async function quemE(req: Request): Promise<{ perfil?: { papel: string; ativo: boolean }; motivo?: string }> {
  // Confere o login com o proprio token da pessoa (nao precisa de chave secreta do Supabase).
  const url = Deno.env.get("SUPABASE_URL") || "";
  const auth = req.headers.get("authorization") || "";
  const apikey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!url) return { motivo: "SUPABASE_URL ausente na funcao" };
  if (!/^Bearer\s+\S+/i.test(auth)) return { motivo: "a pagina nao enviou o login (sem Authorization)" };
  if (!apikey) return { motivo: "sem apikey" };
  const h = { apikey, Authorization: auth };
  const u = await fetch(url + "/auth/v1/user", { headers: h });
  if (!u.ok) return { motivo: "login recusado pelo Supabase (HTTP " + u.status + ")" };
  const id = (await u.json())?.id;
  if (!id) return { motivo: "login sem usuario" };
  const p = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=papel,ativo`, { headers: h });
  if (!p.ok) return { motivo: "nao consegui ler o perfil (HTTP " + p.status + ")" };
  const rows = await p.json();
  const perfil = rows[0];
  if (!perfil) return { motivo: "perfil nao encontrado" };
  if (perfil.ativo === false) return { motivo: "usuario bloqueado" };
  return { perfil };
}

// Aceita lista direta ou embrulhada em qualquer campo (data, items, players, ...).
const lista = (j: any): any[] => {
  if (Array.isArray(j)) return j;
  if (j && typeof j === "object") {
    for (const k of Object.keys(j)) if (Array.isArray(j[k])) return j[k];
    for (const k of Object.keys(j)) {
      const v = j[k];
      if (v && typeof v === "object" && !Array.isArray(v)) for (const k2 of Object.keys(v)) if (Array.isArray(v[k2])) return v[k2];
    }
  }
  return [];
};

async function buscarPlayers(token: string) {
  const todos = new Map<string, any>();
  let diag = "";
  for (let pg = 1; pg <= 30; pg++) {
    const r = await fetch(pg === 1 ? API : `${API}?page=${pg}`, { headers: { "Secret-Token": token, Accept: "application/json" } });
    if (r.status === 401 || r.status === 403) throw new Error("TOKEN_RECUSADO");
    if (!r.ok) throw new Error("HTTP_" + r.status);
    const txt = await r.text();
    let j: any = null;
    try { j = JSON.parse(txt); } catch (_) { /* nao era JSON */ }
    const arr = lista(j);
    if (pg === 1 && !arr.length) {
      diag = `HTTP ${r.status}; ${j === null ? "resposta nao e JSON" : Array.isArray(j) ? "lista vazia" : "campos: " + Object.keys(j).slice(0, 12).join(", ")}; inicio: ${txt.slice(0, 220).replace(/\s+/g, " ")}`;
    }
    const antes = todos.size;
    for (const p of arr) todos.set(String(p.id ?? p.name ?? todos.size), p);
    if (!arr.length || todos.size === antes) break; // acabou (ou a API ignora "page")
  }
  return { lista: [...todos.values()], diag };
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const perfil = await quemE(req);
  if (!perfil) return J({ ok: false, erro: "Nao autorizado. Entre no sistema novamente." }, 401);
  if (perfil.papel !== "admin") return J({ ok: false, erro: "Somente o administrador pode ver os players." }, 403);
  const contas: { nome: string; token: string }[] = [];
  for (const suf of ["", "_2", "_3", "_4", "_5"]) {
    const token = Deno.env.get("FOURYOUSEE_TOKEN" + suf);
    if (token) contas.push({ token, nome: Deno.env.get("FOURYOUSEE_NOME" + suf) || (suf ? "Conta " + suf.slice(1) : "Conta 1") });
  }
  if (!contas.length) return J({ ok: false, erro: "FOURYOUSEE_TOKEN nao configurado nos Secrets do Supabase." }, 200);
  if (cache && Date.now() - cache.t < 45000) return J(cache.body);
  const players: any[] = [], resumo: any[] = [];
  for (const c of contas) {
    try {
      const r = await buscarPlayers(c.token);
      resumo.push({ nome: c.nome, total: r.lista.length, diag: r.lista.length ? "" : r.diag, erro: "" });
      for (const p of r.lista) {
        players.push({
          id: p.id,
          conta: c.nome,
          nome: String(p.name ?? ""),
          descricao: String(p.description ?? ""),
          grupo: p.group?.name ?? null,
          plataforma: p.platform ?? null,
          status: p.playerStatus?.name ?? null,
          minutos: typeof p.lastContactInMinutes === "number" ? p.lastContactInMinutes : null,
          ultimoLog: p.lastLogReceived ?? null,
        });
      }
    } catch (e) {
      const m = String((e as Error).message || e);
      resumo.push({ nome: c.nome, total: 0, diag: "", erro: m === "TOKEN_RECUSADO" ? "o 4YouSee recusou o token desta conta (gere outro em Configuracoes -> Integracoes e atualize o Secret)" : "falha ao consultar (" + m + ")" });
    }
  }
  if (!players.length && resumo.every((x) => x.erro)) return J({ ok: false, erro: resumo.map((x) => `${x.nome}: ${x.erro}`).join(" | ") });
  const body = { ok: true, geradoEm: Date.now(), total: players.length, diag: players.length ? "" : resumo.map((x) => `${x.nome}: ${x.diag || x.erro}`).join(" | "), contas: resumo, players };
  cache = { t: Date.now(), body };
  return J(body);
}

Deno.serve(handler);
