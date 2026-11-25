# Inglés With Me: to-do

What's next, roughly in order. Small items ship together in batches.

## Next batch
- [ ] **English level (1–4), Spanish first**: start beginners mostly in Spanish and shift to English as they progress. The level is estimated from words learned, English vs Spanish turns, scores and number of chats. It goes up after several good English turns and drops right away if they struggle. First-ever chat: greet in Spanish and teach "My name is…" first. "Más español / Más inglés" override in the ⋯ menu. Saved on the phone (with hard words and interests), synced to Convex later.
- [ ] **Mis palabras**: save the words Ale teaches in chat (the "+ word · palabra" chips) and turn them into flashcards in Palabras and Repasar. Ale's prompt gets "words learned with me".
- [ ] **Ya las dominas**: a list of hard words beaten, plus review checks about 3 days and 2 weeks later (back on the hard list if they slip).
- [ ] **Listening bubble**: hide the phone's live caption (English-only, so Spanish shows up garbled) and show a bubble with bars that move with the learner's voice. Keep the caption hidden as the fallback text.
- [ ] **Barge-in**: keep the mic on while Ale talks; if the learner starts speaking, Ale stops and that becomes their turn. Stricter trigger while Ale speaks (echo), and an "Interrumpir a Ale" switch in the ⋯ menu.

## Speed and cost (check PostHog first)
- [ ] Look at a day of `ale_turn` timings and the judge's thinking tokens ("pensó N").
- [ ] Try `JUDGE_THINKING=off`, and/or a cheaper judge model (Flash-Lite).
- [ ] Try Haiku as the teacher (`TEACHER=anthropic:claude-haiku-5-5`); compare against Sonnet.
- [ ] Hear "done talking" sooner (1.1s → about 0.8s of silence).
- [ ] Judge and teacher in parallel (teacher uses the phone's caption; scores feed the next turn).
- [ ] Speak the first sentence while the rest of the reply is still coming (streaming).
- [ ] An instant reaction when they stop talking ("mm-hm" / animation).
- [ ] Hide or trim Ale's avatar row for more chat space.

## Measuring
- [ ] PostHog: turn on Session replay and Exception autocapture in settings.
- [ ] PostHog read-only key (via the secure form) so Claude can pull stats.
- [ ] A small dashboard: turns per day, time per step, errors, cost per turn.

## Stage 2: accounts and data
- [ ] Convex: create the project and add `CONVEX_DEPLOY_KEY`, `CONVEX_URL`, `CONVEX_APP_SECRET` in Vercel (Production). The code is ready on a local branch (`convex-wip`).
- [ ] WorkOS sign-in (2FA); link the device profile to the account.
- [ ] "Lo que Ale sabe de ti" page: see, edit and delete; download my data.
- [ ] Privacy: encrypt sensitive fields, short retention for transcripts, no stored audio, opt-in "help improve Ale".
- [ ] Daily goal, streak and gentle reminders.
- [ ] Per-user daily turn limits (free minutes).

## Stage 3: payments
- [ ] Stripe: 7-day trial with no card, Apple Pay and Google Pay. Plan around $12–15/month.

## Later / ideas
- [ ] Compare mode: Sonnet and Haiku replies side by side (A/B).
- [ ] Phrases and grammar patterns tracked like hard words.
- [ ] Realtime voice (e.g. Gemini Live) for sub-second replies.
- [ ] Second teacher character ("Kai Jostar" / KJo).
- [ ] App icon: pick option A, B or C (Fredoka "Hi!").
- [ ] Rethink the layout so Ale is the main focus and the 300 words are a separate section.
- [ ] A word only counts as learned after 2 right answers: should the first "La sé" count?
- [ ] spanishwith.me is taken. Ideas: espanolwith.me, hablawith.me.
