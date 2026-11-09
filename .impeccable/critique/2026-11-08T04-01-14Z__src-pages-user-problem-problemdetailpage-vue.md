---
target: the solve screen (src/pages/user/problem/ProblemDetailPage.vue)
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/tuanledmt/Personal/my-oj/judge-portal/src/pages/user/problem/ProblemDetailPage.vue"
target_fingerprint: "sha256:41a967f734623c52b91ef751bdd529d209ed2a2d07d18cf242d7c2fb649c9e15"
target_path: /Users/tuanledmt/Personal/my-oj/judge-portal/src/pages/user/problem/ProblemDetailPage.vue
timestamp: 2026-11-08T04-01-14Z
slug: src-pages-user-problem-problemdetailpage-vue
closed: true
---
Method: dual-agent (A: design review sub-agent · B: detector sub-agent). Source-only run: browser inspection skipped because no dev or API server was running and the critique starts none.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Twelve fixed ghost tiles regardless of test count; after the stream deadline the toast says "Still judging" while the console stays on "Waiting in the queue…" forever |
| 2 | Match System / Real World | 3 | OJ vocabulary is right; leaks: "Real time limit exceeded", the phone bar's "3/5, last submission", a 7-letter "Pending" in a 2-3 letter mono badge |
| 3 | User Control and Freedom | 3 | No retry on page error; no undo after "Load code"; fullscreen hides Submit and the console |
| 4 | Consistency and Standards | 2 | Clear confirms, Load code overwrites silently; "Result" segment nests a "Result" tab; the Testcases strip is a tablist without arrow keys or aria-controls; six breaches of DESIGN.md's named rules |
| 5 | Error Prevention | 3 | Draft autosave, cooldown as aria-disabled with countdown, Submit disabled on empty code; Load code destroys the draft with no confirm |
| 6 | Recognition Rather Than Recall | 3 | Tabs and segments are text, Submit shows its shortcut; splitter reset and console collapse are undiscoverable |
| 7 | Flexibility and Efficiency | 3 | Ctrl/Cmd+Enter inside and outside Monaco, persisted splits, editor theme/font; no Run shortcut |
| 8 | Aesthetic and Minimalist Design | 3 | Calm and flat; the judging state is told three times at once (toast, badge pulse, console heading); the verdict area is the smallest region on screen |
| 9 | Error Recovery | 3 | Excellent at judge level (compile output, "Differs on line N", Retry on network failure); page-level error has no control; SubmissionDetailDialog renders the literal string "error" |
| 10 | Help and Documentation | 3 | Contextual and honest ("Run checks your code against these cases only…"); no I/O conventions anywhere |
| **Total** | | **29/40** | **Good** |

## Design Specificity Verdict

**LLM assessment.** Authored for an online judge in its lower third, generic two-pane IDE-in-a-browser everywhere else. The console is unmistakably a judge's desk: the test ladder of mono-numbered tiles, Samples / Hidden grouping, the first failing test auto-opened, "Differs on line N" marked on both Expected and Your output, the compiler flags beside the language picker. Above it, breadcrumb plus action slot, a toolbar/editor/status-bar card and a three-tab card could belong to any product.

The decisive gap is between PRODUCT.md and what renders. The positioning is "watching the verdict arrive, test by test". The client stream contract (`useSubmissionStream.ts`) delivers one `verdict` event and closes; the console tells the contestant so while they wait: "Every test's result arrives together when judging finishes." (`VerdictConsole.vue:17`). The 24 ms per-tile stagger is theatre over a batch result. And nothing recedes while judging: the console holds 40% of the right pane, statement and editor keep full contrast, and the verdict heading (text-base) sits under a problem h1 at text-2xl. The loudest object while judging is the problem title.

Missed character: ghost tiles are a fixed 12 although every previous submission knows its `details.length`; an all-Accepted ladder is, by the Stamp Rule's 11% tint, the quietest ladder the system can draw; submission ids render in sans despite the Three Hands Rule.

**Deterministic scan.** 0 findings over `ProblemDetailPage.vue`, all 15 files in `src/components/problem/detail/` and `useSubmissionStream.ts` (exit 0). The surface is clean against DESIGN.md's ramp, radii and slop rules at the level the detector reads. It does not read token semantics, so it missed the One Pen and Stamp Rule breaches listed under P3; those are rule-level, not literal-value, violations.

