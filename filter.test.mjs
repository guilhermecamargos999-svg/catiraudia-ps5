import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseListing} from './filter.mjs';
const url = 'https://www.facebook.com/marketplace/item/1643448070894657/';
test('aceita console e preço brasileiro observado na busca', () => {
  assert.equal(parseListing('Vendo PlayStation 5 slim digital- PS5 digital, R$2.999, Uberlândia, MG', url).price, 2999);
});
test('rejeita acessórios, preço fictício, troca e cidades fora do filtro', () => {
  for (const text of ['Controle ps5 novo, R$300, Uberlândia, MG','PS5, R$0, Uberlândia, MG','Óculos Meta aceito troca em PS5, R$2.900, Uberlândia, MG','PS5, R$3.201, Uberaba, MG','PS5, R$3.000, Catalão, GO']) assert.equal(parseListing(text, url), null, text);
});
test('inclui preço limite e cidade com acento', () => {
  assert.equal(parseListing('PS5 Slim, R$3.200, Araxá, MG', url).city, 'Araxá');
});
