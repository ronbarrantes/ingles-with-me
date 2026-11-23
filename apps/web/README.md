# web

The Inglés With Me app: English flashcards for Spanish speakers, learned
with pictures instead of translations.

- `src/data/words.ts`: the 300 core words (plus bonus cognates)
- `src/i18n/`: interface text (Spanish)
- `src/lib/store.ts`: progress saved on the device (spaced repetition, favorites, marked)
- `src/routes/`: Aprender (`/` topic carousel, `/aprender/<topic>` deck), Palabras (`/palabras`), Repasar (`/repasar`, `/repasar/<list>`)
- `src/components/SwipeDeck.tsx` + `Card.tsx`: the swipe deck and card
- `src/data/pics.tsx`: drawings for words without an emoji
- `public/sw.js`: offline support; bump `VERSION` when changing it

```bash
pnpm dev     # http://localhost:3000
pnpm build
pnpm check
```

## /bot (stage 1: conversation partner)

Hidden page (not linked) where you talk with Sam: Azure AI Speech listens, scores
pronunciation and speaks; Claude teaches. Keys stay on the server (`src/server/`).
See `.env.example` for the environment variables. Swap the teacher's model with
`TUTOR_MODEL`; a different provider is a new file next to `src/server/tutor/anthropic.ts`.
