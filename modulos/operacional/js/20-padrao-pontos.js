/* =====================================================================
   Módulo operacional · Tipo e formato padrão de cada endereço
   Tabela do cadastro de pontos (comercial). Usada no checking quando o
   endereço não tem tipo/formato preenchido em Admin → Endereços.
   O que estiver preenchido no endereço sempre vale mais; no checking dá
   para alterar à mão.
   ===================================================================== */
const PADRAO_PONTOS = [["Av. Afonso Pena, 327 Centro", "BANCA DE LED", "3x2m"], ["Av. Afonso Pena, 719 Centro", "BANCA DE LED", "4x2m"], ["Rua da Bahia 657 Centro", "BANCA DE LED", "3x2m"], ["Rua dos Tupis, 332, Centro", "BANCA DE LED", "3x2m"], ["Rua dos Carijós, 611, Centro", "BANCA DE LED", "3x2m"], ["Rua dos Goitacazes, 203", "BANCA DE LED", "3x2m"], ["R. São Paulo, 842", "BANCA DE LED", "4x2m"], ["Avenida Santos Dumont 415, Centro", "BANCA DE LED", "4x2m"], ["R. Saturnino de Brito, 25", "BANCA DE LED", "4x2m"], ["Av. Afonso Pena, 3359", "BANCA DE LED", "3x2m"], ["Rua Levindo Lopes 325 Funcionários", "BANCA DE LED", "3x2m"], ["Av. Cristóvão Colombo,266", "BANCA DE LED", "3x2m"], ["Rua dos Timbiras, 1321 Funcionários", "BANCA DE LED", "3x2m"], ["Av. Olegário Maciel 1516", "BANCA DE LED", "3x2m"], ["Av. Brasil, 693 Santa Efigênia", "BANCA DE LED", "3x2m"], ["Rua dos Otoni, 772", "BANCA DE LED", "3x2m"], ["Rua Henrique Badaró Portugal, 33", "BANCA DE LED", "3x2m"], ["Av. Silva Lobo, 1665 Grajaú", "BANCA DE LED", "3x2m"], ["Av. Marquês de Valença, 34", "BANCA DE LED", "3x2m"], ["Rua Barão de Coromandel, 137 Barreiro", "BANCA DE LED", "3x2m"], ["Av. Cristiano Machado, 482 Colégio Batista", "BANCA DE LED", "3x2m"], ["Av. Neném Lara Rocha, n° 330", "BANCA DE LED", "3x2m"], ["Av. General David Sarnoff, 4840", "BANCA DE LED", "3x2m"], ["Avenida Bandeirantes, 2275, Serra", "BANCA DE LED", "3x2m"], ["Av. Dr. Cristiano Guimarães, 197", "BANCA DE LED", "3x2m"], ["R. Curitiba, 560", "BANCA DE LED", "3x2m"], ["Av. Governador Valadares, 70", "BANCA DE LED", "1,5x3m"], ["Av. Nossa Senhora do Carmo, 500", "PAINEL DE LED", "9x3m"], ["Av. Tancredo Neves, 2579", "PAINEL DE LED", "4x6m"], ["Av. Pastor Anselmo Silvestre, 1700", "PAINEL DE LED", "9x3m"], ["Av. Cristiano Machado, 5030", "PAINEL DE LED", "8x3m"], ["Av. Cristiano Machado, 5553", "PAINEL DE LED", "8x3m"], ["Av. Pres. Antônio Carlos , 3200", "PAINEL DE LED", "8x3m"], ["Av. Amazonas, 5234", "PAINEL DE LED", "3x5m"], ["Av. Barão Homem de Melo, 2120", "PAINEL DE LED", "3x5m"], ["Av. Raja Gabáglia, 1580", "PAINEL DE LED", "3x5m"], ["Rod. Januário Carneiro, 1150", "PAINEL DE LED", "3x5m"], ["Av. João Cesar de Oliveira, 3684", "PAINEL DE LED", "4x6m"], ["Av. Amazonas, 202", "PAINEL DE LED", "4x6m"], ["Rod. Januário Carneiro, 8625", "PAINEL DE LED", "3x5m"], ["Av. Cardeal Eugênio Pacelli, 1145", "PAINEL DE LED", "9x3m"], ["Av. João César de Oliveira, 2910", "PAINEL DE LED", "2x4m"], ["Av. Francisco Firmo de matos 2666", "PAINEL DE LED", "7x3m"], ["Av. Gen. David Sarnoff, 1187, Eldorado", "PAINEL DE LED", "7x4m"], ["Av. Cardeal Eugênio Pacelli, 1996, Cidade Industrial", "PAINEL DE LED", "9x3m"], ["Av. Severino Ballesteros, 1589, Ressaca", "PAINEL DE LED", "3x5m"], ["Rua do Rosário, 593", "PAINEL DE LED", "4x3m"], ["Av. Thales Chagas, 1046", "PAINEL DE LED", "4x2m"], ["Av. Brasília, 2465", "PAINEL DE LED", "2x4m"], ["R. Pinto Alves, 3562", "PAINEL DE LED", "3x4m"], ["Rua Pinto Alves, 2390", "PAINEL DE LED", "4x6m"], ["Av. Juscelino Kubitscherk, n°11- Bauxita", "PAINEL DE LED", "3x4m"], ["Rua Professor Paulo Magalhães, n° 137 Bauxita", "PAINEL DE LED", "3x4m"], ["EPIG", "PAINEL DE LED", "2x3m"], ["EPAR (DF047) Saída do Aeroporto", "PAINEL DE LED", "2x3m"], ["EPDB (DF025) Próximo ao Gilberto Salomão", "PAINEL DE LED", "2x3m"], ["EPAR (DF047)", "PAINEL DE LED", "2x3m"], ["EPAR (DF047)", "PAINEL DE LED", "2x3m"], ["(DF051)", "PAINEL DE LED", "2x3m"], ["EPIA Sul (DF 003)", "PAINEL DE LED", "2x3m"], ["EPIG", "PAINEL DE LED", "2x3m"], ["EPTG", "PAINEL DE LED", "2x3m"], ["Pistão Sul, Saída da EPTG Frente ao Condomínio Península", "PAINEL DE LED", "2x3m"], ["EPAA", "PAINEL DE LED", "2x3m"], ["(DF003) EPIA Sul", "PAINEL DE LED", "2x3m"], ["Via L4 Sul Próximo a Unieuro", "PAINEL DE LED", "2x3m"], ["Via L4 Sul Saída da Ponte das Garças", "PAINEL DE LED", "2x3m"], ["Via L4 Sul (Av. das Nações)", "PAINEL DE LED", "2x3m"], ["DF 009, Após a Ponte do Bragueto, Entrada para o Lago Norte", "PAINEL DE LED", "2x3m"], ["Alameda Oscar Niemeyer, 322", "FRONTLIGHT", "7x3m"], ["Alameda Oscar Niemeyer, 322", "FRONTLIGHT", "7x3m"], ["AV. Presidente Antônio Carlos, 3529", "FRONTLIGHT", "9x3m"], ["Av. Professor Mário Werneck, 1923", "EMPENA", "4x7m"], ["Av. Prudente de Morais, 1255", "EMPENA", "15x5m"], ["Av. Governador Valadares , 801", "EMPENA", "10x4m"], ["AV. Afonso Pena 599", "BANCA ESTÁTICA", "3x2m"], ["Rua dos Goitacazes 506", "BANCA ESTÁTICA", "3x2m"], ["Rua Congonhas, 721", "BANCA ESTÁTICA", "3x2m"], ["Rua dos Aimorés, 357", "BANCA ESTÁTICA", "3x2m"], ["R. Barão de Macaúbas, 85", "BANCA ESTÁTICA", "3x2m"], ["Praça Tejo, 36, Padre Eustáquio", "BANCA ESTÁTICA", "3x2m"], ["R. Cecildes Moreira de Faria, 93", "BANCA ESTÁTICA", "3x2m"], ["Rua Jaguaribe, 938, Concórdia", "BANCA ESTÁTICA", "3x2m"], ["R. Afonso Pena Júnior, 300", "BANCA ESTÁTICA", "3x2m"], ["Rua Dr. Júlio Otaviano Ferreira, 861", "BANCA ESTÁTICA", "3x2m"], ["R. Itamogi, 18", "BANCA ESTÁTICA", "3x2m"], ["R. Cristalina, 179", "BANCA ESTÁTICA", "3x1,8m"], ["Av. João Gomes Cardoso, 2242", "BANCA ESTÁTICA", "3x2m"], ["Av. Serrana, 200", "BANCA ESTÁTICA", "3x2m"], ["Av. Bernarda Silvestre 438", "BANCA ESTÁTICA", "3x2m"], ["Avenida Silva Guimarães, 51, Sol Nascente, Barreiro", "BANCA ESTÁTICA", "3x2m"], ["Av. Dr. João Augusto Fonseca e Silva, 1123", "BANCA ESTÁTICA", "3x2m"], ["AV. Coronel Durval de Barros, 751", "BANCA ESTÁTICA", "3x2m"], ["Rodovia Januário Carneiro, 1150", "PAINEL MENSAL", "9x3m"], ["Av. Pres. Tancredo Neves, 2579", "PAINEL MENSAL", "9x3m"], ["Av. Pres. Tancredo Neves, 1131", "PAINEL MENSAL", "9x3m"], ["Av. Teresa Cristina, 5916", "PAINEL MENSAL", "9x3m"], ["Via Expressa de Contagem", "PAINEL MENSAL", "9x3m"], ["Rod. Pres. JK (BR-040) ao lado do Restaurante Rancho do Boi", "PAINEL MENSAL", "15x5m"], ["Rod. Pres. JK (BR-040) ao lado do Restaurante Rancho do Boi", "PAINEL MENSAL", "15x5m"], ["Rodovia MG-05, 303 · Goiânia", "PAINEL MENSAL", "10x4m"], ["Rodovia MG-05, 303 · Goiânia", "PAINEL MENSAL", "10x4m"], ["Via Expressa de Contagem, 2754", "PAINEL MENSAL", "10x4m"], ["Via Expressa de Contagem, 2754", "PAINEL MENSAL", "10x4m"], ["BR-381 Fernão Dias · próximo à Fiat", "PAINEL MENSAL", "10x4m"], ["BR-381 Fernão Dias · próximo à Fiat", "PAINEL MENSAL", "10x4m"], ["BR-381, 1301 · Km 13 · Rod. Fernão Dias", "PAINEL MENSAL", "10x4m"], ["BR-381, 1301 · Km 13 · Rod. Fernão Dias", "PAINEL MENSAL", "10x4m"], ["MG-10 · Km 23 · Alphaville", "PAINEL MENSAL", "18x6m"]];
const ppNorm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(rua|r|avenida|av|alameda|al|rodovia|rod|praca|pca|pres|presidente|professor|prof|dos|das|do|da|de|e)\b\.?/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const ppIdx = PADRAO_PONTOS.map(([end, tp, fm]) => {
  const n = ppNorm(end),
    num = (n.match(/\b\d{1,5}\b/) || [""])[0];
  return { num, pal: n.split(" ").filter((w) => w.length > 2 && !/^\d+$/.test(w)), tp, fm };
});
/* acha o padrão pelo número + nome da rua (ex.: "Rua da Bahia, 657 - Centro" → BANCA DE LED · 3x2m) */
function padraoPonto(p) {
  if (!p) return null;
  const n = ppNorm([p.nome, p.end].filter(Boolean).join(" ")),
    nums = n.match(/\b\d{1,5}\b/g) || [],
    pal = new Set(n.split(" "));
  let best = null,
    bs = 0;
  ppIdx.forEach((x) => {
    if (!x.num || !nums.includes(x.num)) return;
    const s = x.pal.filter((w) => pal.has(w)).length;
    if (s > bs) {
      bs = s;
      best = x;
    }
  });
  return best && bs >= 1 ? { tp: best.tp, fm: best.fm } : null;
}

