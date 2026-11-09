// Teste ponta a ponta: cada perfil entra e vê só o que deve. Uso: node e2e.js <porta> <pasta-de-prints>
const { chromium } = require('playwright');
const [,, PORT, OUT] = process.argv;
const BASE = `http://127.0.0.1:${PORT}/`;
const perfis = [
  { id: 'admin',       botao: 'Administrador', espera: { barra: true,  modulos: ['comercial'] } },
  { id: 'comercial',   botao: 'Comercial',     espera: { barra: false, modulos: ['comercial'] } },
  { id: 'operacional', botao: 'Operacional',   espera: { barra: false, modulos: ['operacional'] } },
  { id: 'manutencao',  botao: 'Manutenção',    espera: { barra: false, modulos: ['operacional'] } },
];
const resultados = [];
const ok = (nome, cond, extra='') => { resultados.push({ nome, ok: !!cond, extra }); console.log((cond ? 'OK   ' : 'FALHA') + ' ' + nome + (extra ? ' · ' + extra : '')); };

(async () => {
  const browser = await chromium.launch();
  for (const p of perfis) {
    const ctx = await browser.newContext({ viewport: { width: 1360, height: 820 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const erros = [], reqs = new Set();
    page.on('pageerror', e => erros.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text().slice(0, 200)); });
    page.on('request', r => { const u = r.url(); if (u.includes('/modulos/')) reqs.add(u.split('/modulos/')[1].split('/')[0]); });
    await page.goto(BASE);
    await page.waitForSelector('.teste-box button');
    await page.screenshot({ path: `${OUT}/00-login.png` });
    await page.click(`.teste-box button:has-text("${p.botao}")`);
    await page.waitForSelector('.palco iframe', { timeout: 15000 });
    await page.waitForTimeout(6000); // módulos terminam de carregar (boas-vindas do comercial etc.)
    ok(`[${p.id}] barra de administrador ${p.espera.barra ? 'aparece' : 'NÃO aparece'}`, (await page.locator('.barra').count() > 0) === p.espera.barra);
    const frames = page.frames().filter(f => f !== page.mainFrame());
    ok(`[${p.id}] módulos carregados = ${p.espera.modulos.join('+')}`, JSON.stringify([...reqs].sort()) === JSON.stringify([...p.espera.modulos].sort()), 'pediu: ' + [...reqs].join(','));
    await page.screenshot({ path: `${OUT}/${p.id}-1.png` });
    if (p.id === 'admin') {
      await page.click('.barra .item[data-id=operacional]');
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `${OUT}/admin-2-operacional.png` });
      await page.click('.barra .item[data-id=backup]');
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${OUT}/admin-3-backup.png` });
      await page.click('.barra .item[data-id=usuarios]');
      await page.waitForTimeout(4000);
      await page.screenshot({ path: `${OUT}/admin-4-usuarios.png` });
    }
    if (p.id === 'admin') ok('[admin] depois de abrir Operacional os dois módulos foram carregados', JSON.stringify([...reqs].sort()) === JSON.stringify(['comercial','operacional']));
    ok(`[${p.id}] sem erros de JavaScript`, erros.length === 0, erros.slice(0, 4).join(' | '));
    await ctx.close();
  }
  await browser.close();
  const falhas = resultados.filter(r => !r.ok).length;
  console.log(`\n${resultados.length - falhas}/${resultados.length} verificações ok`);
  require('fs').writeFileSync(`${OUT}/resultado.json`, JSON.stringify(resultados, null, 1));
  process.exit(falhas ? 1 : 0);
})();