**Visual overlays.** Not available: browser inspection was skipped because no dev or API server was running and the critique starts none.

## Overall Impression

A calm, well-engineered workspace with a genuinely excellent verdict console and strong failure copy, whose one promised moment, the verdict arriving, is both smaller than everything around it and admitted to be a batch. The single biggest opportunity is to make the console the screen while judging, and to make the stream, or the promise, truthful.

## What's Working

1. **The console is a judge, not a log.** `firstFailingOrSample` opens the right tile without a click; `firstDiffLine` normalises trailing whitespace and marks the first differing line in both panes; hidden tests show verdict, time and memory and honestly refuse data; the verdict toast names the failing test.
2. **State survives everything.** One StatementPane and one SolvePane are teleported between the desktop split and the phone segments at 900 px instead of remounted, so code, console and the open stream survive a resize; drafts per problem survive reloads and the Google redirect; a shared watch map prevents duplicate EventSources.
3. **Failure copy obeys the brand voice.** Every error names what happened and what to do, in sentence case, without apology: "Run isn't available on this server yet. Submit to judge your code on every test."; "Your submission wasn't sent. Check your connection." with Retry.

## Priority Issues

- **[P1] The verdict is neither loud nor live.** During judging the console keeps 40% of the right pane (`SolvePane.vue:119`, EDITOR_SPLIT 60), statement and editor stay at full contrast, the verdict heading is smaller than the problem h1, and the stream delivers one event so "test by test" is a CSS stagger; the console footnote admits it. **Why it matters:** this is the positioning and Principle 1 of PRODUCT.md; the code contradicts both. **Fix:** on submit, expand the console panel to the majority of the pane and mute statement and editor until the verdict lands; size ghost tiles to the last known test count or show none; raise the verdict title to the display scale. Then decide: per-test events from the backend so the ladder fills in truth, or rewrite the positioning to "the whole ladder lands at once" and drop the footnote. **Suggested command:** /impeccable bolder, then /impeccable clarify.
- **[P1] Fullscreen hides Submit, the console and every toast.** `useFullscreen(rootEl)` targets the editor card only (`ProblemSubmit.vue:231`); Submit is teleported to the top bar outside that subtree, the console is a sibling panel, the Toaster is at body. Ctrl/Cmd+Enter still fires, so a fullscreen contestant submits blind. **Why it matters:** fullscreen is the mode a contestant picks when most invested. **Fix:** fullscreen the SolvePane root (editor plus console) and move Run/Submit into the console tab bar while fullscreen, or exit fullscreen on submit. **Suggested command:** /impeccable harden.
- **[P2] Two stranded end states.** (a) After the stream deadline, only the toast is released ("Still judging. Open Submissions to see the verdict."); the console shows "Waiting in the queue…" indefinitely (`VerdictConsole.vue:102`). (b) Page load failure renders "Couldn't load this problem. Please try again." with no retry and, outside contests, no link (`ProblemDetailPage.vue:17-25`). **Why it matters:** Principle 3, every error has a next step. **Fix:** `onGiveUp` sets a console state ("We lost the live result." with "Check Submissions" and "Refresh"); the page error gets a Retry wired to `loadProblem` plus "Back to problems". **Suggested command:** /impeccable harden.
- **[P2] "Load code" overwrites the draft with no confirm or undo.** `ProblemSubmissions.vue:60-64` replaces `sourceCode`; the toast "Code loaded into the editor" has no action; 600 ms later the draft is gone. Clear, on the same screen, opens a confirm dialog. **Why it matters:** the draft is the contestant's only working copy, destroyed two different ways. **Fix:** toast with an Undo action restoring previous code and language (TOAST_DURATIONS.undo exists). **Suggested command:** /impeccable harden.
- **[P3] DESIGN.md's named rules are breached six ways on the flagship screen.** One Pen Rule: Summary box on `bg-primary-soft/70` with an info-ink heading (`ProblemDescription.vue:7-8`), highlighted submission row on `bg-primary-soft/50` (`ProblemSubmissions.vue:36`). Stamp Rule: "Draft saved" dot in `--v-ac` (`ProblemSubmit.vue:92`), submission count badge in `v-se` (`SolvePane.vue:30`). 8px Ceiling: difficulty and tag pills `rounded-full` (`ProblemHeader.vue:5,10`), `rounded-[10px]` on Summary, Examples and Hint. Three Hands: ids in sans tabular (`VerdictTiles.vue:13`, `SubmissionDetailDialog.vue:5`). **Fix:** well tone for Summary, rule-2 hairline for the highlight row, `bg-success` for the draft dot, a neutral badge for counts, 4-6 px radii, `font-mono` on ids. **Suggested command:** /impeccable polish.

