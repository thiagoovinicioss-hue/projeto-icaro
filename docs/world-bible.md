# World Bible — Projeto Ícaro

Documento de referência do site da campanha. Tudo o que dirige a narrativa, o
mundo e o comportamento interativo ao vivo no DOM. Se um detalhe de conteúdo
precisa mudar, ele tem um dono aqui: os arquivos citados.

---

## 1. Conceito

One-page cinematográfica: um mundo WebGL persistente ao fundo, dirigido por
**scroll nativo reversível**. O usuário não "anima" nada com botões — a mesma
posição de scroll produz sempre o mesmo estado do mundo (mesma câmera, mesmo
tempo, mesmo capítulo), em qualquer direção.

Trilha a jornada de **dois estudantes** classificados para a **Jornada OBAFOG**:
do chão da escola até a meta de **R$ 800** para a base e o foguete.

## 2. Arquitetura em duas camadas

| Camada | O que é | Tecnologia |
| --- | --- | --- |
| **Mundo** | canvas WebGL fixo por trás do conteúdo | React Three Fiber + three + drei + postprocessing |
| **Story** | texto, fotos, tabelas, Pix, contagem | React DOM em cima, com scroll nativo |

O DOM passa por cima; nenhum elemento DOM tem z-index sobre o canvas exceto o
que precisar (scrims, cards). O canvas tem `pointer-events: none`.

**Fallback**: se WebGL não existir, o `StaticScene` desenha o mesmo "cenário"
em CSS puro (estrelas, sol, foguete, planeta) e a história continua 100%
navegável.

## 3. O tempo de mundo

- `t` vai de **0.0 (topo)** a **1.0 (fim do scroll)**.
- A unidade é o **centro medido das seções**: `measureSections()` lê os 10
  `section.chapter`, mapeia cada centro num `t_fraction ∈ [0,1]`.
- `scrollFraction()` = `scrollY / (docHeight - innerHeight)` (nunca fora de
  0..1).
- `worldTimeAtFraction` converte fração de scroll em `t` interpolando pelos
  centros medidos — é por isso que o mundo "segue" o texto mesmo se as seções
  mudarem de altura.
- `sim.target` = valor exato (resultado imediato do scroll).
- `sim.smooth` = valor cinematográfico (damped, λ=3.4; snap direto com
  `prefers-reduced-motion`). Todo render lê `sim.smooth`.
- O scroll deixa o mundo "deslizar" suavemente; parar de rolar faz o mundo
  assentar no quadro exato do capítulo.

**Semântica**: scroll nativo = fonte da verdade. A mesma posição de scroll dá o
mesmo `sim.smooth` (após assentar) e o mesmo capítulo, bidirecionalmente.

Owner: `src/story/scheduler.ts`, `src/story/chapters.ts`, `src/hooks/useScrollConductor.ts`.

## 4. Os 10 capítulos

| id | t | peso visual | função |
| --- | --- | --- | --- |
| `introducao` | 0.00–0.14 | 1.35 | hero aberto, label "do chão ao espaço" |
| `quem-somos` | 0.14–0.27 | 1.05 | Dois estudantes. Uma missão. (equipe) |
| `comeco` | 0.27–0.40 | 1.00 | de onde viemos, linha do tempo |
| `classificacao` | 0.40–0.53 | 1.30 | classificação na OBAFOG (helix) |
| `jornada` | 0.53–0.64 | 0.95 | o novo desafio (a Jornada) |
| `meta` | 0.64–0.74 | 1.05 | R$ 800 para a base e o foguete |
| `progresso` | 0.74–0.83 | 1.20 | quanto já subimos (missão/barra) |
| `transparencia` | 0.83–0.90 | 0.95 | os números, sem maquiagem |
| `apoio` | 0.90–0.955 | 1.25 | Pix, QR, compartilhar |
| `lancamento` | 0.955–1.00 | 1.50 | contagem regressiva → lançamento |

Cada capítulo declara `weight` (altura relativa em vh) e `align`
(left/right/center). O front end desenha o capítulo com base em `kind`, não em
index — as 10 funções são separadas no `ChapterSection`.

Owner: `src/story/chapters.ts` (ledger), `src/components/dom/ChapterSection.tsx` (render).

## 5. O foguete

- Modelo **procedural** (`Rocket.tsx`) de um **foguete de garrafa PET** (ar
  pressurizado + água): corpo PET transparente com água translúcida na parte
  inferior, cone preto artesanal, fita azul, 4 aletas off-white e bocal escuro.
- Propulsão é **água**: jato cônico + névoa + gotículas nas cores frias
  (branco→azul), PointLight frio `#bfe3ff`. **Sem chama, rogueira, exhaust ou
  brilho âmbar** — o dourado permanece apenas como cor de marca/arte.
- Posição **analítica** (`rocketPath.ts`): `rocketPosition`, `rocketDirection`,
  `rocketPose` (posição + up/frente), `helixBlendAt`, `jetThrottleAt`.
- **Hélice**: `t ∈ [0.40, 0.74]` — o foguete sobe em espiral (radius 1.6, 3
  voltas, rampa senoidal) durante a "classificação".
