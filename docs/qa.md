# QA — Projeto Ícaro

Checklist de garantia de qualidade antes de publicar. Sempre que possível,
rodar no `dist/` (build real), `vite preview` nesse dist.

## 1. Smoke — navegar a história inteira

Viewports mínimos para aprovar:

- 1440×900 (desktop forte)
- 768×1024 (tablet retrato)
- 390×844 (mobile/iPhone 12-ish)

Áreas comuns (achar em todos):

- Hero abre com título + CTA; rolar mostra o mundo atrás do texto.
- Câmera sobe e o foguete sobe junto; **reversível**: voltar o scroll volta o
  mundo (câmera, luz, foguete, exposição) para o mesmo quadro.
- Depois de parar de rolar ~1s, o mundo "assenta" no quadro do capítulo.
- Nav (hairline de progresso + links) funciona; âncora `#capitulo` única.
- Fallback de WebGL: desligar hardware accel → `StaticScene` mantém a história
  navegável (sem canvas quebrado).

## 2. Por capítulo

| id | checagem |
| --- | --- |
| `introducao` | hero legível sobre o mundo; CTA "CONHEÇA A MISSÃO" leva a `quem-somos` |
| `quem-somos` | cards de equipe com placeholder sinalizado; nomes/roles reais |
| `comeco` | linha do tempo legível; fotos marcadas se placeholder |
| `classificacao` | foguete em espiral (helix); números da classificação coerentes |
| `jornada` | copy coerente; nenhum valor monetário aqui |
| `meta` | "R$ 800" consistente com `campaign.goalCents` |
| `progresso` | barra/MoneyNumber refletem `raisedCents` (0 inicial) |
| `transparencia` | tabela completa; "última atualização" = lastUpdated; destinos citados |
| `apoio` | Pix: `classificacao` sem chave real → aviso claro; QR/Qr gerado com a chave; copiar/compartilhar |
| `lancamento` | contagem 3→2→1→0 conforme o scroll; no "0" sol/arc no máximo; CTA volta a `apoio` |

## 3. Interações

- **Scroll reversível** em todos os viewports (testar subir/descer rápido + lento).
- **Parallax com mouse** (desktop): leve, sem "puxar" o canvas; desligado com
  `prefers-reduced-motion`.
- **Navbar**: hairline chega a 100% no fim; links saltam com suavidade; hash é
  `replaceState` (voltar do navegador não luta com o scroll).
- **Botões**: "APOIAR O PROJETO" → seção apoio; Copiar Pix copia (chave real
  quando houver); Compartilhar → Web Share ou fallback clipboard; feedback com
  `role="status"`.
- **Contagem regressiva**: começa só em `t≥0.90` (fim do apoio).

## 4. Responsividade

- <900 px: grid agrega; tarefas de texto centradas ou colunas simples.
- <720 px: footer empilha; Pix reduz QR; nav colapsa para links mínimos.
- <480 px: tipografia reduz; hero sem vazamento horizontal; nada corta sob
  telas com notch (safe-area).
- Checa overflow horizontal (`document.scrollingElement.scrollWidth <= innerWidth` em quase todas as viewports).

## 5. A11y

- Cada seção tem apenas **um `h1`** (hero) e os demais `h2`; `aria-labelledby`
  aponta para o título.
- `role="progressbar"` na barra com `aria-valuenow`.
- Buttons com label; statuses com `role="status"`.
- Contraste texto/cuidado sobre cenas (scrims); foco visível nos botões.
- `prefers-reduced-motion` respeitado em animações CSS e no mundo.

## 6. Honestidade da campanha

- Não há **nenhum valor monetário inventado**: `raisedCents` só muda via
  `npm run funding`.
- `scripts/check-content.mjs` não deve falhar (sem `TODO_REAL_CONTENT` no
  `project.ts`); se falhar, o deploy é bloqueado.
- Todo texto "a publicar"/"a incluir" está marcado como pendente (estilo
  `pending-content`).

## 7. Build / CI

- `npx tsc --noEmit` ✓
- `npm test` ✓ (22 testes)
- `npm run content:check` deve passar antes de publicar.
- `npm run build` — chunks dentro do orçamento §1 do performance.md.

## 8. Ambientes

- O `firefox --headless` do ambiente de automação **não produz screenshots**
  (falha do compositor SWGL sem X11). Se precisar de raster, usar
  `scripts/render-og.mjs` (resvg) ou ambiente com Chromium/Playwright.
- Para os screenshots finais preferir: Chrome headless
  `--screenshot --window-size=1440,900 <url>#capitulo` ou Playwright
  `page.screenshot` em cada âncora.

## 9. Teste em produção (GH Pages)

Depois do deploy: checar URL `https://GITHUB_USERNAME.github.io/projeto-icaro/`
(e algumas âncoras `#capitulo`, ex. `#progresso` e `#apoio`), og-image visível
no share/OG, favicon OK, fontes locais carregando, e o mesmo comportamento
reversível no subpath (base './').

## 10. Overhaul 2026-09-18 (foguete de água) — validação manual pendente

Ajustes estruturais feitos e verificados por typecheck/testes/build:

- **Foguete agora é garrafa PET** (ar pressurizado + água): corpo PET
  transparente, água translúcida azul na metade inferior, cone preto, fita
  azul, 4 aletas off-white e bocal escuro. **Removidas** chama/glow âmbar/motor;
  ogiva agora pode ser "dourado de marca" apenas como anel de boca, sem emissive.
- **Propulsão = jato de água**: cone aditivo branco-azulado + névoa (sprite) +
  gotículas (Points) + PointLight frio `#bfe3ff`; nada de fogo.
- `rocketSpinAt` = 0 (foguete de água não rola); `jetThrottleAt` no lugar de
  `engineThrottleAt`; scratch objects sem alocação no render loop.
- Rastro (FlightPath) e medidor do LaunchPad em tons frios/azuis.
- Copy: "IGNIÇÃO"→"LANÇAMENTO" (Countdown, climax-sub, docs).
- Contraste: scrim agora cobre `support-copy` e `climax-copy`, mais opaco;
  text-shadow de segurança em títulos/parágrafos; `--muted` mais claro;
  `.nav.on-dark` definido (antes órfão).
- Mobile: botões da hero/climax full-width <720/<480; countdown reduzido.
- CSS/TSX da `StaticScene` (fallback) virou garrafa PET com jato de água.
- Ícones/favicon/apple-touch apontam para o logo real (PNGs gerados).
- Fotos reais em uso (equipe/lançamento/jornada) via `npm run assets:images`.

**Pendências de validação humana** (não automatizáveis neste ambiente):

- Verificação visual nos viewports 1440×900, 768×1024 e 390×844 do novo modelo
  (proporções, comentários de transparência do PET em relação ao céu). O
  Firefox headless deste ambiente não gera screenshots (SWGL) — usar
  Chromium/Playwright localmente.
- `imagens/images/16.28.59`, `16.29.00`, `16.29.02`, `16.29.01` foram
  classificadas com captions genéricos; confirmar a qual momento do projeto
  cada uma corresponde.
- Nomes da equipe, datas, Pix e comprovantes continuam `TODO_REAL_CONTENT`
  (bloqueando `content:check` por projeto — de propósito).

Resultados automatizados ao fim do overhaul: `tsc --noEmit` ✓ · `npm test`
**28 testes** ✓ · `npm run build` ✓ · preview servindo favicon/logo/og/fotos
com HTTP 200.