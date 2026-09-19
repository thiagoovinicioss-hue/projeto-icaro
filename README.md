# Projeto Ícaro 💫

Do chão ao espaço. Um site-campanha cinematográfico para dois estudantes
classificados para a **Jornada da OBAFOG**, com uma meta honesta e física:
**R$ 800** para construir a base e o foguete da próxima etapa.

- **Mundo 3D persistente** dirigido por scroll nativo **reversível** (WebGL /
  React Three Fiber)
- **Fallback CSS** automático quando WebGL não existe
- **Campanha 100% local**: valor arrecadado só muda com um comando, nunca é
  inventado
- **QR/Pix, compartilhar, transparência** — tudo no próprio site, sem
  dependências externas

## Começando

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ (base './', pronto para subpath)
npm run preview    # serve o dist
```

## Comandos úteis

```bash
npm run typecheck        # tsc --noEmit
npm run lint             # eslint (src + tests) — 0 problemas
npm test                 # vitest (34 testes)
npm run funding -- 50    # registra R$ 50 arrecadados (aceita "120,50")
npm run funding -- --reset
npm run content:check    # falha se sobrar todo pendente (TODO_REAL_CONTENT)
npm run assets:og        # regera public/og-image.png a partir de og.svg
```

## Conteúdo real (IMPORTANTE)

> O site **não inventa nada**. Enquanto não houver dados reais, tudo que não é
> fato conhecido fica sinalizado como `TODO_REAL_CONTENT` (o html exibe um
> placeholder claramente marcado).
>
> Preencha `src/data/project.ts` seguindo [`REAL_CONTENT_CHECKLIST.md`](REAL_CONTENT_CHECKLIST.md)
> e rode `npm run content:check`. Só publique quando estiver verde.

## Estrutura

```
src/
  data/        campaign.ts (centavos, goal 80_000) · project.ts (conteúdo)
  story/       chapters.ts (ledger: copy, câmera, tracks, countdown)
               scheduler.ts · rocketPath.ts
  components/
    three/     Experience · Conductor · Rocket · FlightPath · Environment · Post · StaticScene
    dom/       ChapterSection (10 kinds) · Navbar · PixArea · ProgressBar · Countdown · Footer …
  hooks/       useScrollConductor · useWorldTime · useActiveChapter
  utils/       money · placeholders · sim/quality · spline · share · motion
  styles/      global.css (design system)
tests/         vitest (money, campaign, share, placeholders, chapters, rocket)
scripts/       funding.mjs · check-content.mjs · render-og.mjs · optimize-images.mjs
docs/          world-bible.md · performance.md · qa.md
.github/workflows/deploy.yml   (typecheck → test → content:check → build → Pages)
```

## Deploy (GitHub Pages)

1. `gh auth login` (ou fornecer token `GH_TOKEN`).
2. `gh repo create projeto-icaro --public --source . --push`
3. Habilite GitHub Pages → "GitHub Actions" (o workflow
   `.github/workflows/deploy.yml` cuida do build).
4. (Opcional, recomendado) No `index.html`, troque o `canonical` (placeholder
   `https://SEU_USUARIO.github.io/projeto-icaro/`) pela URL definitiva. O
   `og:image`/`twitter:image` já são relativos (`./og-image.png`) e funcionam
   em qualquer subpath sem reconfigurar.
5. Site em `https://SEU_USUARIO.github.io/projeto-icaro/`.

## Licença e ética

- Código: liberado para o projeto (MIT se desejado — abra issue).
- **Nunca** registrar valor arrecadado sem `npm run funding`; **nunca** inventar
  nomes, fotos, datas, Pix ou valores. Transparência é requisito do site.