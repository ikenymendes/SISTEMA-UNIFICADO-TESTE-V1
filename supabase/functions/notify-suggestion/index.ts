// Avisa por e-mail todos os administradores quando o comercial envia uma sugestão.
// Disparada por um "Database Webhook" (INSERT na tabela public.sugestoes). Veja o README, passo 6.
//
// Secrets necessários (supabase secrets set ...):
//   RESEND_API_KEY   chave da conta em resend.com
//   FROM_EMAIL       remetente, ex.: "Gerador Mega <avisos@seudominio.com.br>"
//   SITE_URL         endereço do gerador no GitHub Pages
//   WEBHOOK_SECRET   texto qualquer; o mesmo valor vai no cabeçalho x-webhook-secret do webhook
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) {
    return new Response("não autorizado", { status: 401 });
  }
  const body = await req.json();
  const s = body.record;
  if (!s || s.status !== "pendente") return new Response("ignorado");

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: admins } = await sb.from("profiles").select("email").eq("papel", "admin");
  const para = (admins ?? []).map((a: { email: string }) => a.email);
  if (!para.length) return new Response("sem administradores");

  const esc = (t: unknown) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  const quem = s.criado_por_nome || s.criado_por_email || "um usuário";
  const nomePonto = esc((s.antes && s.antes.endereco) || (s.payload && s.payload.endereco) || "(sem endereço)");
  const acao = s.tipo === "adicionar" ? "adicionar um ponto" : "alterar um ponto";
  const campos = Object.keys(s.payload ?? {}).filter((k) => !["foto", "mapa"].includes(k))
    .map((k) => `<li><b>${esc(k)}</b>: ${s.antes && k in s.antes ? esc(s.antes[k]) + " → " : ""}${esc(s.payload[k])}</li>`).join("");
  const site = Deno.env.get("SITE_URL") ?? "";

  const html = `<div style="font-family:Arial,sans-serif;color:#15153f">
    <h2 style="color:#000066">Nova sugestão de ponto</h2>
    <p><b>${esc(quem)}</b> sugeriu ${acao}: <b>${nomePonto}</b></p>
    ${s.motivo ? `<p style="background:#f5f4fa;padding:8px 12px;border-radius:8px">“${esc(s.motivo)}”</p>` : ""}
    <ul>${campos}</ul>
    ${site ? `<p><a href="${esc(site)}" style="background:#ff0066;color:#fff;padding:10px 18px;border-radius:99px;text-decoration:none">Abrir o gerador e decidir</a></p>` : ""}
  </div>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}` },
    body: JSON.stringify({ from: Deno.env.get("FROM_EMAIL"), to: para, subject: `Nova sugestão de ${quem}: ${acao}`, html }),
  });
  return new Response(await r.text(), { status: r.ok ? 200 : 502 });
});