- Depois assenta numa subida íngreme até o final.
- Um foguete de água **não rola** sobre o próprio eixo: `rocketSpinAt` é 0 e o
  atitude segue a tangente da trajetória (reduced motion agnóstico).
- O rastro (`FlightPath`) é um tubo Catmull-Rom preamostrado com shader próprio
  que "reveals" conforme `uReveal = f(t)` (cor fria, tom de névoa).

Owner: `src/components/three/Rocket.tsx`, `src/story/rocketPath.ts`, `src/components/three/FlightPath.tsx`.

## 6. A câmera

Keyframes autorais (`CAMERA_KEYS`, 20 pontos): posição, alvo e fov. Spline
Catmull-Rom **centrípeta** (`sampleSpline`) interpola posição e alvo; fov é
piecewise. Parallax de pointer (desktop, `pointer-events: none` no canvas,
capturado por evento no window) adiciona ±0.35/±0.2; desligado com reduced
motion. `toneMappingExposure`, intensidades de luz, fog (near/far/cor), poeira
e sol são tracks piecewise (`TRACKS`) dirigidas por `t`.

Units: UP = +Y, câmera olha de frente para o foguete; foguete anda para +Z,
sobe em +Y.

Owner: `src/components/three/Conductor.tsx`, `src/story/chapters.ts` (CAMERA_KEYS/TRACKS).

## 7. A contagem regressiva

Lida do tempo de mundo (`countdownAt(t)`), não de data:

- `t < 0.90` → silêncio
- `[0.90, 0.945)` → "3"
- `[0.945, 0.975)` → "2"
- `[0.975, 0.992)` → "1"
- `≥ 0.992` → "0" (lançamento)

No "0" o efeito de lançamento (sol/arc no máximo, jato de água forte) fica
no máximo.

Owner: `src/story/chapters.ts` (`countdownAt`), `src/components/dom/Countdown.tsx`.

## 8. Projeto e dados (100% locais, nada inventado)

Valores monetários **sempre em centavos** (nunca float).

- `src/data/campaign.ts`: `goalCents: 80_000` (R$ 800), `raisedCents` e
  `lastUpdated` — atualizados só pelo script `npm run funding -- <valor>`.
- `src/data/project.ts`: conteúdo factual. Tudo que ainda não é fato conhecido
  é o literal `TODO_REAL_CONTENT` — o site mostra "placeholder sinalizado" e
  nunca inventa nome/escola/datas/Pix/fotos/valores.
- `scripts/funding.mjs` valida entrada, converte para centavos e regrava o
  arquivo (sem valor monetário inventado no commit).
- `scripts/check-content.mjs` falha o build se restar `TODO_REAL_CONTENT`.
- O valor arrecadado alimenta: barra de progresso, "Falta R$ X", medidor de
  água/tanque no LaunchPad 3D e a linha "Meta" da transparência.

Owner: `src/data/*`, `src/utils/money.ts`, `src/utils/placeholders.ts`, scripts.

## 9. Qualidade e desempenho (governors)

`quality` (`src/utils/sim.ts`) recebe o perfil do aparelho
(`detectDeviceProfile`):

| chave | papel |
| --- | --- |
| `dprCap` | teto de `devicePixelRatio` (1.25 ⚡ até 2.0 ★) |
| `particles` | 0 ou 1 → monta/reduz `Dust` e Stars |
| `post` | Bloom/Vignete/SMAA ligado ou desligado |
| `shadows` | shadow map no key light (desktop forte) |
| `reducedMotion` | prefere navegador; snap de sim, sem parallax, sem roll |

O `Conductor` mede o **EMA do frame time** e, se sustentado (>42 ms por 3s),
rebate o DPR para 1.25 uma única vez por sessão. Canvas entra em `frameloop
demand` quando a aba fica oculta (`useScrollConductor` não roda frames à toa).

Owner: `src/utils/sim.ts`, `src/utils/motion.ts`, `src/components/three/Conductor.tsx`.

## 10. Axe da campanha honesta

1. Meta física e finita (R$ 800 → base + foguete). 
2. Progresso real, atualizado pontualmente pelo `npm run funding`.
3. Transparência: tabela de números + notas/comprovantes "a incluir quando existirem".
4. Pix próprio da equipe (chave/QR), copiar/compartilhar legado.
5. Zero inventado: placeholders visíveis enquanto não há foto/pix real.

## 11. Deploy

- `base: './'` (roda em subpath do GitHub Pages).
- Workflow `.github/workflows/deploy.yml`: typecheck → test → content:check →
  build → deploy Pages. Precisa de `gh auth login` (ou token) para criar o repo
  (`gh repo create projeto-icaro --public --source . --push`).
- Trocar `GITHUB_USERNAME` em `index.html` (canonical/OG) pelo usuário real.

## 12. Glossário de camadas

| termo | definição |
| --- | --- |
| `sim.target` | tempo de mundo exato, resultado do scroll |
| `sim.smooth` | tempo renderizado, damped |
| `t` | `sim.smooth`, 0..1 |
| weight do capítulo | altura relativa (vh) da seção |
| centers | centros medidos das seções já renderizadas |
| `scrollFraction` | posição normalizada do scroll |