# Arquitetura — Projeto Ícaro (Jornada OBAFOG)

Documento de referência pós-refactor. Descreve a estrutura **real** verificada em disco
(gate `find src tests`), a lógica de domínios e o fluxo de dados do scroll storytelling.

Estado da verificação (última rodada de gates):

- `npx tsc --noEmit` → 0 erros
- `npm run lint` → 0 problemas (ESLint 10 + typescript-eslint + react-hooks; 71 arquivos)
- `npm test` → 34 testes / 8 arquivos, todos verdes
- `npm run build` → build `vite` ok (aviso de chunk > 900 kB, não bloqueante)
- `npm run preview` → 200 + HTML renderizado no smoke check

## 1. Estrutura de diretórios

```
src/
├── App.tsx                      # fiação: webglAvailable? Experience : StaticScene
├── main.tsx
├── components/
│   ├── dom/                     # UI em DOM (arvore de seções + widgets)
│   │   ├── sections/            # 10 seções do capítulo + SectionHeader
│   │   │   ├── ClimaxSection.tsx / IntroSection.tsx / CrewSection.tsx
│   │   │   ├── OriginSection.tsx / QualificationSection.tsx / JourneySection.tsx
│   │   │   ├── GoalSection.tsx / ProgressSection.tsx / SupportSection.tsx
│   │   │   ├── TransparencySection.tsx
│   │   │   └── SectionHeader.tsx
│   │   ├── ChapterSection.tsx   # dispatcher: chapter → Section (dispatch por kind)
│   │   ├── Navbar.tsx / Footer.tsx / ShareButton.tsx / CopyPixButton.tsx
│   │   ├── Countdown.tsx / PixArea.tsx / QrPix.tsx / MoneyNumber.tsx
│   │   ├── Reveal.tsx / PlaceholderText.tsx / ProgressBar.tsx
│   │   └── PhotoFigure.tsx
│   └── three/                   # cena Three.js
│       ├── Conductor.tsx        # motor: um único useFrame orquestra tudo
│       ├── Experience.tsx       # root da cena (entrada)
│       ├── FlightPath.tsx / StaticScene.tsx / Post.tsx (PostProcessing)
│       ├── rocket/              # foguete PET (sem combustão; água + ar)
│       │   ├── Rocket.tsx
│       │   └── dimensions.ts / finGeometry.ts / materials.ts
│       └── world/               # ambiente da cena
│           ├── Dust.tsx / LaunchPad.tsx / Planet.tsx / SpaceBackground.tsx
│           ├── SunAndArc.tsx
│           └── glowTexture.ts
├── data/
│   ├── campaign.ts              # meta (goalCents: 80000) + PIX/copy/telegram
│   └── project.ts               # linha do tempo, fotos, capa, estatísticas
├── hooks/
│   ├── useScrollConductor.ts    # scroll → sim (corrente de scroll)
│   └── useSimValue.ts           # leitura reativa do sim (substitui useWorldTime/useActiveChapter)
├── story/
│   ├── chapters/                # DOMÍNIO da narrativa
│   │   ├── index.ts             # barrel público
│   │   ├── manifest.ts          # Chapter type + CHAPTERS + chapterIndexById
│   │   ├── camera.ts            # CAMERA_KEYS / FOV_KEYS
│   │   ├── atmosphere.ts        # TRACKS (sem engine track)
│   │   ├── flight.ts            # ENGINE_TRACK / ROCKET_POSE_TRACKS / HELIX
│   │   └── countdown.ts         # countdownAt
│   ├── rocketPath.ts            # curva do foguete (usa ENGINE_TRACK de chapters/flight)
│   └── scheduler.ts             # centerFractions + worldTimeAtFraction + activeChapterIndex
├── styles/
│   └── global.css               # tokens CSS, layout, breakpoints (1496 linhas)
└── utils/
    ├── money.ts                 # formatação BRL (compacta/completa)
    ├── pix.ts                   # MIN_PIX_PAYLOAD_LENGTH / hasRealPixPayload / pixCopyValue
    ├── share.ts                 # buildShareContent (reusa money.formatBRLCompact)
    ├── placeholders.ts          # TODO_REAL_CONTENT + placeholders da campanha
    ├── sim.ts                   # tipo Sim (estado do storytelling)
    ├── motion.ts                # detectDeviceProfile + QUERIES (noFinePointer)
    ├── navigation.ts            # scrollToChapter
    ├── spline.ts                # spline cúbica
    └── webgl.ts                 # supportsWebGL
tests/                           # vitest: 8 arquivos / 34 testes (caracterização)
```

