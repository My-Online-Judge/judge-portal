# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Owner (primary).** My OJ is a personal portfolio project. Its owner is the main user and plays every role in it: contestant, problem-setter and platform admin. Any wider audience is a small test audience at most; there is no production user base.
- **Contestant role.** A signed-out visitor can browse problems and contests and read statements. Signing in with Google unlocks submitting code, joining contests and a profile page (solved problems, recent submissions). The job on the solve screen: read the statement, write a solution in the editor, submit, and watch the judge's answer arrive.
- **Problem-setter / admin role.** Signs in with a username and password at `/admin/login`. Manages content (problems, test cases, contests), infrastructure (judge servers) and access (users, roles, permissions, bans). Every admin page is gated by permission keys such as `problem:create`; only the pages the account may use are shown.

## Product Purpose

An online judge for competitive programming: submit code, run it against test cases and get verdicts in real time. It exists to demonstrate a complete, credible judge system end to end (portal, API gateway, identity, problem and submission services, judge workers and sandboxes). Success is a portal that a competitive programmer would trust and recognise, running on the owner's own machines.

## Positioning

**Watching the verdict arrive.** The judge's answer streams live into the solve screen, test by test, over a server-sent event stream. A neighbouring judge shows a spinner and then a result; My OJ lets the contestant watch the run happen. Future design protects this: on the solve screen the verdict is the loudest object while judging, and everything else recedes. This is true end to end since 2026-11-08: the sandbox streams each judged test (`JudgeStream`), the worker publishes it (`submission.progress`), submission-service fans it out to the open stream as `progress` events, and the console fills its ladder from them (see the go-judge-server design §13).

## Operating Context

- Used in a desktop or mobile browser. The solve screen pairs a problem statement (markdown with KaTeX math) with a Monaco code editor and a submit action; judging progress and the final verdict appear under the editor.
- Submission languages: C, C++, Python, Java, Go, JavaScript. Verdict vocabulary: Pending, Judging, Running, Accepted, Wrong Answer, Time Limit Exceeded, Memory Limit Exceeded, Runtime Error, Compile Error, System Error.
- Contests have a title, start time, duration, a problem set and an access rule (open to everyone, or registration required). A contest's problem opens in the solve screen in contest mode, which asks a signed-out visitor to log in through the header dialog instead of redirecting to the admin sign-in.
- Problem statements and sample tests are authored in the admin console with a rich-text editor; test cases are uploaded as files (zip). Submissions have a cooldown between attempts.
- Judge servers report heartbeats; the admin console shows which are online, stale or offline.
- The portal is a static Vue 3 build served behind an HTTPS edge, calling the API at `/api/v1/**`. Local stack: `judge-deployment` (Docker Compose); portal dev server: `npm run dev` in `judge-portal`.

## Capabilities and Constraints

- Two sign-in paths and they stay separate: Google for contestants, username and password for the admin console. There is no self-service email registration.
- Admin routes are permission-gated per page; the sidebar and row actions show only what the account may do.
- Content language is unconstrained: problem titles and statements in the data are English and Vietnamese. The interface copy is English only.
- Terminology to keep: problem, slug, submission, verdict, contest, judge server, role, permission, ban. Admin copy names what the admin controls, never internals.
- Light and dark modes are both supported and both must work; the theme is chosen pre-paint (`public/theme-init.js`) and keyed on `data-theme`.
- Initial JavaScript size is checked (`npm run size:check`); admin pages are a separate lazy chunk and Monaco must not enter the shared chunk.
- Open decisions: none recorded. Nothing beyond the roles and features above has been promised.

## Brand Commitments

- Name **My OJ** (long form "My Online Judge"); short wordmark **MOJ** in the header. Both are binding.
- Interface copy stays **English**; content may be any language.
- The **Cobalt** theme with **light and dark** modes is a binding commitment, not merely the incumbent look. It lives in `src/assets/main.css`.
- Voice: sentence case, plain active verbs that name the outcome ("Create problem", "Problem created"); errors say what happened and what to do, never vague or apologetic; empty states give direction, not mood.

## Evidence on Hand

- Real artefact: the running system itself (every service in this repository, deployable with `judge-deployment`). Demonstrating it live is the proof.
- Content in the database is seed and test data (for example the contests "Autumn cup 2026", "Spring cup", and Vietnamese-titled problems). It is fixture material, not a record of real users or events.
- Assets: `public/favicon.ico` only. There is no logo file beyond the text wordmark.
- Design material: `docs/admin-design-brief.md` and `docs/admin-console.reference.html` describe the admin console's direction; `src/assets/main.css` carries the token system.
- Absent, and not to be fabricated: user counts, testimonials, customer or school names, press, benchmarks, uptime figures, pricing.

## Product Principles

1. **The verdict leads.** On the solve screen the judge's answer is the loudest object while judging; statement, editor chrome and navigation recede until it lands.
2. **Operate surfaces earn trust through precision.** Problem lists, profiles, contests and every admin page favour scanability, consistency and known patterns; brand lives in details such as monospace for machine identifiers.
3. **Every state is designed.** Loading, empty and error are explicit, with a next step; a blank screen is a defect.
4. **Show only what the user can do.** Permissions reveal controls; they never tease or disable what the account cannot use.
5. **Say only what is true.** No invented proof, counts or claims; fixture data stays recognisable as fixtures.

## Accessibility & Inclusion

Target: **WCAG 2.2 AA**. Visible keyboard focus everywhere, labelled inputs, focus-trapped dialogs, contrast verified in both light and dark modes, hit targets of at least 24px, and motion that respects `prefers-reduced-motion`.
