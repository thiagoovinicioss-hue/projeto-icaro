# Performance — Projeto Ícaro

Estratégia de desempenho, medições e metas aceitáveis. O site é intensivo em
WebGL mas deve abrir rápido e não travar o scroll.

## 1. Orçamento

| recurso | orçamento |
| --- | --- |
| Bundle total (gzip) | < 400 kB |
| Trecho three + r3f + drei (gzip) | ~265 kB (chunk separado, lazy não necessário) |
| Trecho post + drei (gzip) | ~75 kB |
| App/DOM (gzip) | ~26 kB |
| Fontes (variáveis + Space Mono) | ~130 kB gzip, servidas locais |
| First paint | < 1.5 s em desktop típico (4G) |
| Quadros mantidos (frame EMA) | ≥ 24 fps constantes; > 40 ms/frame sustentado → degrada |

Há **três chunks manuais**: `three`, `post`, `react`. O build final do
`vite build` roda sobre eles.

## 2. Cortes no custo constant

1. **Sem assets 3D carregados** (GLB/fontes do three): o foguete de água, o
   mundo e o brilho são **procedurais** (lathe PET + planes + points) no bundle.
2. **Estrelas** são 320 pontos num buffer único, `AdditiveBlending`,
   `fog:false`, sem sombras. Poeira/sun/planetas da versão anterior foram
   **removidos** (mundo tranquilo: `Backdrop` + `LaunchStand` + `ClimaxGlow`).
3. **Uma única passada de pós**: Bloom (mipmap) + Vignette + SMAA num
   `EffectComposer`, `multisampling = 0` (SMAA cuida da aliasing).
4. **Shadows** só no perfil forte (`quality.shadows`), num único
   `DirectionalLight` com shadow-camera pequena.
5. Texto/QA em CSS puro (nenhuma imagem de fundo raster do mundo); scrims de
   contraste são radiais CSS (zero custo de render no WebGL).
6. O Three é importado **lazy** (chunk separado); se desativado
   (`EXPERIENCE_DISABLED=true`), nenhum byte de three é baixado.

## 3. Governors por aparelho

`detectDeviceProfile()` em `src/utils/motion.ts`:

| perfil | dprCap | particles | post | shadows |
| --- | --- | --- | --- | --- |
| simples (mobile/médio, esposo) | 1.25 | 0 | off | off |
| padrão (desktop médio) | 1.5 | 1 | off | off |
| forte (desktop GPU dedicada) | 2.0 | 1 | on | on |

O EMA do frame time vive no `Conductor`: `ema = ema*0.9 + delta*0.1`. Se
`ema > 42 ms` por **3 s sustentados** → `quality.dprCap = 1.25` e
`gl.setPixelRatio(1.25)` **uma vez** por sessão (latches).

`document.hidden` → `frameloop="demand"` (nenhum frame enquanto a aba não está
visível).

`prefers-reduced-motion` → sem parallax, sem roll do foguete, `sim.smooth`
copia `sim.target` sem damp (economiza matemática e movimento).

## 4. Decisões de render desligadas por aparelho

- `depthWrite: false` em additivos (poeira, névoa/jato, glow, arc, sun) → menos
  churn no depth buffer VS.
- `sizeAttenuation` ligado, mas tamanho de pontos pequeno (0.05) para não
  estourar fill.
- Fog dinâmico fecha o olhar: objects beyond `fog.far` (até 44) não
  sobrepõem; friendly para fill.
- Sem escurecimento de `new THREE.Color` por frame (tracks pré-interpoladas em
  foco por keyframe próprios).

## 5. Como medir

- **CDP/DevTools**: Performance panels em https://pixelscan - no projeto rode
  o `vite preview`/`dev`, abra o DevTools → Performance → Record scroll.
- **FPS in-page**: inspecionar `performance.now()` no loop e o EMA logado no
  console (definível no dev). A auditoria (`_cinema_audit.mjs`) lê `probe.fps`.
- **Bundle**: `npx vite build` (tabela de chunks) — metas §1.
- **Memória**: Heap snapshot com tab oculta em `frameloop demand`; `Rocket`,
  `WaterJet`, `Backdrop` e `Conductor` **não alocam por frame** (geometrias em
  `useMemo`; buffers de partícula pré-computados; singletons `_pos/_tgt/_fog*`).

## 6. Armadilhas conhecidas / regras

- Nunca criar `THREE.Vector3`/`Color` dentro do `useFrame` — usar singletons
  `_pos`/`_tgt`/`_fog*`/`_rocketSample` do `Conductor`.
- Nunca reconstruir geometria por frame (lathe PET/fins/cone são pré-montados
  uma vez; a água drena por `scale.y`, não rebuild).
- Não ligar `Resolver`/normal pass no composer a menos que o efeito exija.
- A projeção de QA exige matrizes frescas: `camera.updateMatrixWorld(true)` +
  `matrixWorldInverse.copy(matrixWorld).invert()` antes de `project()`
  (senão lê-se o frame anterior).
- `pin` (`?stage3d=N`) congela o mundo; `prefers-reduced-motion` usa só
  `nearestStage` (5 posições estáticas).
- Atualização de DPR é **uma via** (não sobe de novo após degradar).

## 7. Medições atuais (snapshot)

Medido em **2026-09-18** (`vite build` local, base `./`, fase cinema):

| chunk | bruto | gzip |
| --- | --- | --- |
| `index` (app + React + DOM) | 57.08 kB | 20.48 kB |
| `Experience` (cena + cinema + foguete) | 22.61 kB | 8.14 kB |
| `post` (postprocessing) | 159.30 kB | 74.82 kB |
| `three` (three + r3f + drei) | 958.79 kB | 265.24 kB |
| `index.css` | 26.01 kB | 6.06 kB |

> Aviso pré-existente (não bloqueante): chunk `three` > 900 kB. O orçamento é por
> **JS gzip total ≈ 375 kB** (sem fontes, servidas localmente ≈ 130 kB). Cena em
> produção: **29 objetos · ~9.7k triângulos** (medição estrutural do auditor);
> frame-time/FPS finos ficam para QA visual humano (ver limitações no audit).