## Cognitive Load

3 of 8 checklist items fail: moderate load. Visual hierarchy (the verdict area is the smallest region while judging), one thing at a time on desktop (after Submit the eye goes top-right to the cooldown, bottom-left to the toast, bottom-right to the console), minimal choices. Decision points over four options: desktop top bar (5), language picker (6), testcases strip (up to 7), the ladder (one per test), submissions row (6 columns plus Load code plus the row itself), the phone Result view (3 segments over 3 tabs).

## Emotional Journey

Open: a spinner with "Loading...", no layout skeleton, then a hard jump into the split; signed out, three places say log in at once. Submit: good reassurance (button state, loading toast, "Submitted / Judging now", badge pulse), then the first thing shown is a 10 s lockout. Waiting: the valley the product claims as its peak; twelve dashed tiles unrelated to the problem, a sweep, and a footnote telling anticipation to stand down. Landing: a genuine peak (verdict in its ink, "N / M tests passed", first failure open with its diff line), duplicated by a toast at the one moment that deserved a single focus; Accepted is understated by design. Failure: strong copy; two bad endings (stream give-up, page error).

## Persona Red Flags

**Alex (impatient power user, desktop):** fullscreen removes Submit, console and toasts; previous attempt needs a horizontal scroll inside a 560 px-minimum table to reach "Load code"; no Run shortcut; every submit is followed by a 10 s "Submit (Ns)" lockout; the infinite "Submitted" toast sits over the statement for the whole wait.

**Sam (screen reader, keyboard, 200% zoom):** the Testcases strip claims `role="tablist"` with no arrow keys, aria-controls or tabpanel; ladder tiles sit in `display: contents` listitems some engines drop; console state changes have no live region of their own; remove-case button is 20 px, prev/next 34 px, copy buttons 28-30 px, none with the 44 px hit padding DESIGN.md promises.

**Casey (one-handed phone, interrupted):** Submit in the pinned bottom bar is right; a long Vietnamese title is never fully readable (truncated, h1 dropped when compact); "Result" segment over a "Result" tab; Submissions table scrolls sideways with Load code off-screen; return after interruption is handled well (badge plus "2/5, last submission", polling fallback).

**Owner demonstrating on a 13-inch laptop (PRODUCT.md: "Demonstrating it live is the proof"):** at about 1440×790 the console is roughly 220 px tall; the ladder and the "Differs on line N" detail cannot both fit without scrolling inside the console; the toast lands over the statement; and the screen tells the reviewer "Every test's result arrives together" while the pitch is "watch the run happen".

**Contestant mid-contest on a phone:** login auto-opens and returns to the same URL, good; but the problem letter exists only in the desktop crumb and prev/next only in the desktop bar, so the phone contestant cannot see which letter they are on or reach problem B without going back.

## Minor Observations

- `SubmissionDetailDialog.vue:10` passes the literal string "error" as the message, under a heading meant for lists.
- Monaco's "Same as the site" theme maps to stock `vs-dark`, which will not match paper dark; a seam is likely (unverified).
- "Loading..." uses three periods; every other string uses an ellipsis.
- The `.vchip` style is defined for this screen but the console title is a plain h3 in the verdict ink; the chip appears only in the Submissions table and stats dialog.
- Three sign-in prompts are visible simultaneously when signed out.

## Questions to Consider

1. If the client contract is one verdict event, is "watching the verdict arrive" a product promise or a 24 ms stagger, and which should the footnote and PRODUCT.md tell?
2. Why does the system's most desired outcome, an all-Accepted ladder, look like the quietest thing it can draw? Does the Stamp Rule need a stamp for success?
3. Why does Submit live in the top bar, far from where its consequence lands, when the phone already puts it beside the console?
4. The backend knows the test count; why do the ghost tiles pretend it is twelve?
