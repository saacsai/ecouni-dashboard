# EcoUni Dashboard — Status

Última atualização: 2026-08-14 (sessão interrompida por reunião — retomar amanhã)

## Sessão de hoje (2026-08-14)

- feat: dashboard pedidos com pré-turno e romaneio (`e5488c2`)
- feat: identidade visual EcoUni — logo + paleta em `lib/brand.ts` (`37439e1`)
- fix: cast Supabase join result via unknown para PedidoFull[] (`e853da7`)
- **fix: cria `/dashboard/precos`** (`66e6962`) — a rota não existia (só o link na
  Sidebar), causava 404. Página criada, lista produtos ativos no cardápio da
  semana e faz upsert em `ecouni_precos` (canal `ecouni`).

## ⚠️ PENDENTE DE VALIDAÇÃO (não testado em produção ainda)

O usuário estava testando o fluxo "cadastrar produto → ver no cardápio → dar
preço" quando entrou em reunião. Retomar exatamente daqui amanhã:

1. Confirmar que o produto cadastrado aparece em Dashboard → Cardápio (precisa
   antes ter disponibilidade com `qtd_ecouni > 0` vinculada a esse produto).
2. Publicar o produto no cardápio da semana.
3. Abrir `/dashboard/precos` em produção e confirmar que:
   - a página carrega (sem 404),
   - o produto publicado aparece na lista,
   - salvar um preço funciona (upsert em `ecouni_precos`).
4. Abrir `/pedido/[ciclo_id]` do ciclo da semana e confirmar que o preço
   definido aparece corretamente (hoje cai em 0 se não houver preço — não é
   erro, é o fallback do código, ver `app/pedido/[ciclo_id]/page.tsx:94`).

## 🐛 Suspeita a investigar amanhã

A Sidebar (`components/Sidebar.tsx`) tem links para rotas que **não existem**
no `app/dashboard/`, o mesmo tipo de bug que causou o 404 em Preços:

- `/dashboard/visao` (Visão do Gestor)
- `/dashboard/estoque` (Estoque Físico)
- `/dashboard/consignacao` (Consignação)
- `/dashboard/atacado` (Vendas Atacado)
- `/dashboard/usuarios` (Usuários)

Essas provavelmente também dão 404 se clicadas. Não são bloqueio do fluxo
principal (pedido/cardápio/preço), mas vale decidir: ocultar da sidebar até
serem construídas, ou construir as páginas.

## Pendente — por prioridade (herdado, ainda válido)

1. ~~Portal /disponibilidade + dashboard pedidos/romaneio~~ ✅ feito hoje
2. **Dashboard: tela de aprovação de disponibilidades** — gestor vê o que veio
   de cada cooperativa, ordenado por urgência (`prazo_pedido_dias`), faz
   pedido de compra → status vira `'pedido_feito'`
3. **PIX integration** — Bling QR Code
4. **Agentes LIA + MIA** — Evolution + n8n (fase futura)
5. **Stripe** — cartão + assinatura (fase 2)
6. Resolver/ocultar os links mortos da sidebar (ver seção acima)

## Arquivo não commitado

- `logotipo/logo_ecouni_original.png` — arquivo fonte do logo, fora do
  controle de versão de propósito (o `public/logo_ecouni.png` já commitado é
  o que o app usa). Deixar como está, não precisa commitar.
