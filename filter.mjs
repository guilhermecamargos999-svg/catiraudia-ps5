export const cities = ['Uberlândia', 'Araguari', 'Uberaba', 'Tupaciguara', 'Araxá'];
export const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function parseListing(text, url) {
  const id = url.match(/\/item\/(\d+)/)?.[1];
  const priceMatch = text.match(/R\$\s*([\d.]+(?:,\d{2})?)/);
  if (!id || !priceMatch) return null;
  const price = Number(priceMatch[1].replaceAll('.', '').replace(',', '.'));
  const title = text.slice(0, priceMatch.index).replace(/[\s,]+$/, '').trim();
  const normalized = normalize(title);
  const city = cities.find(c => normalize(text).includes(normalize(c)));
  if (!city || price <= 0 || price > 3200) return null;
  if (!/\bps\s*5\b|playstation\s*5|playstation cinco/.test(normalized)) return null;
  if (/^(controle|suporte|jogo|jogos|capa|carregador|headset|cabo|conta|code vein|gran turismo)\b/.test(normalized)) return null;
  if (/\b(aceito|aceita|troco|troca)\b.*\b(ps\s*5|playstation)/.test(normalized)) return null;
  if (/\b(parcela|parcelas|entrada|conserto|defeito|quebrado)\b/.test(normalized)) return null;
  return {id, title, price, city, url: `https://www.facebook.com/marketplace/item/${id}/`};
}