/* ===== Excel dos pontos de uma campanha: endereço, latitude e longitude ===== */
function vtExcelPontos(id) {
  const v = S.vts.find((q) => q.id === id);
  if (!v) return;
  const L = vIds(v).map((i) => PMf(i)).filter((p) => p && (p.nome || p.end));
  const rows = L.map((p, k) => {
    const pad = padraoPonto(p) || {},
      ll = p.ll || null;
    return [k + 1, p.nome || "", p.end || "", p.tp || pad.tp || "", p.fm || pad.fm || "", ll ? +(+ll[0]).toFixed(6) : "", ll ? +(+ll[1]).toFixed(6) : "", ll ? "https://www.google.com/maps/search/?api=1&query=" + ll[0] + "," + ll[1] : ""];
  });
  const b = xlsxBlob([
    {
      name: "PONTOS",
      head: ["Nº", "Ponto", "Endereço", "Tipo", "Formato", "Latitude", "Longitude", "Google Maps"],
      rows,
      w: [5, 30, 52, 18, 12, 13, 13, 48],
    },
  ]);
  const a = document.createElement("a"),
    nome = String(v.tipo === "evento" && v.ev && v.ev.nome ? v.ev.nome : v.cliente || "CAMPANHA").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\-]+/g, "_").slice(0, 40);
  a.href = URL.createObjectURL(b);
  a.download = "PONTOS_" + nome + (v.pi ? "_PI_" + String(v.pi).replace(/[^\w\-]+/g, "-") : "") + ".xlsx";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1500);
  const sem = L.length - rows.filter((r) => r[5] !== "").length;
  if (sem) $("warn").innerHTML = '<div class="warn">Planilha gerada. ' + sem + (sem === 1 ? " ponto está" : " pontos estão") + " sem coordenada (lat/long em branco).</div>";
}
