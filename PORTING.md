# Porting Cadence from web to Expo

The source of truth for this app's behaviour is the React web build at
`../habit-tracker`. This file is the standing contract for how it is translated.
Read it before writing any slice.

## Progress

| Slice | What it covers | State |
|---|---|---|
| S0 | Config, tokens, storage, uuid, pure modules, headless data layer, tests | **done** |
| S1 | Design-system primitives + ErrorBoundary | **done** |
| S2a | Email/password auth, `Stack.Protected`, sign-out | **done** |
| S2b | OAuth, deep links, password reset | deferred — Google/Apple are not enabled in Supabase |
| S3 | `useTracker`, selectors, provider, online status, `useToday` | **done** |
| S4 | Tracker shell, bottom tabs, read-only cards, search | **done** |
| S5 | Mutations, ⋮ menu, share, delete, offline round trip | **done** |
| S6 | Task editor: shell and shared fields | **done** |
| S7 | Per-type schedule fields | **done** |
| S8 | Tags: filter sheet, editor, in-form select | **done** |
| S9 | Profile sheet | **done** |
| S10 | Avatar upload (`lib/avatar.ts`, `useTracker.setAvatar`) | **done** |
| S11 | Polish, accessibility audit, EAS build profiles | next |

## Rule 1 — Know which tier you are in

| Tier | Meaning | Files |
|---|---|---|
| **Copy verbatim** | Zero platform surface. Copy byte-for-byte; do not "improve" it. | `lib/tasks/dates.ts`, `lib/tasks/schedule.ts`, `lib/tasks/data-errors.ts`, `lib/validation.ts`, `lib/auth-errors.ts`, `lib/brand.ts`, `types/database.types.ts` |
| **Swap one primitive** | One platform call changes; the logic around it is untouched. | `lib/supabase.ts`, `lib/tasks/api.ts`, `lib/tasks/outbox.ts`, `lib/tasks/snapshot.ts`, `lib/tasks/useTracker.ts`, `lib/theme.tsx`, `lib/auth.tsx`, `hooks/use-online-status.ts` |
| **Rewrite** | The web implementation is a DOM artifact. Keep the *contract and the copy*, rewrite the body. | everything in `components/`, `lib/avatar.ts`, `lib/share.ts`'s `share()`, routing |

