# Auditoria visual — Projeto Ícaro

> Fase de reconstrução da camada visual (2026-09-18). Este documento registra o
> que estava quebrado, o que foi reconstruído, as medições antes/depois e o que
> resta para a fase do 3D.

**Método.** Auditoria programática em navegador real (Playwright/Chromium
headless) nos viewports **1440×900 · 768×1024 · 390×844 · 430×932**: overflow
documento/elemento, quebra de linha de títulos (getClientRects + altura real),
contraste compositado, imagens quebradas, seções vazias e tamanho de alvos
de toque. Screenshots reais salvos para conferência humana (`_capture.mjs`).

---

## 1. Estado de partida (herdado da reconstrução anterior)

As falhas catastróficas já estavam corrigidas quando esta sessão começou:

| problema anterior | situação |
| --- | --- |
| Overflow horizontal em todos os viewports (52–237 px) | ✅ 0 px em todos |
| Seções travadas em `100vh` + `sticky` cortando conteúdo | ✅ fluxo editorial normal |
| `text-shadow` como "scrim" em ~15 regras | ✅ removido; texto tem camada própria |
| Textos < 12px em 8 classes | ✅ nenhum |
| "CLASSIFICADOS" transparente com contraste 1.05:1 | ✅ azul sólido dourado legível |
| Parágrafos alinhados à direita ilegíveis | ✅ `text-align: left` |
| Three.js no fluxo principal | ✅ desativado durante reconstrução; **reativado na fase cinema** (`EXPERIENCE_DISABLED=false`), still lazy (chunk pronto) |

## 2. Problemas encontrados nesta sessão (e correção)

### 2.1 Hero — título virava "parede de texto" e o CTA ficava abaixo da dobra

Medição no desktop 1440×900:

| métrica | antes | depois |
| --- | --- | --- |
| fonte do h1 | 94.4 px (`clamp(…, 7.2vw, 5.9rem)`) | 74.9 px (`clamp(2.2rem, 5.2vw, 4.8rem)`) |
| altura do h1 | **589 px / 6 linhas** | **234 px / 3 linhas** (`text-wrap: balance` + `max-width: 22ch`) |
| CTA "CONHEÇA A MISSÃO" | y=933 (abaixo da dobra de 900 px) | y=680..726 (visível no load) |
| espaço abaixo do CTA | 72 px (vazio) | 174 px respiro consistente |

Mudanças: `--text-hero` reduzido; `.hero-headline` `max-width:16ch→22ch` +
`text-wrap:balance`; `.hero-copy` `max-width` liberado para 860 px (o medida
66ch de `.chapter-copy` era o que realmente estrangulava a linha).

Contraste da fonte do hero sobre o fundo `#020812`: **> 14:1** (sem shadow).

### 2.2 Climax — título de fechamento em 4 linhas

`climax-title` `max-width:20ch` + fonte grande → 4 linhas. Corrigido para
`clamp(2rem, 4.6vw, 3.75rem)` + `max-width:26ch` + `text-wrap:balance` →
**2 linhas** em desktop/tablet.

### 2.3 "CLASSIFICADOS" quebrava em 2 linhas desconexas no mobile 390

`--text-classified: clamp(3rem, 8.5vw, 5.75rem)` com `min` de 3rem (48 px) >
largura útil (350 px) → quebra. Ajustado para `clamp(2.5rem, 8.5vw, 5.5rem)`
(40 px no mobile): **1 linha em todos os 4 viewports**, sem overflow.

### 2.4 Alvos de toque pequenos

| elemento | antes | depois |
| --- | --- | --- |
| `.nav__brand` (botão "voltar ao início") | 34 px | 46 px |
| `.footer__link` (links do rodapé) | 27 px | 46 px |
| `.nav__link` (links da barra) | ~34 px | ~42 px |
| `.btn` (CTAs) | variável | `min-height: 46px` |

Nenhum alvo < 40 px em nenhum viewport (verificado por script).

### 2.5 Bloqueio de Three.js no load

