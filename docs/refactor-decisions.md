# Decisões de Refactor — Projeto Ícaro (Jornada OBAFOG)

Registro das decisões tomadas ao longo do refactor, com justificativa e alternativas.
Cada decisão deriva de um achado em `docs/refactor-audit.md` e é referenciada pelo código
(A1, A2, …). Estado: **todas aplicadas** e verificadas em disco.

## 1. Escopo-valor (premissa-mãe)

**ACE-1** — Refactor é *behavior-preserving*: saída visual/narrativa/textual **idêntica**
(pipeline sem screenshots; verificação via tsc + 34 testes de caracterização + build +
preview). Nada foi "melhorado funcionalmente" para além do que os pontos de risco exigiam.
- Trade-off aceito: código antigo (que só degrada com *tempo de carregamento* e *fragmento
  de bundle*) recebeu extração **sem** reescrita de lógica, e o perf work foi entregue na
  forma de ganhos **não-atuantes no visual** (limits de frameloop, delta-clamping,
  adaptative LOD, memo em nós Three, `dpr` cap) + um aviso de chunk documentado.

**ACE-2** — Não há snapshots visuais; a garantia é **caracterização** (ver `tests/`):
cada módulo testável virou uma função pura verificada por propriedades conhecidas da
assinatura atual. Onde o comportamento era inerente de UI/cena (Three/r3f), o time pragmático
foi: testar a matemática (scheduler, spline, rocketPath, money/pix/share) e cobrir o resto
com `tsc strict`.

## 2. Decisões por categoria

### Organização / domínios

**O-1 (aplicada)** — Dividir o monolito `src/components/three/` em subdomínios
`three/rocket` (foguete e peças), `three/world` (planeta, sol, arco, poeira, glow, pad) e
manter `Conductor/Experience/StaticScene/Post/FlightPath` na raiz **somente como orquestração**
(um `useFrame`, LOD, post). Nenhuma lógica de negócio em componentes visuais.

**O-2 (aplicada)** — `src/components/dom/` ganhou `sections/` com **uma seção por capítulo**
(10 capítulos → 10 componentes) mais `ChapterSection` como mapeador puro
`chapterIndex → section`. Copy permanece em `story/chapters/manifest.ts` e `data/`.

**O-3 (aplicada)** — Story inteiro moveu para `src/story/`: `chapters/` (manifest,
camera/keys, atmosphere/tracks, flight/engine+rocketPose, countdown) + barrel público.
Campanha (meta/copy/fotos) em `src/data/`. Utilitários puros em `src/utils/` (money,
pix, share, placeholders, navigation, motion/device, spline, webgl, sim).

**ARQ-1 (aplicada)** — Barrel público **apenas** em `story/chapters/index.ts` (e
`utils/` são importados por tipo). Sem barrel por pastinha de `components/*` — decisão
explícita contra "import paths com 3 níveis de barrel" para manter imports rastreáveis.

### Hooks / React

**H-1 (aplicada)** — `useWorldTime`/`useActiveChapter` → **`useSimValue(() => campo)`**:
um único hook reativo que lê `sim` por seletor. Remove dois hooks quase idênticos, unifica
a API de consumo e elimina o problema de "dois valores derivados dessincronizados".

**H-2 (aplicada)** — Scroll: `useScrollConductor` (scroll)→ atualiza `sim.target` direto
imperativo; `sim.smooth` é computado no `useFrame` do `Conductor` (única fonte de tempo de
mundo). Navbar/Countdown/ChapterSection consomem via `useSimValue` (re-render só quando o
valor lido muda).

### Three.js / performance

**T-1 (aplicada)** — Damping explícito no `Conductor`: `sim.smooth += 
(sim.target − sim.smooth) * damping` com `delta-clamp` (`Math.min(delta, MAX_DELTA)`) para
evitar explosão em tabs ocultas; `LOD` adaptativo (conta slow frames, reduz partículas/DPR)
quando abaixo de um limiar de FPS.

