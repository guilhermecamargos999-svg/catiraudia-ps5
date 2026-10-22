import {chromium} from 'playwright';
import fs from 'node:fs';
import {parseListing} from './filter.mjs';

// Nenhum token deve ser escrito em arquivos versionados ou logs.
const token = process.env.TELEGRAM_BOT_TOKEN;
const chat = process.env.TELEGRAM_CHAT_ID;
const dryRun = process.env.DRY_RUN !== 'false';
const statePath = 'state/seen.json';
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {cities: {}};
const locations = ['uberlandia', 'araguari', 'uberaba', 'tupaciguara', 'araxa'];
async function send(text) {
  if (!token || !chat) throw new Error('Configure os dois secrets do Telegram.');
  let response;
  try {
    response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({chat_id:chat,text,link_preview_options:{is_disabled:true}}), signal:AbortSignal.timeout(20000)});
  } catch { throw new Error('Falha de conexão com o Telegram.'); }
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error('Telegram recusou o envio. Verifique os secrets e o Start no bot.');
}
if (process.env.TEST_TELEGRAM === 'true') {
  await send('🎮 Catiraudia: conexão com Telegram funcionando. Monitor do Facebook ainda em teste.');
  process.exit(0);
}
const browser = await chromium.launch();
let failures = 0;
try {
  const context = await browser.newContext({locale:'pt-BR'});
  for (const location of locations) {
    const page = await context.newPage();
    try {
      const response = await page.goto(`https://www.facebook.com/marketplace/${location}/search/?query=ps5&maxPrice=3200&sortBy=creation_time_descend`, {waitUntil:'domcontentloaded',timeout:60000});
      console.log(`${location}: HTTP ${response?.status()}; página: ${await page.title()}`);
      const close = page.getByRole('button',{name:'Fechar',exact:true});
      try { await close.click({timeout:5000}); } catch {}
      await page.locator('a[href*="/marketplace/item/"]').first().waitFor({timeout:30000});
      const cards = await page.locator('a[href*="/marketplace/item/"]').evaluateAll(links => links.map(a => ({url:a.href,text:a.getAttribute('aria-label') || a.innerText})));
      const found = new Map();
      for (const card of cards) {
        // A versão em linhas geralmente apresenta preço antes do título.
        let text = card.text;
        if (/^R\$/.test(text.trim())) {
          const lines = text.split('\n').map(s=>s.trim()).filter(Boolean);
          const prices = lines.filter(s=>/^R\$/.test(s));
          const rest = lines.filter(s=>!/^R\$/.test(s));
          if (rest.length >= 2) text = `${rest[0]}, ${prices[0]}, ${rest.slice(1).join(', ')}`;
        }
        const item = parseListing(text,card.url);
        if (item) found.set(item.id,item);
      }
      console.log(`${location}: ${cards.length} cartões lidos; ${found.size} consoles dentro dos filtros.`);
      if (dryRun) continue;
      const previous = state.cities[location];
      const seen = new Set(previous || []);
      // A primeira execução estabelece a base sem enviar anúncios antigos.
      for (const item of found.values()) {
        if (previous && !seen.has(item.id)) {
          const price = item.price.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
          await send(`🎮 ${item.title}\n💰 ${price}\n📍 ${item.city}\nVisto pela primeira vez agora pelo monitor; horário de publicação não confirmado.\n${item.url}`);
        }
        seen.add(item.id);
        state.cities[location] = [...seen];
        fs.mkdirSync('state',{recursive:true});
        fs.writeFileSync(statePath,JSON.stringify(state,null,2));
      }
      if (!state.cities[location]) {
        state.cities[location] = [];
        fs.mkdirSync('state',{recursive:true});
        fs.writeFileSync(statePath,JSON.stringify(state,null,2));
      }
    } catch (error) {
      failures++;
      console.error(`${location}: não foi possível validar a busca. Login, bloqueio, URL ou formato da página podem ter mudado. Nenhum bloqueio será contornado.`);
      console.error(String(error.message).split('\n').slice(0,3).join(' ').slice(0,400));
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
if (failures) process.exitCode = 1;