> Nota: o layout de referência do usuário (`src/three`, `src/dom`) é diretriz; a base
> real do repositório é `src/components/{three,dom}` e foi **mantida** (decisão ARQ-1),
> apenas recebendo subpastas `three/rocket`, `three/world`, `dom/sections`.

## 2. Domínios e responsabilidades

- **`story/`** — único lugar que conhece a narrativa (capítulos, tempos, track do foguete
  no scroll). Nada de UI aqui; consumidores importam via barrel `story/chapters`.
- **`data/`** — conteúdo factual da campanha (meta, PIX, timeline, fotos) e o marcador
  `TODO_REAL_CONTENT` para os trechos ainda pendentes de conteúdo real.
- **`components/three/`** — representação visual da Jornada. `Conductor` concentra o
  ticking (single `useFrame` + damping + `MAX_FRAME_STEP`); `Experience` monta a cena;
  `world/` e `rocket/` são unidades visuais independentes.
- **`components/dom/`** — seções narrativas em DOM e widgets atômicos (Pix, share,
  copying, countdown, progress). `ChapterSection` é dispatch puro por `chapter.kind`.
- **`hooks/`** — ponte React ↔ sim: notificação de scroll e leitura reativa de um campo.
- **`utils/`** — funções puras (formatadores, PIX, share, spline, detecção) sem dependência
  de React/Three.

## 3. Fluxo de dados

```
scroll do usuário
   │  useScrollConductor (hook)
   ▼
sim.target (utils/sim.ts)          ← valor exato 0..1 (scroll-driven)
   │  Conductor (three) — damping + MAX_FRAME_STEP
   ▼
sim.smooth (tempo de mundo)
   ├─ scheduler (story): centerFractions → activeChapterIndex
   ├─ Navbar/Countdown: useSimValue(() => sim.chapterIndex / smooth)
   └─ cena: rocketPath (ENGINE_TRACK) → Rocket; TRACKS atmosfera/helix → world
```

Narrativa é conduzida **por scroll** (não por tempo): um capítulo fica ativo quando a
fração do scroll cruza o centro da seção. `chapterIndex` rege Navbar, `useSimValue`
mantém os consumidores sincronizados com um único estado imperativo `Sim`.

## 4. Decisões estruturais

- Dois barrels apenas: `story/chapters/index.ts` (domínio) — sem barrel por pastinha
  utilitária para evitar acoplamento espúrio (ARQ-1).
- `sim` continua store imperativo + hook de leitura (ARQ-2); não foi promovido a estado
  React global para não re-renderizar a cena a cada scroll.
- Um único `useFrame` no `Conductor` orquestra cena + LOD adaptativo (ARQ-3).
- Identidade física preservada: foguete **PET**, propulsão por **água + ar pressurizado**,
  **sem fogo/comustão**; dourado só em marca/iluminação. Meta `goalCents = 80000`
  (R$ 800,00).

## 5. Limitações de verificação

Ver `docs/refactor-audit.md` (§ Limitações). O pipeline de teste é **sem snapshots de
tela** (sem Chromium/screenshots no ambiente). Garantias vêm de: tsc strict, 34 testes de
caracterização, build + preview 200 + revisão humana local. Deploy GH Pages fica a cargo
do usuário (sem CLI `gh` autenticada neste ambiente; ver passos no relatório final).
