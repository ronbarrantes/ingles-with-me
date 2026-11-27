# Inglés With Me: to-do

What's next, roughly in order. Small items ship together in batches.

## Next batch
- [ ] **Voice gets quieter after a few turns** (iPhone): starts loud, then drops, likely iOS stops honoring the switch back to "playback" after several record ↔ playback cycles. Re-request playback right before each line, and log the audio state per line (session type, mic open) to PostHog to confirm.
- [ ] **Rename "✋ Ya terminé"**: it sounds like ending the session. Try "✓ Terminé de hablar" or "Listo, envía".
- [x] **Fillers at natural moments**: wait about 0.8s after they stop; skip the filler if Ale's reply is already about to play; never play one right before the reply.
- [ ] **Bluetooth headphones**: switching the iPhone audio session every turn (playback ↔ play-and-record) can make Bluetooth headphones drop or reconnect. Detect headphones (device labels like "AirPods" once the mic is allowed, and the `devicechange` event) and turn on "Micrófono siempre abierto" automatically.
- [x] **Fillers while still talking** (filler only after ≥1.2s of speech; longer waits for beginners and after "and/the/y…"): "Ajá / hmm" plays on a mid-sentence pause, a cough or a kitchen noise (the mic ends a turn after about 1.1s of quiet). Play a filler only after a real stretch of speech (about 1.2s or more), consider a longer or adaptive end-of-turn wait, and track empty turns in PostHog.
- [ ] **PostHog read access**: a `phx_` personal API key (read scopes), saved through the secure form, so Claude can pull stats. The first attempt was rejected (probably the `phc_` project token).
- [ ] **Volume on iPhone**: Ale is still quieter than YouTube. The in-app boost (compressor + gain through Web Audio) is turned off (`BOOST = false` in `lib/bot/voice.ts`) because iOS can pause its engine and the first line came out silent. Ideas: a boost that only kicks in once the engine is confirmed running, louder source audio (`VOICE_GAIN_DB` up to 16), headphones tip, or native audio later (Capacitor).
- [ ] **Microphone prompts on iPhone**: releasing and retaking the mic makes Safari ask every turn. Show a one-time Spanish tip (Safari: aA → Website Settings → Microphone → Allow). (The "Micrófono siempre abierto" switch is done.)
- [ ] **Cache fixed audio in Convex storage** (once Convex is set up): fillers first, then word cards. An `audio { text, voice, storageId }` table; the server serves a stored recording if it has one, otherwise makes it once with Google and saves it. Ale's live replies stay live. (Vercel Blob is the backup option.)
- [ ] **Feedback**: 👍/👎 on Ale's replies (saved with model, level, topic) and a "Comentarios" item in the ⋯ menu (type or speak).
- [ ] Tag PostHog events with `app: "ingles"` (so the project can be shared).
- [ ] `docs/PRICING.md`: cost per turn and hour, price on value, tiers, the tutor comparison, free beta with founding members.
- [x] **English level (1–4), Spanish first**: start beginners mostly in Spanish and shift to English as they progress. The level is estimated from words learned, English vs Spanish turns, scores and number of chats. It goes up after several good English turns and drops right away if they struggle. First-ever chat: greet in Spanish and teach "My name is…" first. "Más español / Más inglés" override in the ⋯ menu. Saved on the phone (with hard words and interests), synced to Convex later.
- [ ] **Mis palabras**: save the words Ale teaches in chat (the "+ word · palabra" chips) and turn them into flashcards in Palabras and Repasar. Ale's prompt gets "words learned with me".
- [ ] **Ya las dominas**: a list of hard words beaten, plus review checks about 3 days and 2 weeks later (back on the hard list if they slip).
- [x] **Listening bubble**: hide the phone's live caption (English-only, so Spanish shows up garbled) and show a bubble with bars that move with the learner's voice. Keep the caption hidden as the fallback text.
- [ ] **Placement without a test**: in the very first chat, Ale starts in Spanish and asks 3–5 friendly questions that get harder in English (name → family → what you did today). From the answers and scores it sets the starting level, so learners who already know English aren't stuck in Spanish mode.
- [ ] **Barge-in**: keep the mic on while Ale talks; if the learner starts speaking, Ale stops and that becomes their turn. Stricter trigger while Ale speaks (echo), and an "Interrumpir a Ale" switch in the ⋯ menu.

## The 300 words
- [ ] **Real voice for word cards**: generate each word and its example sentence once with Google TTS (Chirp), cached in Convex storage (see Next batch), about $0.10 one time. Use them in cards, Palabras and Repasar; keep the phone's voice as the offline fallback. They can ship with the app, or live in Convex storage later.