**T-2 (aplicada)** — Divisão visual é **layout-only**; materiais/geometrias com idêntica
configuração anterior (cores/tamanhos preservados). Nada de refazer a cena.

### CSS

**C-1 (registrada, NÃO aplicada — ver abaixo)** — Originalmente previa tokens em
`src/styles/global.css` (escala de z-index, breakpoints 900/720/480, remoção de regras
mortas). **Decisão ACE-1/H-3 aplicada na prática**: `global.css` tem **1.496 linhas** e
nenhum teste/snapshot cobre o CSS (ver `docs/refactor-audit.md` § Limitações). Alterar
z-index ou remover regras sem o smoke visual de snapshots **arrisca o comportamento
visual** — exatamente o que o refactor promete preservar. Portanto, CSS fica **intocado**
nesta iteração; o mapeamento de tokens fica registrado como trabalho futuro
documentado (§ Próximo), não como entrega falsa.

**C-2 (registrada, não aplicada agora)** — Auditabilidade CSS via ferramenta (stylelint)
é **adiada**: sem package manager de CSS padronizado e sem lighthouse, este passo fica
documentado como "próximo", não entra no gate verde (risco de quebra > ganho).

## 3. Decisões adiadas / registradas

- **ESLint**: o repositório não tem config de lint. Decisão **LIN-1**: adicionar ESLint
  mínimo em fase própria (não entrou no gate atual para não adicionar ferramenta que muda
  o comportamento de build sem testes de caracterização na suíte). Registrado para o
  próximo ciclo: `eslint + typescript-eslint + react-hooks/recommended` (regras
  funcionais, warnings).
- **stylelint / chromeless screenshots / deploy GH Pages**: fora do escopo deste refactor
  (ver docs/refactor-audit.md § "Fora de escopo" e docs/architecture.md § "Limitações").

## 4. Nota de conformidade

Todas as decisões acima têm **status verificado no disco**: `find src tests` confirma a
árvore; `npx tsc --noEmit` = 0 erros; `npm test` = 34/34 verdes; `npm run build` ok;
`npm run preview` responde 200.

## 5. Ciclo 2 (2026-09-18 — verificação final)

Fechamento dos itens que estavam registrados como adiados e dos últimos cheiros
residuais. Nenhuma mudança altera comportamento renderizado.

**LIN-1 (aplicada)** — ESLint mínimo adicionado e **verde**:
`eslint@10` + `typescript-eslint@8` + `eslint-plugin-react-hooks@7` em `eslint.config.js`
(flat config). Regras: `@typescript-eslint/no-explicit-any` (error),
`no-unused-vars` (error, prefixo `_` ignorado), `react-hooks/rules-of-hooks` (error),
`react-hooks/exhaustive-deps` (warn). `npm run lint` = 0 erros / 0 warnings em 71 arquivos.
- Alternativas: stylelint + chromeless (rejeitadas, ver C-1/C-2). `exhaustive-deps: warn`
  preserva os padrões deliberados de effect único.
- Trade-off: mais um devDependency; config enxuta, sem regras de estilo opinativas.

**F-1 / F-2 / F-3 (aplicadas)** — Índices de capítulo digitados como números mágicos
(Footer: `scrollToChapter(0/1/5/8/9)`; IntroSection: `scrollToChapter(1)`; Navbar:
`activeRef.current > 2`) substituídos por `chapterIndexById(id)` — o navegador deixa de
quebrar silenciosamente se a ordem do manifest mudar. Mesh resolvido é exatamente o mesmo.
- Trade-off: `chapterIndexById` roda no render (O(n) sobre 10 capítulos — irrelevante).

**F-4 (aplicada)** — `hasRealPixPayload` virou type predicate (`payload is string`),
removendo 2 casts `(payload as string)` em `pix.ts` e `QrPix.tsx` sem alterar a lógica.

**F-5 (aplicada)** — `useSimValue` trocou o cast duplo `as unknown as number` por
`Number(current)` para comparação com epsilon (NaN ≥ epsilon → `false`, comportamento idêntico).