`Experience` era import estático → o chunk `three` (961 kB / 266 kB gzip)
baixava mesmo com o 3D desligado. Agora é **import preguiçoso** (`React.lazy` +
`Suspense` com fallback `StaticScene`): enquanto `EXPERIENCE_DISABLED=true`,
**nenhum byte de three.js é baixado** (verificado interceptando requests).
Bundle principal: `index 58 kB / 21 kB gzip` + CSS `25 kB / 6 kB gzip`.

### 2.6 Ritmo e continuidade editorial

- **Classificação** ganhou um "release moment": hairline dourado fino acima do
  kicker + brilho dourado sutil (α 0.09) atrás da palavra. Sem confete, sem fogo.
- **Progresso · Transparência · Apoio** ("instrumentos da missão") receberam um
  campo navy muito sutil (`z-index:-1`, dentro do contexto do `.story`) que
  conecta o bloco de dados da campanha sem alterar o contraste do texto
  (compositado ≈ 10–14:1).

### 2.7 Fotografia — crop editorial de retratos

Fotos verticais de pessoas (equipe e jornada) com `object-fit: cover`
centralizado podiam cortar rostos no topo. Adicionado
`object-position: center 22%` para `.crew-card` e retratos da jornada; as fotos
do foguete/paisagem seguem com corte central (mais segurança para a base).

### 2.8 Foto do lançamento maior

`launch-photos` passou de `max-width: var(--container-narrow)` (780 px) para
`var(--container)` (1160 px) — o lançamento agora ocupa o respiro cheio da
seção de classificação.

---

## 3. pós-reconstrução — medições (build de produção, `vite preview`)

| viewport | overflow do doc | imagens quebradas | seções vazias | baixo contraste <4.5 (texto <24 px) | títulos hero/climax/classif |
| --- | --- | --- | --- | --- | --- |
| 1440×900 | 0 px | 0 | 0 | nenhum | 3 / 2 / 1 linhas |
| 768×1024 | 0 px | 0 | 0 | nenhum | ok |
| 390×844 | 0 px | 0 | 0 | nenhum | 4 / 2 / 1 linhas |
| 430×932 | 0 px | 0 | 0 | nenhum | ok |

Único elemento com `scrollWidth > clientWidth`: `.progress-mission__marker`
intencional (marcador dourado de 12 px numa linha de 1 px).

Screenshots finais: `_capture.mjs` → 40 capturas (4 viewports × 10 âncoras)
em produção (base `./`).

---

## 4. O que foi preservado (sem invenção)

- **Dados e campanha**: `project.ts`, `campaign.ts` (meta R$ 800, valor
  começando em R$ 0), sistema local `funding.mjs`, `TODO_REAL_CONTENT`.
- **Fotos reais** (equipe, lançamento, jornada) sem conteúdo inventado.
- **Semântica/honestidade**: placeholders `pending-content`, transparência.
- **Lógica Pix/QR/compartilhar/copiador** e `MoneyNumber` (contagem que converge
  ao valor real).
- **Código Three.js intacto** em `src/components/three/**` — apenas o carregamento
  virou preguiçoso; reativar = `EXPERIENCE_DISABLED = false`.
- **Reduced motion, foco visível, skip link, keyboard navigation.**

## 5. Problemas restantes (para pessoas/3D)

- Conteúdo real pendente (`npm run content:check` falha de propósito): nomes,
  escola, datas da classificação e da timeline, Pix/beneficiário, e-mail,
  instagram, comprovantes, orçamento itemizado.
- NA próxima fase (3D): revalidar o texto sobre a cena viva usando as regras de
  camada própria já implementadas (o texto não depende de shadow). — **feito na
  fase cinema**: texto em camada própria (`z-index:1`), scrims suaves
  (`textContrastMode`), foguete banido das faixas de texto (projeção NDC
  medida, ver auditoria §7).
- Validação humana das fotos: confirmar qual imagem do `imagens/images/`
  corresponde a cada captura e se `object-position` das pessoas está bom em
  aparelhos reais.

## 6. Verificação final

