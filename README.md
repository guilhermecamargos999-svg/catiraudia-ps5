# Catiraudia — monitor experimental de PS5

PS5 por até R$ 3.200 em Uberlândia, Araguari, Uberaba, Tupaciguara e Araxá. Não está implantado nem validado no GitHub. A busca pública de Uberlândia foi observada no navegador; as outras cidades e a extração em servidor precisam de validação.

## Ativação

1. Crie um repositório GitHub com estes arquivos na raiz. Para manter os runners padrão gratuitos, use um repositório público. O código, os filtros e os IDs de anúncios já vistos serão públicos; os secrets não devem ser publicados em arquivos.
2. Em Settings > Secrets and variables > Actions > Secrets, adicione `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`. Nunca coloque o token no código ou em capturas de tela dos logs.
3. Para descobrir o chat ID, consulte o método `getUpdates` da API oficial do Telegram em ambiente local, depois de enviar Start ao bot. Use `message.chat.id` da sua própria conversa; não escolha automaticamente o primeiro usuário recebido. Não publique a resposta, pois contém dados de mensagens.
4. Em Actions > Monitor PS5 > Run workflow, execute `telegram` e confirme o recebimento da mensagem de teste.
5. Execute `validar`. Confira se todas as cinco cidades têm cartões lidos e se os endereços mostram as cidades corretas. Se houver bloqueio, login exigido ou erro, não ative o agendamento. Não há solução de CAPTCHA, proxy ou contorno de bloqueios neste projeto.
6. Execute `monitorar` para estabelecer a base inicial. Os anúncios dessa execução não serão enviados. Execute novamente para testar a persistência.
7. Só após validar, adicione a variável de repositório `MONITOR_ENABLED` com o valor `true` na aba Variables. Para pausar, altere para `false`.

## Limites

- Consulta programada a cada dez minutos, sujeita a atrasos do GitHub. Não promete detectar todos os anúncios nem garantir tempo desde a publicação.
- A Meta restringe coleta automatizada sem permissão. Confirme a autorização aplicável antes de ativar: https://about.fb.com/news/2021/04/how-we-combat-scraping/
- Endereços de cidades, filtros e HTML do Facebook podem mudar. Login ou bloqueio fazem a execução falhar visivelmente em Actions, sem interpretar o erro como ausência de anúncios.
- Filtro de título é heurístico. Anúncios enganosos e parcelas podem escapar; revise o anúncio. Acessórios e anúncios com preço zero são excluídos.
- A busca tem raio e pode incluir outras cidades; a lista final exige uma das cinco cidades no cartão. Apenas cartões carregados inicialmente são analisados.
- Estado salvo por commit; uma falha entre envio e persistência pode repetir um alerta. Não há garantia de entrega exatamente uma vez.
- GitHub pode desativar agendamentos de repositórios públicos inativos. Verifique a aba Actions periodicamente. Não há alerta independente se todo o workflow parar.
- Nunca envie credenciais do Facebook para este repositório.

Custos de runners padrão em repositórios públicos: https://docs.github.com/en/billing/concepts/product-billing/github-actions

## Testes locais

`npm test` testa o filtro sem rede. `npm install` e `npx playwright install chromium` preparam a execução local. `npm run monitor` valida buscas sem enviar mensagens por padrão.
