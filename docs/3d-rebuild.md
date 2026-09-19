# Reconstrução do 3D — "fase cinema"

> Decisão de design (brief do usuário): **o 3D serve ao texto**. Nenhuma
> "performanço do Three.js", nenhum `spin`, nenhum fogo. Scroll é a fonte de
> verdade; os knots são autorais, com repouso; o foguete é um foguete de **água**.
> Documento técnico da fase (2026-09-18).

## 1. Filosofia

1. **5 composições fortes** no lugar de movimento contínuo. O usuário desce, a
   câmera troca de quadro — cada quadro uma "fotografia" da missão.
2. **Câmera com intenção**: enquadra o texto, nunca persegue o objeto.
3. **Foguete de água premium** interpretando o real: garrafa PET transparente,
   cone preto, água azul que drena, fitas azuis, aletas off-white, bico plástico.
   Propulsão = **jato de água/ar frio**, zero fogo/rastro laranja.
4. **Todo objeto documenta a verdade**: o foguete é desencorajado a entrar na
   faixa de texto (projeção NDC medida e auditorada).
5. `prefers-reduced-motion` → **still**: só as 5 composições, sem damp nem bob.

## 2. Arquitetura

```
src/story/cinema/
  types.ts   Vec3 · CHRKey · ColorKey · CameraKnot · RocketKnot · DeviceTier · CompositionStage
  knots.ts   COMPOSITIONS (5) · CAMERA_DESKTOP/TABLET/MOBILE (12 t/eixos) · ROCKET_KNOTS
             · HELIX (≤1/3 volta, janela da classificação) · IDLE_KEYS · JET_KEYS · FILL_KEYS · TRACKS
  sample.ts  clampT · channelAt · colorAt · cameraAt · rocketAt · rocketSpinAt(=0) · jetAt · fillAt · nearestStage
  index.ts   re-exports públicos
```

- **Relógio**: DOM (`useScrollConductor` + `scheduler`) é o dono de `sim.target`
  e de `sim.smooth` (damp). O `Conductor` (r3f) lê `sim.smooth`, ainda dampa um
  pouquinho e aplica todos os tracks por frame.
- **Samplers sem alocação**: `out` fornecidos pelo chamador; quats/eulers são
  singletons do módulo. `rocketAt`, `cameraAt`, `channelAt`, `colorAt` são
  determinísticos em (t, deviceTier, reduced).
- **Medição**: `sim.probe` (câmera, foguete mundo & NDC, fov, fps, custo
  estrutural, jet/fill) preenchido pelo `Conductor`; exposto em
  `window.__icaro` pelo `DebugHud` (só monta com `?debug3d=1`).

## 3. As 5 composições (t → banda NDC do foguete)

| comp | t | foguete no mundo | banda `rocketScreen.x` | texto |
| --- | --- | --- | --- | --- |
| hero | 0.07 | sobre a torre (torre em x=1.15) | [0.16, 0.5] | centro/esquerda |
| história | 0.285 | parado à esquerda | [-0.5, 0.5] | direito/esquerda |
| classificação | 0.465 | subindo com helix leve | [-0.56, -0.05] | centro/esquerda |
| meta/progresso | 0.79 | cruzeiro alto à esquerda | [-0.58, -0.12] | direito |
| lançamento | 0.985 | 15 m subindo ao centro | [-0.2, 0.2] | centro (clímax) |

`rocketScreen.x` é o **centro da base do foguete em NDC** projetado com as
matrizes do próprio frame (corrigido na fase — ver bug 3 na visual-audit).

## 4. Contratos de "verdade" mantidos

| contrato | onde | teste |
| --- | --- | --- |
| scroll nativo é a única fonte de verdade | `useScrollConductor`+`scheduler` | `tests/scheduler.test.ts` |
| conta-água (não-fogo) | `fillAt` drena, `jetAt` pulsa, cores frias | `tests/rocket.test.ts` |
| sem spin | `rocketSpinAt(t) ≡ 0` | `tests/rocket.test.ts` |
| helix ≤ 1/3 volta, na janela certa | `HELIX` | `tests/chapters.test.ts` |
| 12 knots/tier ordenados, fov 30–70, | `CAMERA_*` | `tests/chapters.test.ts` |
| câmera nunca z < 2 (não atravessa o objeto) | | |
| quaternion unitário / números finitos | sample.ts | `tests/chapters.test.ts` |

## 5. QA programático (sem leitura de imagem)

`node _cinema_audit.mjs` → `http://localhost:4173` (produção):
- 4 viewports × 5 composições via `?stage3d=N` → 226 checks, **0 falhas**;
- reduced-motion, scroll rápido, `pageerror` monitorado (zero);
- custo estrutural: **29 objetos · 9.7k tris**;
- overflow do DOM: 0 px.
- Screenshots em `/tmp/opencode/shots-3d/{viewport}-{comp}.png` para conferência
  humana (o modelo não enxerga imagem; a validação de composição é por projeção).

## 6. Limitações conhecidas

- **Conferência visual é humana**: fotos reais, enquadramento fino (posição do
  cone/torque), cor exata da garrafa, tamanho do jato — olhos humanos validam a
  partir das capturas.
- Contagem de FPS sob WebGL headless é indicativa (`probe.fps` desde o EMA);
  frame-rate real precisa de aparelho/GPU dedicada.
- `gl.info.render.*` sob `EffectComposer` não reporta valor útil → QA financeiro
  usa medição estrutural.
- `chunk three` > 900 kB (avisado); lazy → não afeta o carregamento inicial.