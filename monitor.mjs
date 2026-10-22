import {chromium} from 'playwright';
import fs from 'node:fs';
import {parseListing} from './filter.mjs';

// Nenhum token deve ser escrito em arquivos versionados ou logs.
const token = process.env.TELEGRAM_BOT_TOKEN?.replace(/[\s\u200B-\u200D\uFEFF]/g, '');
let chat = process.env.TELEGRAM_CHAT_ID;
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
  if (!chat) {
    if (!token) throw new Error('Configure TELEGRAM_BOT_TOKEN nos Secrets.');
    if (!/^\d{8,12}:[A-Za-z0-9_-]{35}$/.test(token)) {
      throw new Error('O segredo salvo não tem o formato completo de token do Telegram (números, dois-pontos e código). Nenhuma credencial foi exibida.');
    }
    async function telegramRead(method) {
      let response;
      try {
        response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {signal:AbortSignal.timeout(20000)});
      } catch { throw new Error('Não foi possível conectar ao Telegram.'); }
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(`Telegram recusou a consulta: HTTP ${response.status}. Confira o token nos Secrets.`);
      return result.result;
    }
    const me = await telegramRead('getMe');
    if (me.username !== 'catiraudia_ps5_bot') throw new Error('O token não corresponde ao bot catiraudia_ps5_bot.');
    const updates = await telegramRead('getUpdates?limit=100&allowed_updates=%5B%22message%22%5D');
    const ids = [...new Set(updates.filter(u=>u.message?.text === '/start' && u.message.chat.type === 'private').map(u=>u.message.chat.id))];
    if (ids.length !== 1) throw new Error('Não foi possível identificar uma única conversa com /start. Envie /start ao bot novamente. Nenhuma mensagem foi enviada.');
    chat = ids[0];
    await send(`🎮 Catiraudia: teste do Telegram funcionando!\nSeu CHAT_ID: ${chat}\nSalve esse número como TELEGRAM_CHAT_ID nos Secrets do repositório catiraudia-ps5.\nO monitor do Facebook continua desligado: a leitura de anúncios na nuvem ainda não foi validada.`);
  } else {
    await send('🎮 Catiraudia: conexão com Telegram funcionando. Monitor do Facebook ainda em teste.');
  }
  console.log('Telegram aceitou a mensagem de teste. Nenhum token, mensagem recebida ou identificador de conversa foi registrado nos logs.');
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
      const close = page.getByRole('button',{name:/^(Fechar|Close)$/});
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