## Speed and cost (check PostHog first)
- [ ] **The judge is the bottleneck** (~5s of ~8.5s per turn, per PostHog). gemini-4-hydrogen ignores thinking "off". Try a Flash-Lite judge (`JUDGE=google:gemini-2.5-flash-lite`, `JUDGE_THINKING=off`) and compare scoring quality; or split the judge into a quick transcription (Ale answers right away) plus detailed scores in parallel (they feed the next turn).
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

## Value stack (make it a no-brainer for non-native speakers)
- [ ] **Appointment prep**: "Tengo cita con el doctor mañana, practica conmigo." Ale role-plays the real situation ahead of time (doctor, boss, the kids' teacher, landlord, phone calls).
- [ ] **Before and after**: save a short recording from day 1, then play it next to day 30.
- [ ] **First win in 2 minutes**: their name in English and a green score, in Spanish, no pressure.
- [ ] **Visible progress**: A1 → A2, hard words beaten, minutes talked.
- [ ] **5-minute daily goal**, hands-free, no schedule.
- [ ] **Guarantee**: 5 minutes a day for 30 days, more confident or your money back.
- [ ] **Price anchor**: a tutor is $25–40/hour; Ale is 24/7 for $12–15/month and remembers your hard words.
- [ ] **Bonuses**: real-voice word cards, a phrase kit for each situation.

## Stage 2: accounts and data
- [ ] Convex: create the project and add `CONVEX_DEPLOY_KEY`, `CONVEX_URL`, `CONVEX_APP_SECRET` in Vercel (Production). The code is ready on a local branch (`convex-wip`).
- [ ] WorkOS sign-in (2FA); link the device profile to the account.
- [ ] "Lo que Ale sabe de ti" page: see, edit and delete; download my data.
- [ ] Privacy: encrypt sensitive fields, short retention for transcripts, no stored audio, opt-in "help improve Ale".
- [ ] Daily goal, streak and gentle reminders.
- [ ] Per-user daily turn limits (free minutes).
- [ ] **Age range in the profile** (13–17 · 18–34 · 35–59 · 60+, not an exact age) to adjust Ale's tone: teens casual, adults peer-to-peer, 60+ patient and slower with bigger text. Also voice speed and text size settings.
- [ ] **Minors and family plans**: start adults only (18+). Never under 13 (COPPA). Teens later, with privacy-first defaults (California rules for minors). The paying adult manages family members. Check with a lawyer before allowing anyone under 18.

## Stage 3: payments
- [ ] Stripe: 7-day trial with no card, Apple Pay and Google Pay. Plan around $12–15/month.

## Later / ideas
- [ ] **"Learn my voice"**: a personal voice filter so the mic follows the learner and ignores the room (heavy, likely native-app territory). Try first: iPhone Control Center → Mic Mode → Voice Isolation while the mic is in use.
- [ ] **Levels mapped to CEFR, adapted for adults**: level 1 ≈ Pre-A1/A1, 2 ≈ A1–A2, 3 ≈ A2–B1, 4 ≈ B1+. Ale aims for each level's "can-do" goals, in real adult situations: grocery store, pharmacy, doctor visits, work and job interviews, kids' school, landlord and bills, phone calls, small talk. Practice as role-plays ("Pretend I'm the pharmacist…"). Show progress as "A1 → A2".
- [ ] **Practice games for higher levels** (in this order):
  1. *Name it*: show a picture or emoji (like the cards); they say the word, and the judge scores it.
  2. *Guess it*: Ale describes something ("an animal, a big cat, it has stripes…"); they answer "tiger".
  3. *Story questions* (still unsure): a very short story built from words they know, then questions ("How many brothers were there?").
- [ ] **Tongue twisters from your hard words**, e.g. "Aaron, earn an iron urn" (earn and urn sound the same; iron is "eye-urn").
- [ ] **Pronunciation polish for fluent speakers**: "Agregar palabra" to add any word to the hard-words list (iron, February, crocodile, Kubernetes); a level-4 pronunciation mode where Ale works that list with sound ladders, word pairs that differ by one sound, and real sentences; work vocabulary topics (software interview, standup meeting). A second audience: people who already speak English.
- [ ] Compare mode: Sonnet and Haiku replies side by side (A/B).
- [ ] Phrases and grammar patterns tracked like hard words.
- [ ] Realtime voice (e.g. Gemini Live) for sub-second replies.
- [ ] Second teacher character ("Kai Jostar" / KJo).
- [ ] App icon: pick option A, B or C (Fredoka "Hi!").
- [ ] Rethink the layout so Ale is the main focus and the 300 words are a separate section.
- [ ] A word only counts as learned after 2 right answers: should the first "La sé" count?
- [ ] spanishwith.me is taken. Ideas: espanolwith.me, hablawith.me.
