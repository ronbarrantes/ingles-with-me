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

Hidden page (not linked) where you talk with Sam. Four swappable roles, each an
env var in the form `provider:model` (see `.env.example`):

- **Ears** (on the phone): `src/lib/bot/mic.ts` records each turn and detects
  when she stops; live captions from the browser's recognition (best effort).
- **Judge** (`JUDGE`, `src/server/judge/`): transcribes the turn (English or
  Spanish) and scores pronunciation per word. Default: Gemini on Vertex AI.
- **Teacher** (`TEACHER`, `src/server/tutor/`): decides what Sam says.
  Default: Claude Sonnet 5.5; a Gemini teacher is included for comparison.
- **Voice** (`VOICE`, `src/server/voice/`): Google Text-to-Speech, with the
  phone's voice as a fallback.

To add a provider for a role, add a file next to the existing ones and
register it in that folder's `index.ts`. Keys stay on the server.