`npx tsc --noEmit` ✓ · `npm run lint` ✓ · `npm test` (39 testes + 5 invariantes do cinema) ✓ ·
`npm run build` ✓ (base `./`) · auditoria nos 4 viewports em cima do build ✓.

Para reproduzir: `npm run dev` → `node _capture.mjs shots` (ou `URL=http://localhost:5173 node _audit.mjs` /
`node _deep_audit.mjs`).

---

## 7. Fase cinema (3D) — auditoria programática

> Modelo de trabalho sem leitura de imagem: a composição é validada por
> **projeção NDC** (`probe.rocketScreen`) vs as bandas autorais de cada uma das
> 5 composições, em **4 viewports** (desktop/tablet/mobile/mobile430). As
> capturas estão em `/tmp/opencode/shots-3d/{viewport}-{composicao}.png`.

**`node _cinema_audit.mjs` → 226 checks, 0 falhas, zero erros de console.**

O que a auditoria garante, por composição × viewport:

| checagem | contrato |
| --- | --- |
| `?stage3d=N` congela a 5ª composição exata | `probe.stageId` casa com a comp. |
| Foguete dentro da faixa editorial | `rocketScreen.x` na banda da composição |
| Foguete em quadro (não cortado) | `|bottomY|,|topY| < 1.3` NDC |
| Câmera nunca atravessa o objeto | `cam.z > 2` |
| Fov autoral | 30–70 (44–55 no conteúdo) |
| Tier/câmera por aparelho | `deviceTier` casa com o viewport |
| Orçamento estrutural, uma vez | ≤ 400 objetos, ≤ 60k tris (medido: 29 obj · 9.7k tris) |
| Overflow horizontal do DOM | 0 px |
| `prefers-reduced-motion` | still por composição (`t` == `target`, destino alcançado) |
| Scroll rápido topo→fundo | números finitos, zero `pageerror` |

### Bugs reais caçados/bugs corrigidos nesta fase

1. **`R3F: Pre is not part of the THREE namespace`** — o `DebugHud` (`<pre>`)
   estava dentro do `<Canvas>`; a cena inteira abortava em todos os viewports.
   Movido para irmão DOM do canvas (corrigido).
2. **Scrims causavam overflow horizontal** — `inset: -6% -4%` sangrava 4% para
   fora de cada lado no mobile; trocado para `inset: -6% 0` (0 px de overflow).
3. **`probe.rocketScreen` com matriz defasada de 1 frame** — `project()` usava a
   `matrixWorldInverse` do *render anterior*; no reduced-motion o still parecia
   "voando" (ΔNDC 2.5 vs 0.02). O `Conductor` agora atualiza as matrizes da
   câmera antes de projetar (`updateMatrixWorld` + invert).
4. **Enquadramentos de hero** — desktop 0.538 (fora da banda 0.5) e tablet
   1.30 NDC (foguete fora de quadro!) → câmera do hero reajustada por tier
   (alvo do desktop em −0.85, tablet com knot próprio). Depois: todas as bandas
   verdes.
5. **Contagem de render irrelevante para QA** — `gl.info.render.*` sob o
   `EffectComposer` reportava 1 call/1 tri (sem valor); substituído por medição
   **estrutural** única (`objectCount`/`sceneTriangles`, 29 obj · 9.7k tris).

### Entregáveis 3D (desta fase)

- `src/story/cinema/` (types · knots · sample · index): 5 composições, 12 knots
  de câmera por tier, tracks de luz/névoa/fundo/jato/fill, helix ≤ 1/3 volta.
- Foguete de água premium (`rocket/`): garrafa PET lathe + água interna que
  drena + fitas azuis + cone preto + aletas off-white + anel dourado +
  `WaterJet` frio (sem chama).
- Mundo tranquilo: `Backdrop` (céu+estrelas+chão), `LaunchStand` (trilho em
  x=1.15), `ClimaxGlow` (arco dourado, sem fogo).
- `?debug3d=1` (`DebugHud`) e `?stage3d=N` (still exato) via scrims/texto
  próprios; notas em `docs/3d-rebuild.md`.