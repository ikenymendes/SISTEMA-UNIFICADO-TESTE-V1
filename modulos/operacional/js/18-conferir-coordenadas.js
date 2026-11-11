/* =====================================================================
   Módulo operacional · Conferir coordenadas dos pontos
   Compara a coordenada cadastrada de cada ponto com o endereço escrito
   (OpenStreetMap / Nominatim, 1 consulta por segundo) e lista os que
   estão longe, para corrigir de uma vez.
   ===================================================================== */
const CC = { run: false, i: 0, tot: 0, res: {}, cola: null, feito: false };
const CC_BOX = "-44.40,-19.60,-43.70,-20.20"; /* Grande BH */
let ccCache = {};
try {
  ccCache = JSON.parse(localStorage.getItem("cc_geo") || "{}");
} catch (_) {}
const ccSalvaCache = () => {
  try {
    localStorage.setItem("cc_geo", JSON.stringify(ccCache));
  } catch (_) {}
};
const ccEspera = (ms) => new Promise((r) => setTimeout(r, ms));
const ccKm = (k) => (k < 1 ? Math.round(k * 1000) + " m" : k.toFixed(1).replace(".", ",") + " km");
/* texto do endereço em formatos que o OpenStreetMap entende melhor */
function ccBuscas(end) {
  const t = String(end || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return [];
  const sem = t.replace(/\s[-–]\s/g, ", "),
    rua = t.split(/\s[-–]\s/)[0];
  return [...new Set([sem + ", MG", rua + ", MG", sem])];
}
async function ccGeo(end) {
  const k = fpN(end);
  if (ccCache[k]) return ccCache[k];
  let r = null;
  for (const q of ccBuscas(end)) {
    const u =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&accept-language=pt-BR&addressdetails=1&bounded=1&viewbox=" +
      CC_BOX +
      "&q=" +
      encodeURIComponent(q);
    const res = await fetch(u, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("busca " + res.status);
    const j = await res.json();
    await ccEspera(1100);
    if (j && j[0]) {
      const x = j[0],
        a = x.address || {};
      r = {
        ll: [+x.lat, +x.lon],
        bb: (x.boundingbox || []).map(Number) /* [sul, norte, oeste, leste] */,
        casa: !!a.house_number,
        nome: [a.road, a.house_number, a.suburb || a.neighbourhood, a.city || a.town].filter(Boolean).join(", ") || x.display_name,
      };
      break;
    }
  }
  r = r || { nada: 1 };
  ccCache[k] = r;
  ccSalvaCache();
  return r;
}
/* o que existe na coordenada cadastrada (só para os suspeitos) */
async function ccOnde(ll) {
  const k = "@" + ll.map((n) => n.toFixed(5)).join(",");
  if (ccCache[k]) return ccCache[k].nome;
  try {
    const res = await fetch(
      "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=pt-BR&lat=" + ll[0] + "&lon=" + ll[1],
    );
    const x = await res.json(),
      a = (x && x.address) || {};
    await ccEspera(1100);
    const nome = [a.road, a.house_number, a.suburb || a.neighbourhood, a.city || a.town].filter(Boolean).join(", ") || (x && x.display_name) || "";
    ccCache[k] = { nome };
    ccSalvaCache();
    return nome;
  } catch (_) {
    return "";
  }
}
/* distância da coordenada até o endereço: até o número (se achou) ou até o trecho da rua */
function ccDist(ll, g) {
  if (g.casa || !g.bb || g.bb.length < 4) return D(ll, g.ll);
  const [s, n, w, l] = g.bb,
    lat = Math.min(Math.max(ll[0], s), n),
    lon = Math.min(Math.max(ll[1], w), l);
  return D(ll, [lat, lon]);
}
const ccLim = (g) => (g.casa ? 0.6 : 0.4); /* km */
const ccPts = () => [...S.fixos, ...S.vars];
const ccOk = (p) => p.ll && p.llOk && p.llOk === p.ll.join(",");
async function ccRodar() {
  if (CC.run) return;
  const L = ccPts().filter((p) => (p.nome || p.end) && !ccOk(p));
  CC.run = true;
  CC.feito = false;
  CC.i = 0;
  CC.tot = L.length;
  CC.res = {};
  CC.erro = "";
  ccPinta();
  for (const p of L) {
    CC.i++;
    ccPinta();
    try {
      const g = await ccGeo([p.nome, p.end].filter(Boolean).join(" - "));
      if (g.nada) CC.res[p.id] = { tipo: "nao" };
      else if (!p.ll) CC.res[p.id] = { tipo: "sem", g };
      else {
        const d = ccDist(p.ll, g);
        if (d > ccLim(g)) CC.res[p.id] = { tipo: "longe", g, d, onde: await ccOnde(p.ll) };
      }
    } catch (err) {
      CC.erro = "A busca de endereços não respondeu agora. Tente de novo em alguns minutos.";
      break;
    }
  }
  CC.run = false;
  CC.feito = true;
  ccPinta();
}
function ccLinha(p) {
  const r = CC.res[p.id];
  if (!r) return "";
  const gm = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([p.nome, p.end].filter(Boolean).join(", ")),
    atual = p.ll ? "https://www.google.com/maps/search/?api=1&query=" + p.ll.join(",") : "";
  let txt, cls;
  if (r.tipo === "longe") {
    cls = "longe";
    txt = `A coordenada cadastrada fica a <b>${ccKm(r.d)}</b> do endereço${r.onde ? ` e aponta para <b>${e(r.onde)}</b>` : ""}.`;
  } else if (r.tipo === "sem") {
    cls = "sem";
    txt = "Sem coordenada: no mapa e no “Perto de você” ele não aparece.";
  } else {
    cls = "nao";
    txt = "Não achei esse endereço no mapa para comparar. Confira à mão.";
  }
  const cola =
    CC.cola === p.id
      ? `<div class="cc-cola"><input id="ccll" placeholder="Cole aqui o link do Google Maps ou as coordenadas"><button class="pri sm" data-a="ccset" data-v="${p.id}">Salvar</button><button class="sm" data-a="cccola" data-v="">Cancelar</button></div>`
      : "";
  return `<div class="cc-it ${cls}"><div class="cc-tx"><b>${e(p.nome)}</b><small>${e(p.end || "")}</small><span>${txt}</span>${
    r.g && !r.g.nada ? `<small>Endereço encontrado: ${e(r.g.nome)}${r.g.casa ? "" : " (só a rua, sem o número)"}</small>` : ""
  }</div><div class="cc-bt"><a class="sm b" href="${gm}" target="_blank" rel="noopener">🗺 Endereço no Maps</a>${
    atual ? `<a class="sm b" href="${atual}" target="_blank" rel="noopener">📍 Onde está hoje</a>` : ""
  }<button class="sm" data-a="cccola" data-v="${p.id}">✏️ Colar link certo</button>${
    r.g && !r.g.nada && r.g.casa ? `<button class="sm pri" data-a="ccfix" data-v="${p.id}">Usar posição do endereço</button>` : ""
  }${p.ll ? `<button class="sm" data-a="ccok" data-v="${p.id}">✓ Está certo</button>` : ""}</div>${cola}</div>`;
}
function ccCorpo() {
  const L = ccPts(),
    semEnd = L.filter((p) => !p.end && !p.nome).length,
    marcados = L.filter(ccOk).length;
  if (CC.run)
    return `<div class="cc-prog"><div><b>Conferindo ${CC.i} de ${CC.tot}…</b><small>Uma consulta por segundo (regra do mapa gratuito). Pode continuar usando o sistema; não feche esta aba.</small></div><i style="--p:${CC.tot ? Math.round((CC.i / CC.tot) * 100) : 0}%"></i></div>${ccLista()}`;
  if (!CC.feito)
    return `<p class="mu" style="margin:4px 0 10px">Compara a coordenada de cada ponto com o endereço escrito e mostra os que estão longe. ${L.length} pontos${semEnd ? ` (${semEnd} sem endereço não entram)` : ""}${marcados ? ` · ${marcados} já marcados como certos` : ""}.</p><button class="pri" data-a="ccrun">🧭 Conferir agora</button>`;
  const n = Object.keys(CC.res).length;
  return `${CC.erro ? `<div class="warn">${e(CC.erro)}</div>` : ""}<p class="mu" style="margin:4px 0 10px">${
    n ? `<b>${n}</b> ${n === 1 ? "ponto precisa" : "pontos precisam"} de atenção.` : "Tudo certo: as coordenadas batem com os endereços. 🎉"
  } <button class="sm" data-a="ccrun">Conferir de novo</button></p>${ccLista()}`;
}
const ccLista = () => {
  const L = ccPts().filter((p) => CC.res[p.id]),
    ord = { longe: 0, sem: 1, nao: 2 };
  L.sort((a, b) => ord[CC.res[a.id].tipo] - ord[CC.res[b.id].tipo] || (CC.res[b.id].d || 0) - (CC.res[a.id].d || 0));
  return L.length ? `<div class="cc-lista">${L.map(ccLinha).join("")}</div>` : "";
};
const ccCard = () => (eAdm() ? `<div class="card cc"><h2 style="margin-top:0">🧭 Conferir coordenadas dos pontos</h2><div id="ccb">${ccCorpo()}</div></div>` : "");
function ccPinta() {
  const b = $("ccb");
  if (b) b.innerHTML = ccCorpo();
}
/* Maps: o alfinete do lugar vem em !3d…!4d…; o "@" é só o centro da tela */
function ccParse(s) {
  const t = String(s || ""),
    m = t.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  return m ? [+m[1], +m[2]] : parseLL(t);
}
