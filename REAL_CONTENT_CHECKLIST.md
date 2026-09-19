# Real Content Checklist — Projeto Ícaro

> O site exibe exatamente o que está em `src/data/project.ts`. Tudo que ainda
> não é fato conhecido aparece como `TODO_REAL_CONTENT` e o html mostra um
> **placeholder claramente sinalizado**.
>
> **Regra de ouro: nunca inventar.** Se você não tem um dado, deixe-o pendente.
> Valores monetários só mudam com `npm run funding -- <valor>`.

## Como funciona

- O literal `TODO_REAL_CONTENT` é exportado de `src/data/project.ts` e também
  é detectado em campos `undefined`/vazio por `src/utils/placeholders.ts`
  (qualquer valor que seja o marcador, `null`, `undefined` ou string vazia).
- `scripts/check-content.mjs` varre `src/data/project.ts` procurando o marcador.
- Enquanto houver, o comando volta **código de saída 1** e o deploy é
  bloqueado.
- Rode `npm run content:check` para ver o que falta e em qual linha.

## Checklist — preencher antes de publicar

### Identidade (fixo, ok)
- [x] `projectName` → "Projeto Ícaro"
- [x] `tagline` → "Do chão ao espaço, em conta-gotas."
- [ ] `competition.fullName` → nome completo da OBAFOG
- [x] `competition.shortName` → "OBAFOG"

### Escola
- [ ] `school.name` → nome da escola
- [ ] `school.city` → cidade/UF

### Equipe (crew) — 2 estudantes
- [x] `crew[].photo` → **preenchido**: `project/team/pessoa-1.jpg` e
      `project/team/pessoa-2.jpg` (extraídas de `imagens/images/`)
- [ ] `crew[0].name` (role já preenchido) — nome real
- [ ] `crew[1].name` — nome real

### Origem (originStory)
- [x] primeiro parágrafo (real, ok)
- [ ] segundo parágrafo (`TODO_REAL_CONTENT`) — história real
- [ ] `timeline[]` — eventos reais: `title`, `description`, `dateLabel`
  (ex.: "2025 — OBAFOG Nível B"); item 3 já tem texto real, falta a data

### Classificação
- [ ] `qualification.dateLabel` — quando saiu o resultado
- [x] `qualification.context` — real, ok
- [ ] `qualification.confirmed` → `true` **somente quando** o resultado estiver
      comprovado (documentos em `photos.documents`)

### Campanha — uso do dinheiro
- [ ] `fundingUse[]` — itens do orçamento (base, foguete) com `note` reais
      (ex.: motor, tubo, recuperação; hoje "valor a definir")

### Pix
- [ ] `pix.beneficiary` → nome/razão do beneficiário
- [ ] `pix.key` → **chave Pix real** da equipe (e-mail, CPF, telefone…)
- [ ] `pix.payload` → em `null`, o QR é gerado a partir de `key`. Se quiser o
      código Pix "copia-e-cola" (BR...) real, preencha aqui.

### Contato
- [ ] `contact.email` → e-mail real
- [ ] `contact.instagram` → link/handle real

### Fotos
- [x] `public/project/team/pessoa-1.jpg` e `pessoa-2.jpg` — fotos reais dos
      estudantes em uso (via `npm run assets:images`)
- [x] `photos.launches[]` → `project/launches/foguete-grama.jpg` (o foguete de
      garrafa PET da foto de referência) + `lancamento-panorama.jpg` — os `alt`
      podem precisar de ajuste fino após conferência
- [x] `photos.journey[]` → 4 registros em `project/journey/` (rótulos
      provisórios: `jornada-paisagem`, `jornada-retrato`, `jornada-prep-a/b`)
- [ ] `photos.documents[]` → comprovantes de classificação (este lista em
      "Classificação")
- [ ] `photos.team[]` → se quiser mais fotos além dos cards da equipe
- [ ] Confirmar qual imagem corresponde a cada captura em `imagens/images/`

## Depois de preencher

```bash
npm run content:check      # deve dizer "✓ Conteúdo real completo"
npm run funding -- --reset # se precisar zerar o arrecadado antes de publicar
npm run build
```

## Valores e progresso (separados, nunca no project.ts)

- `campaign.goalCents: 80_000` (R$ 800) — meta, não muda sem decisão da equipe.
- `campaign.raisedCents` / `campaign.lastUpdated` — **somente** via
  `npm run funding -- <valor>`.
- O `src/data/campaign.ts` guarda o snapshot; nada é lido de rede.