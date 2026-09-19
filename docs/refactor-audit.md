# Refatoração — Auditoria (FASE 1)

Data: 2026-09-18 · Escopo: `src/` + `tests/` (≈ 4.800 linhas).

Objetivo: **refatorar preservando comportamento** — layout, design, copy, fotos,
animações, scroll storytelling, responsividade, Pix, acessibilidade e performance
devem permanecer idênticos no resultado renderizado.

## Baseline medido

| Gate | Resultado |
| --- | --- |
| `npx tsc --noEmit` | limpo (strict, noUnusedLocals, noUnusedParameters) |
| `npm run lint` | **adicionado no Ciclo 2** (ESLint 10 + typescript-eslint + react-hooks): 71 arquivos, 0 problemas |
| `npm test` | 28/28 verdes |
| `npm run build` | OK (~7 a 8 s), único aviso: chunk three > 900 kB (pré-existente) |
| Preview | `/` e todos os assets (`og-image.png`, fotos, ícones) HTTP 200 |
| Screenshots de baseline | **impossível neste ambiente** (headless Firefox sem compositor SWGL/X11, sem Chromium) → QA visual humano local + gates acima |

> Atualização (Ciclo 2 — verificação final): testes evoluíram para **34/34**, e o preview
> foi revalidado (`vite preview` → 200 em `/`, CSS, JS e fotos). Totais e achados abaixo
> refletem o estado final do código.

## Código morto (remover — risco baixo)

| # | Local | Problema | Ação |
| --- | --- | --- | --- |
| D1 | `src/components/three/handles.ts` | `flightPathHandles` nunca é importado em lugar algum | Remover arquivo |
| D2 | `src/utils/sim.ts` | `pausedAt`, `sections`, `adaptive` declarados/inicializados e **nunca lidos ou escritos** | Remover campos do tipo `Sim` e do objeto |
| D3 | `src/hooks/useActiveChapter.ts` | `chapterIdToAnchor` exportado e nunca importado | Remover |
| D4 | `src/utils/motion.ts` | `QUERIES.finePointer` nunca usado | Remover |
| D5 | `src/data/project.ts` | `TimelineEvent.real` (tipo) e `real: false` (dados) nunca lidos | Remover campo e valores |
| D6 | `src/components/three/Environment.tsx` | `return { geometry, colors }` com `void colors` (bind morto, lixo) | Retornar só o necessário |

## Duplicação de lógica

| # | Local | Problema | Ação |
| --- | --- | --- | --- |
| X1 | `src/utils/share.ts` | Formatação de moeda `Intl` duplicada do `formatBRLCompact` (money.ts) | Reutilizar `formatBRLCompact` |
| X2 | `PixArea.tsx`/`CopyPixButton.tsx` (`pixCopyValue`) vs `QrPix.tsx` | Limiar mágico `40` (payload Pix válido) duplicado em 2 lugares | Criar `utils/pix.ts` com `hasRealPixPayload` + `MIN_PIX_PAYLOAD_LENGTH`, usar nos 3 pontos |
| X3 | `Navbar.tsx` + `ChapterSection.tsx` (clímax) | `CHAPTERS.findIndex((c) => c.id === …)` repetido e `link de apoio`; clímax usa `document.getElementById('apoio').scrollIntoView` em vez de `scrollToChapter` (ignora reduced motion) | Criar helper `chapterIndexById` no domínio story; reutilizá-lo. Clímax passa a usar `scrollToChapter` |
| X4 | `src/story/scheduler.ts` | `worldTimeAtFraction` e `activeChapterIndex` reconstroem `chapterCenters` (map) cada chamada | Extrair helper puro `chapterCenterFractions(centers)` |

## Organização / responsabilidade única

