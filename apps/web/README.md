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