If a diff in tier 1 or 2 is larger than the primitive swap, that is a bug in the
port, not an improvement. Revert and re-derive. Every deviation actually taken so
far is listed under [Deviations](#deviations-from-the-web-build) — add to it
rather than making a silent change.

## Rule 2 — Preserve every user-facing string exactly

The copy is deliberate and reviewed. Carry it character for character, including
the messages that deliberately do *not* confirm whether an account exists
("If an account exists for {addr}, a reset link is on its way."). Never reveal
which credential was wrong.

## Rule 3 — Writes stay confirmed, not optimistic

State changes only after the server returns the row. The **single** exception is
an unreachable network (`isNetworkFailure()`), which queues to the outbox and
applies locally. A write the database *refuses* still fails loudly. Classify by
the response, **never** by NetInfo's idea of connectivity. Habit taps are the one
thing applied locally on both paths.

## Rule 4 — Storage is synchronous, and comes from one place

`expo-sqlite/localStorage/install` provides a synchronous, drop-in
`localStorage`. That is what lets `snapshot.ts` and `outbox.ts` keep their
synchronous signatures — `readSnapshot` is consumed synchronously inside
`useTracker`'s mount effect. Do not make it async, and do not reach for
AsyncStorage or MMKV.

Always `import { storage } from "@/lib/storage"`. Never touch the
`localStorage` global: that would make the caller depend on a side-effect import
having run first, and an import sorter could silently break session persistence
and the offline cache with no error. **ESLint enforces this.**

Storage keys are unchanged from the web build: `cadence-snapshot:${userId}`,
`cadence-outbox:${userId}`, `cadence-theme`. The snapshot is cleared on
`SIGNED_OUT`; **the outbox deliberately is not** — unsent writes are work owed to
the server.

## Rule 5 — No colour, radius or shadow literals in a component

Use a token from `tailwind.config.js`. React Native cannot parse `oklch`, so each
token is an `R G B` triplet in `src/global.css` read back as
`rgb(var(--token) / <alpha-value>)`. That indirection is what keeps the alpha
modifier working, and `bg-positive/25` / `bg-caution/30` are how task state is
expressed.

Palette rules carry over: violet held under chroma 0.09, de-emphasise by dropping
chroma and **never** by reaching for grey, every colour defined in both themes.
`--positive` and `--caution` are **tints, not paint** — they wash a card's strip
and fill only the small control inside it. They never colour text and are not
general success/warning colours. **Priority has no colour.**
`--muted-foreground` has no contrast headroom; do not lighten it.

### Control scale

The web primitives are **compact by default** (`Button`, `Input` = `h-8`) because
they were drawn for a dense desktop surface, and the design system overrides them
to `h-11` below the `sm` breakpoint. **On a phone there is no width above `sm`**,
so the narrow-screen size is the only size, and compact defaults are simply wrong
here.

| Control | Height | Why |
|---|---|---|
| `Badge` | 28 (`py-1.5`, no fixed height) | a count chip, must not compete with a button. Padding-driven so the chip breathes around its text rather than pinning a line box inside a fixed box |
| `Button` default | 32 (`h-8`) | dense in-card actions |
| `Button` `size="touch"`, `Input`, `Textarea` row | 44 (`h-11`) | the touch target, and what the design system already specified below `sm` |

Fields are `px-3 py-2`, not the web's `px-2.5 py-1`. Text in a field is
`text-base` at every width — anything smaller and iOS zooms the view on focus.

**Spacing is a 4pt grid.** Any bare number in a `style` prop — an offset, a gap,
a measured inset — is a multiple of 4. Tailwind's scale is already 4pt-based
(`gap-2` is 8, `px-4` is 16), so classes come out right by default; it is the
hand-written numbers that drift, and `grep -rnoE '(padding|margin|gap|top|bottom|left|right): *[0-9]+' src/`
finds them.

The half-steps inherited from the web (`px-2.5`, `gap-1.5`, `mt-0.5`) are
deliberate and stay. They are 2pt increments used for optical alignment, not
layout spacing — `mt-0.5` on a card's checkbox is what centres it on the title's
first line.

Typography is Montserrat at **400/500/600 only**. There are no font-weight
utilities in this project at all — `font-sans`, `font-medium` and `font-semibold`
select a *family*, because Android ignores `fontWeight` on a custom family.
`font-bold` does not exist, which is the design system's "never 700 for UI text"
rule made mechanical.

## Rule 6 — The substitution table

| Web | Native |
|---|---|
| `localStorage` | `storage` from `@/lib/storage` (Rule 4) |
| `crypto.randomUUID()` | `newId()` from `@/lib/uuid` — **Hermes has no `crypto`**; ESLint enforces this |
| `navigator.onLine` + `online`/`offline` | `@react-native-community/netinfo` |
| `window.matchMedia('(prefers-color-scheme: dark)')` | NativeWind `colorScheme` / `useColorScheme` |
| `document.documentElement.classList.toggle('dark')` | `colorScheme.set()` |
| `navigator.share` | RN `Share.share()`; `canShare()` becomes always true |
| `navigator.clipboard.writeText` | `expo-clipboard` |
| `<input type="file">` + canvas | `expo-image-picker` + `expo-image-manipulator` |
| `<input type="date">` | a native date picker |
| `document.getElementById(id).focus()` | `TextInput` refs |
| `react-router` guards | Expo Router `Stack.Protected guard={...}` |
| service worker / `virtual:pwa-register` | dropped; not v1 |
| `lucide-react` | `lucide-react-native`; **pass `size` explicitly** — `[&_svg]:size-4` does not exist |
| `sr-only` | `accessibilityLabel` on the parent — there are no hidden text nodes, so this changes component structure. Do it per slice, not in a cleanup pass |
| `aria-live` + `empty:hidden` | `accessibilityLiveRegion` + conditional render |
| `tap-target` (44×44 `::before`) | `hitSlop`, and on mobile it always applies |
| `import.meta.env.VITE_*` | `process.env.EXPO_PUBLIC_*` |

## Rule 7 — CSS with no NativeWind equivalent

- **Grid** → flex with `flexWrap` / percentage widths. The 3-column tracker grid
  is replaced by bottom tabs.
- **Hover** → drop it; use Pressable's pressed state. The `⋮` menu's hover-reveal
  already resolves to always-visible on touch, so render it always visible.
- **Two-layer shadows** → iOS takes one shadow, Android only `elevation`.
  Approximate the diffuse layer and accept the loss. Never hand-write a shadow.
- **Pseudo-elements** → real Views. The `line` tab underline (`after:h-0.5`)
  becomes a View; hit areas become `hitSlop`.
- **`peer-checked:` on sr-only inputs** → Pressables with state. Affects the
  theme toggle, weekday chips and `ChoiceGroup`.
- **`min-[400px]:` / container queries** → unsupported. Only `sm:`/`md:`/`lg:`/`dark:` exist.
- **Radial gradient** (the auth wash) → `react-native-svg` `RadialGradient`.
- **`field-sizing-content`** → `onContentSizeChange`.
- **Text overflow has no CSS equivalent — it is a prop.** Every one of these is
  a `Text` prop, and forgetting one does not fail loudly; the text is simply
  clipped by a fixed height and looks truncated for no reason:
  `whitespace-nowrap` → `numberOfLines={1}` (on `Button` and `Badge` labels),
  `line-clamp-2` → `numberOfLines={2}` (card notes), `truncate` →
  `numberOfLines={1}` (the profile name). Check the web class list for these
  whenever porting a component that renders text inside a fixed height.
- **`tabular-nums`** → `fontVariant: ['tabular-nums']`.
- **`backdrop-blur`** → a solid `bg-background` bar.

## Rule 8 — Device checks, verified not assumed

`src/app/index.tsx` is a temporary smoke screen that runs these on device. The
unit tests cover the same logic but run on Node's V8, **not Hermes**, so they
cannot stand in for it.

Results so far, on a physical Android device (ColorOS 16), Expo Go, SDK 57:

| Check | Result |
|---|---|
| `Intl.DateTimeFormat` with an IANA zone (every streak and every `habit_logs.log_date` depends on it) | **passes** — resolved `Asia/Phnom_Penh` correctly |
| Montserrat 400/500/600 as three families (Android ignores `fontWeight` on a custom family) | **passes** — three visibly distinct weights |
| `newId()` returns distinct v4 UUIDs | **passes** |
| Synchronous `storage` round-trip | **passes** |
| `Array.prototype.toSorted` | **FAILS — not implemented on Hermes.** Use `[...arr].sort()`. ESLint blocks it, along with `toReversed` and `toSpliced` |
| `Array.prototype.at` (`TrackerPage.tsx:181` uses `column.at(-1)`) | **passes** |
| `Date.parse` of a Supabase timestamptz with 6 fractional digits (`sortKey`'s fallback; `NaN` would scramble card order) | **passes** — `sortKey` needs no change |
| `isNetworkFailure()` in airplane mode — must fire on `status === 0` **and** on RN's `"Network request failed"` | pending, S5 |

**Do not assume a modern JS builtin exists.** `toSorted` is ES2023 and absent,
so treat anything newer than ES2021 as suspect and probe it on device. The unit
tests run on Node's V8 and will happily pass on a method Hermes lacks.

## Rule 9 — Commands, and the gate

Package manager is **pnpm**. Use `npx expo install <pkg>` for every dependency so
versions resolve against SDK 57 — never a bare `pnpm add` for a runtime package.

```bash
npx expo start        # dev server
npx expo lint         # lint
npx tsc --noEmit      # typecheck
npx jest              # unit tests
npx expo-doctor       # dependency / config diagnosis
```

**No slice is done until lint, typecheck and tests are all clean and the slice's
own behaviour has been exercised on a device or simulator** — in both themes and
at 320pt width, which is the design system's base.

**Launching on a device is part of the gate, not a formality.** `expo export`
succeeding proves the graph resolves, not that the app boots: S0 passed lint,
typecheck, 61 tests, `expo-doctor` and a two-platform bundle while still crashing
on launch with a duplicated React Native (see `pnpm-workspace.yaml`). Every
static check was green and the app was dead. Run it.

After any dependency change, restart Metro with `npx expo start --clear` — a
stale transform cache will happily serve the old graph.

Before touching any Expo/EAS/React Native API, fetch the versioned docs
(`https://docs.expo.dev/versions/v57.0.0/`) or `https://docs.expo.dev/llms.txt`.
Never answer from training data. See `AGENTS.md`.

## Rule 10 — `src/app/` is routes only

Every file under `src/app/` is a screen or a `_layout.tsx`. Components, hooks,
lib and types live outside it. Import via `@/`, never deep relative paths.

## Rule 11 — One tracker, in a provider

The web build's `TrackerPage` owns `useTracker(userId)` and renders all three
columns inside it. Here the columns are three sibling tab screens. If each called
`useTracker` there would be three profile fetches, three `load()` calls, three
`flushOutbox` runs against the same module-level `flushing` guard, three snapshot
writers, and a tap in Habits would not update the count in Dailies.

`useTracker` is therefore hoisted into a provider in `src/app/(app)/_layout.tsx`
and read with `useTrackerContext()`. The top bar renders once in that layout too.
Search and the tag filter are per-tab, so `selectors.ts` is parameterised per
column rather than computing all three at once.

## Rule 12 — "Today" goes stale on a phone

The web build computes `today` during render from `new Date()`, which is fine for
a tab that remounts constantly. A phone app lives for days: tap a habit at 00:05
after the app has been backgrounded since 22:00 and the log goes to *yesterday's*
date, persisted. `today` must be recomputed on `AppState` → `active` and on a
timer set to the next local midnight.

`AppState` also drives `supabase.auth.startAutoRefresh()` / `stopAutoRefresh()`
(already wired in `lib/supabase.ts`). Without it, resuming after hours gives a
board of RLS failures rendered as "Something went wrong."

## Deviations from the web build

Every intentional difference, so none of them is a surprise later.

1. **`lib/storage.ts`** is new: it exports the storage object as a *value* so
   consumers do not depend on import order (Rule 4).
2. **`lib/uuid.ts`** is new: `newId()` wraps `expo-crypto` because Hermes has no
   `crypto` global.
3. **`lib/tasks/types.ts`** is new: `TrackerData`, `HABIT_WINDOW_DAYS` and
   `DAILY_WINDOW_DAYS` moved here. On the web `snapshot.ts` imported
   `TrackerData` from `useTracker.ts` while `useTracker.ts` imported
   `readSnapshot` from `snapshot.ts` — a cycle that only survived because the
   import was type-only and erased.
4. **No font-weight utilities.** See Rule 5.
5. **`theme.tsx` loses two effects.** NativeWind's `colorScheme.set("system")`
   hands the decision to the OS, so the web build's separate "apply the class"
   and "subscribe to matchMedia" effects collapse into one `set()` call.
6. **Tailwind v3, not v4.** NativeWind 4.2.7 requires it, so the web build's
   CSS-first `@theme` block becomes `tailwind.config.js` plus RGB-triplet
   variables. `tailwind-merge` is pinned to v2 for the same reason: v3 targets
   Tailwind v4's class set.
7. **Tests exist here and do not there.** The web project has none; these cover
   the pure logic being re-run on a different engine.
8. **Control heights are the narrow-screen ones**, not the web primitives'
   compact defaults. See the Control scale table in Rule 5.
9. **`ErrorBoundary` logs on a deferred tick.** Logging synchronously in
   `componentDidCatch` mounts LogBox inside the commit that is recovering from
   the error, which makes NativeWind's render-phase dispatch warn about state
   updates on unmounted fibers.
10. **`useTracker` seeds state from the snapshot in `useState`,** not with a
   `setState` inside the load effect. Two reasons: setting state synchronously
   in an effect cascades an extra render (and `react-hooks/set-state-in-effect`
   rejects it), and re-reading the snapshot on *every* reload replaced every
   object identity on screen, so a reconnect re-rendered the whole board. The
   provider is keyed by user id, so a different account still re-seeds.
11. **Reconnect fires only on a false → true transition.** The web listened for
   the `online` event, which only fires on a real transition. NetInfo emits on
   its own first settle and on a wifi-to-cellular handoff too, so reloading on
   every emission would re-run the entire load repeatedly.
12. **`lib/tasks/selectors.ts` is new**: the derived view model lifted out of
   the web's 565-line `TrackerPage`, parameterised per column (Rule 11).
   `sortKey` moved here from `useTracker`.
13. **`api.uploadAvatar` takes an `ArrayBuffer`, not a `Blob`,** and is given
   the content type explicitly. supabase-js storage uploads from a `Blob` are
   unreliable in React Native, and bytes carry no type of their own.
14. **`Checkbox` composes state classes *after* the caller's `className`.**
   The web's `data-checked:` variants beat plain classes on specificity at any
   source order; NativeWind has no such variant, so order is the only lever. A
   caller passing `bg-card` (the card strips do) otherwise cancelled the
   checked fill and left a near-white tick on a near-white box.
15. **The tab bar is a custom floating pill** (`components/floating-tab-bar.tsx`),
   with the add button detached beside it. It is `position: absolute` and
   centred rather than edge-to-edge, so it no longer occupies layout space and
   every scrolling column pads its own bottom by `tabBarClearance()` — see
   `components/tab-bar-metrics.ts`, using the same 16pt gutter the columns do
   so the bar lines up with the cards above it. Tabs keep their labels — the
   three task types are the app's whole mental model, and the icons do not
   name them — and each is `flex-1` so they divide the pill evenly. The active
   tab is marked by tint *and* weight, so the state never rests on colour
   alone.

   **A filled control's pressed state must not be translucent.** `bg-primary/85`
   composites over whatever sits *behind* the button, so on a near-white page
   it lightens the fill and drops the white icon from 5.44:1 to 3.97:1 — under
   AA — while on a dark page the same class darkens correctly. That asymmetry
   is why a press looked wrong in one theme only. The add button keeps an
   opaque fill and scales instead, which has no dependency on the backdrop.

   **No `android_ripple` anywhere.** It takes a flat colour that cannot follow
   the theme, so any value is wrong in one scheme or the other — `accent` read
   as a white splash in light and a black one in dark. Pressed states are
   token-backed `active:` classes instead (`active:bg-accent` on a tab,
   `active:bg-primary/85` on the filled add button), which are correct in both
   schemes by construction and match every other control in the app.
16. **A popover's modal must not be `statusBarTranslucent`.**
   `measureInWindow` reports a trigger in *content* coordinates, but a
   translucent modal starts at the true top of the screen — so every anchor
   came out short by exactly the status bar's height, opening a visible gap
   above the trigger. Nothing is lost: a popover's backdrop is transparent.
   Overlays that *do* want their scrim over the status bar (the dialog, the
   editor sheet) keep the flag, because they position by flex, not by a
   measured anchor. A flipped popover is also pinned by its bottom edge rather
   than placed at `anchor.y - height`, so the gap needs no height arithmetic.
17. **A modal's own animation is never used; its layers animate themselves.**
   `animationType="slide"` animates the modal's whole content, scrim included,
   so a darkened backdrop rides up with the sheet as one tall panel — they need
   different motion.

   Reanimated's `entering`/`exiting` layout animations are not the answer
   either: inside a `Modal` they leave the sheet holding a residual transform,
   drawn shifted off the bottom edge while its touch targets stay where the
   untransformed layout put them, so Cancel rendered in one place and responded
   in another. A hand-driven shared value is deterministic, because the end
   value is explicit — `(1 - 1) * height` is exactly 0 — so drawing and
   hit-testing cannot drift apart.

   Start it from `onLayout`, not an effect: a content-sized sheet does not know
   how far it must travel until it has been laid out, and the React Compiler's
   `react-hooks/immutability` rule rejects mutating a shared value that an
   effect also reads. Latch it, because the height changes again later when the
   keyboard opens.
18. **A modal that wants the full screen needs `navigationBarTranslucent` as
   well as `statusBarTranslucent`.** With only the latter the modal window
   stops above the navigation bar, and nothing inside — flex, padding, insets —
   can reach the bottom edge.
19. **Ghost buttons press with `bg-foreground/10`, not a solid token.** A ghost
   button sits on whatever surface it is given, and the editor's header band is
   `bg-muted` itself, so a solid `active:bg-muted` was invisible there.
   Composing the foreground over the surface darkens in light and lightens in
   dark whatever is underneath. Filled variants must *not* do this — for them a
   translucent pressed state washes out the label (deviation 16's reasoning).
20. **`hitSlop` is sized per button, not flat.** A `touch` button is already
   44pt; giving it 8pt more made its hit area overlap its neighbour, and
   whichever rendered last quietly swallowed the other's presses.
21. **The task editor is a content-sized bottom sheet**, capped at 92% and
   scrollable. A full-height page sheet left a short form — a habit is title,
   notes and priority — stranded above a screen of empty space. The keyboard
   lifts the whole sheet rather than padding the scroll content, so the footer
   action stays reachable.
22. **The card menu stays anchored** (`components/ui/popover.tsx`), measured
   from its trigger with `measureInWindow`, aligned end like the web, clamped
   inside the screen and flipped above when there is no room below. A bottom
   sheet is right for a large panel but wrong for a five-item context menu: the
   menu belongs to one card, and throwing it to the bottom of the screen severs
   it from the thing it acts on. Measured at open, not at layout, because the
   card can scroll in between.
23. **Delete keeps a custom dialog, not `Alert.alert`.** The system alert
   dismisses the moment a button is pressed; the web deliberately used a plain
   button rather than `AlertDialogAction` so the dialog stays open until the
   request resolves and a failure can be shown in place. That behaviour is the
   point, so `components/ui/dialog.tsx` reproduces it.
24. **`ChipGroup` replaces the web's `Select` and its `peer-checked:` radio
   groups.** NativeWind has no `peer-*`, and a system picker renders with
   system colours and cannot wear the palette. With five options at most,
   laying them all out is also fewer taps than opening a picker.
25. **The add button asks for a type first.** The web anchored a menu to an
   "Add task" button; here the same menu anchors to the floating add button,
   then opens the editor. A task's type cannot change once it exists — the
   database's check constraints are written per type — so it is asked before
   anything else has been typed. The per-column quick-add field stays: fast
   capture and full detail are different affordances, and the web has both.
26. **pnpm uses `nodeLinker: hoisted`.** React Native cannot tolerate two copies
   of itself, and pnpm's default isolated layout produced exactly that. Adding a
   dependency whose peers differ can silently re-duplicate a native singleton, so
   after any install, check `find node_modules -type d -name react-native` finds
   exactly one — and launch the app.

### Slice notes

**S10** is the one genuine rewrite in the port rather than a translation.
`lib/avatar.ts` was built on `createImageBitmap`, a `<canvas>` and
`canvas.toBlob`, plus a probe for whether the browser could encode WebP at all
— `toBlob` answers an unsupported format with PNG rather than an error. None of
that exists here and none of it is needed: the system picker crops (which
replaces the web's centre-crop guess with the user's own choice), and
expo-image-manipulator encodes WebP on both platforms without asking.

What survived untouched is the *ordering*, which is the part that matters:
upload, then point the row at it, then delete the old object. A failed row
update makes the new object the orphan; the old one is only removed once
nothing refers to it, so the profile row never points at an image that is gone.

**S8** extracted `buildTagEdits` into `lib/tasks/tag-edits.ts`. The diff it
produces is subtle — a rename onto a name another row is giving up is only legal
because `saveTagEdits` deletes before it renames, `tags` being unique on
`(user_id, name)` — and a case-only difference counts as a duplicate.

**An overlay's animation state must not outlive one opening.** `BottomSheet`
and `Popover` both keep their stateful body in an inner component that is
mounted only while open. Holding it across closes left `BottomSheet` with its
entrance latched and `progress` stuck at 0: the modal was visible, but the sheet
sat off-screen behind a fully transparent scrim that went on swallowing every
touch, so the app looked dead and felt laggy. `Popover` had a milder form —
placing its first frame from the previous opening's measurement.

`components/ui/bottom-sheet.tsx` was lifted out of the task editor so the tag
sheet and tag picker share it: the animation, the measured height cap, the
keyboard lift and the modal flags each took a round to get right, and a second
copy would have drifted.

The tag sheet's Cancel snapshot is captured **by the caller, at the opening
gesture** rather than in an effect. Ticks apply live, so anything watching the
selection would overwrite the very thing Cancel exists to restore — and the
React Compiler rejects `setState` in an effect anyway.

**S7** extracted `buildTaskFields` and `validateTaskForm` into
`lib/tasks/task-fields.ts` rather than leaving them inside the editor. They are
pure, and the rule they carry fails *silently*: switching a daily from "on
certain days" to "every few days" must clear `repeat_days`, but
`tasks_frequency_payload_check` only requires the field the *current* frequency
uses — so a stale one is stored without complaint and is quietly wrong.

A sheet's height cap must be **measured, not a percentage**. `maxHeight: "92%"`
is 92% of the *screen* and ignores the keyboard, so once the keyboard pushed the
sheet up, a tall form grew straight past the status bar. The budget is
`screenHeight - insets.top - keyboardHeight - gap`.

`@react-native-community/datetimepicker`'s `onChange` is deprecated in favour of
`onValueChange` / `onDismiss` / `onNeutralButtonPress`. The replacement fires
only on a selection, so there is no `event.type` to sift and no optional date.

Date entry is the one place the design system gives way to the platform. A
calendar is something people already know how to use, and rebuilding one in the
app's palette would be worse, not more consistent. Note that an ISO date is a
calendar day, not an instant: `new Date("2026-09-24")` parses as UTC midnight,
which west of Greenwich is already the day before, so `date-field.tsx` converts
through *local* components in both directions.

## Known gaps carried over from the web build

Not bugs introduced by the port — record them, do not silently fix them:

- Password reset is incomplete: the web build's `redirectTo` points at
  `/reset-password`, which was never a route.
- Google and Apple sign-in are not enabled in Supabase.
- **Tags have no offline path** — creating, renaming and deleting tags fail
  loudly while tasks and logs queue.
- `tags.color`, `profiles.display_name`, `profiles.week_start`,
  `freeze_balance` and `tasks.archived_at` exist in the schema with no UI.
- The outbox's `task-create` replay returns before attaching tags when it hits a
  `23505` lost-reply.
- No live sync (nothing subscribes to Realtime).
- History is windowed at 30 days (habit strength) and 90 (streaks).
- Reordering is To top / To bottom only.

## Backend

**No schema change is needed.** Every table, constraint, RLS policy, trigger and
the `avatars` bucket already work for any Supabase client, and all date, streak
and strength logic is client-side and driven by `profiles.timezone`.

The one backend-adjacent change is *dashboard config*: add this app's deep-link
URL to Supabase → Authentication → URL Configuration → Redirect URLs, needed for
OAuth and email links. The app's scheme is `cadence`.