| # | Arquivo | Linhas | Problema | Ação |
| --- | --- | --- | --- | --- |
| O1 | `dom/ChapterSection.tsx` | 375 | Dispatcher de 10 kinds **+ 7 subcomponentes** (Crew, Timeline, LaunchPhotos, Goal, Transparency, hero, apoio…) | `dom/sections/` com um arquivo por seção + dispatcher |
| O2 | `three/Environment.tsx` | 275 | 5 entidades de cena (Stars, Dust, Planet, SunAndArc, LaunchPad) + fábrica de textura + animações `useFrame` num arquivo | `three/world/` (um arquivo por entidade + textura) |
| O3 | `three/Rocket.tsx` | 289 | Materiais + textura procedural + geometria de aleta + componente | `three/rocket/` (Rocket, materials, finGeometry, dimensions) |
| O4 | `story/chapters.ts` | 296 | Ledger único misturando: manifest de capítulos, CAMERA_KEYS, FOV_KEYS, 13 TRACKS de atmosfera, HELIX, `countdownAt` | `story/chapters/` (manifest, camera, atmosphere, countdown, index *barrel*) |
| O5 | `hooks/useActiveChapter.ts` | — | Nome enganoso: mistura hook de leitura com funções de navegação (`scrollToChapter`) | Manter o hook; mover navegação para `utils/navigation.ts` |
| O6 | `utils/share.ts` | — | Mistura conteúdo de compartilhamento com decisão de cópia do Pix (`pixCopyValue`) | Mover Pix para `utils/pix.ts` |

## React / hooks

| # | Local | Problema | Ação |
| --- | --- | --- | --- |
| H1 | `dom/Navbar.tsx` | Effect (scroll) re-inscreve listener a cada mudança de `active` (churn por scroll) | Single effect de mount usando `activeRef` |
| H2 | `App.tsx` | Dois estados redundantes `hasGL` + `displayFallback` espelhando o mesmo booleano | Um único booleano + `supportsWebGL` em `utils/webgl.ts` |
| H3 | `hooks/useWorldTime.ts` + `useActiveChapter.ts` | Dois subscribers rAF quase idênticos (epsilon + setState por frame) | Unificar em `useSimValue(select, epsilon)` |
| H4 | `dom/ChapterSection.tsx` | `useMemo` desnecessário em `introFade` (derivação barata por frame) | Computar direto |

## Três.js / cena

| # | Local | Problema | Ação |
| --- | --- | --- | --- |
| T1 | `three/Conductor.tsx` | Números mágicos (damping 3.4, parallax 2.2, `1/24`, governador 42 fps / 3 s / DPR 1.25) e luzes + frame loop juntos | Constantes nomeadas; luzes em `three/world/Lights.tsx`; PMREM pode permanecer (pequeno). **Manter um único `useFrame`** (orquestrador coerente, evita frames duplicados) |
| T2 | `three/Rocket.tsx` | Guarda `mats.pet` sempre verdadeira; dimensões da garrafa espalhadas no código | `three/rocket/dimensions.ts` com dimensões nomeadas ("onde ajustar o foguete") |
| T3 | `three/Rocket.tsx` | `if (mats.pet) mats.pet.opacity` — `pet` sempre definida | Remover guarda |

## Estilo / tokens

| # | Local | Problema | Ação |
| --- | --- | --- | --- |
| C1 | `styles/global.css` | z-index literais (nav 50, skip 60), paleta de scrim/rgba repetida, breakpoints literais (900/720/480) espalhados | Tokens `--z-*` + comentário-cabeçalho mapeando breakpoints; remoção conservadora de regras verificadamente mortas |
| C2 | — | `spline.ts` está em `utils/` (matemática) — ok | Manter |

## Testes de caracterização (lacunas)

| # | Falta | Ação |
| --- | --- | --- |
| G1 | `scheduler.ts` (math crítica do scroll: worldTimeAtFraction, activeChapterIndex) sem teste | Adicionar testes de caracterização |
| G2 | Separação do pix (X2) sem teste específico | Cobrir `hasRealPixPayload` |

## Decisões a registrar (`docs/refactor-decisions.md`)

- **LIN-1** — Lint: adicionar ESLint mínimo (`typescript-eslint` + `eslint-plugin-react-hooks`, `exhaustive-deps: warn`) com script `npm run lint`; `noUnusedLocals/Parameters` continuam responsabilidade do `tsc`. Motivo: o gate `lint` da metodologia exige um linter real.
- **ARQ-1** — Barrels: `story/chapters/index.ts` re-exporta o domínio (imports externos intactos); demais pastas importam arquivos diretos (deps explícitas). Evita ciclos e churn.
- **ARQ-2** — Estado global: `utils/sim.ts` permanece o store imperativo por design (loop de frame compartilhado); não migrar para estado observável de biblioteca.
- **ARQ-3** — Um único `useFrame` orquestrador em `Conductor` (câmera + luzes + exposição + fog) — evita múltiplos loops independentes lendo `sim.smooth` (anti-padrão citado na metodologia).
- **ACE-1** (aceitos, riscos conhecidos): `as never` no ref polimórfico de `Reveal`; casts `Record<string, unknown>` em `placeholders.ts` (input desconhecido); shaders GLSL colocalizados nos componentes; tuning de pós-processamento (Bloom/Vignette) inline.

## Fora de escopo (não-refatorar)
- Conteúdo real ainda pendente (nomes, datas, Pix, escola) — aguarda o usuário (`TODO_REAL_CONTENT`).
- Captions/legendas das fotos caminho (`jornada-*.jpg`) — aguarda confirmação do papel visual.
- Deploy GH Pages — aguarda `gh` do usuário.
- Métricas numéricas da trajetória/câmera (keyframes autorais) — não é duplicação, é *design*.

## Ciclo 2 — verificação final (2026-09-18)

Rodada fechando os últimos pontos, ainda sem tocar em comportamento visual/narrativo:

### Resolvidos neste ciclo

| # | Local | Antes | Depois |
| --- | --- | --- | --- |
| F-1 | `dom/Footer.tsx` | `scrollToChapter(0/1/5/8/9)` — índices mágicos presos à ordem do manifest | `chapterIndexById(id)` via `FOOTER_LINKS` (ids declarativos) |
| F-2 | `dom/sections/IntroSection.tsx` | `scrollToChapter(1)` mágico | `scrollToChapter(chapterIndexById('quem-somos'))` |
| F-3 | `dom/Navbar.tsx` | `activeRef.current > 2` (scrim do canvas) | `activeRef.current >= chapterIndexById('classificacao')` |
| F-4 | `utils/pix.ts` + `dom/QrPix.tsx` | `hasRealPixPayload` retornava `boolean`; casts `(payload as string)` em 2 lugares | type predicate `payload is string` — cobrindo por narrowing, sem casts |
| F-5 | `hooks/useSimValue.ts` | cast duplo `(current as unknown as number)` | `Number(current)` — sem cast, sem cambio de comportamento (NaN ≥ epsilon é `false`) |
| LIN-1 | repo | sem linter (decisão adiada) | `npm run lint` verde: ESLint 10 + typescript-eslint + react-hooks, 71 arquivos / 0 problemas |

### Observações registradas (não alteradas)

- `Navbar` lê `sim.target` no render para a hairline; atualiza só quando o capítulo muda
  (via `useSimValue`). Comportamento atual intencional (“re-render só quando o valor lido
  muda” — ARQ-2/H-2). Se o QA visual mostrar o traço “degrau” indesejado, o fix é trocar a
  leitura por `useSimValue(() => sim.target * 100, 0.01)` — mudança deliberada, fora deste ciclo.
- `quality.particles` (profile do device) só é aplicado no gate `{quality.particles > 0 && <Dust />}`;
  `Dust` ignora a contagem e usa `DUST_COUNT = 1400` próprio. O governor de DPR/frameloop é o
  mecanismo de degradação efetivo. Registrado para o ciclo de performance.
- CSS segue **intocado** (decisão C-1): z-index literais (0/1/−1/50/60) e breakpoints
  (900/720/480) sem tokens — mapeado como trabalho futuro, risco visual > ganho.
- `Reveal` mantém `ref={ref as never}` (cast polimórfico, ACE-1) e `placeholders.ts` os casts
  `Record<string, unknown>` para input desconhecido (ACE-1).
- WebGL resources (texturas/materiais/geometrias criados via `useMemo`) são descartados apenas
  se o `Canvas` desmontar; na prática a cena vive por toda a sessão — carência aceita.