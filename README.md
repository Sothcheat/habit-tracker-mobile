# Cadence — Expo

A habit tracker for the things you repeat: **habits** you tap through the day,
**dailies** that follow a schedule, and **to-dos** you finish once.

This is a port of the React + Vite web build at
[Sothcheat/habit-tracker](https://github.com/Sothcheat/habit-tracker), which
remains the source of truth for behaviour, copy and design. Both apps share one
Supabase project and one database — sign in on either and the same tasks are
there.

## Running it

Requires **Node 22+**, **pnpm**, and access to the Supabase project.

```bash
pnpm install
cp .env.example .env.local     # fill in the project URL and anon key
npx expo start
```

Open it in **Expo Go** — every native module used here ships with it, so no
development build is needed.

Only ever the **anon** key. Anything prefixed `EXPO_PUBLIC_` is compiled into
the app bundle and is readable by anyone who installs it; row level security is
what keeps data private. A service-role key here would hand every installed copy
full access to the database.

```bash
npx expo start      # dev server
npx expo lint       # lint
npx tsc --noEmit    # typecheck
npx jest            # unit tests
npx expo-doctor     # dependency and config diagnosis
```

## What is where

```
src/app/                  routes only — every file is a screen or a _layout
  (auth)/                 sign in, sign up
  (app)/                  the tracker: one tab per task type
src/components/ui/        design-system primitives
src/components/tracker/   cards, columns, the task editor, tags
src/lib/tasks/            api.ts holds every query; use-tracker.ts holds state
src/lib/tasks/selectors.ts   the derived view model, shared by the three tabs
src/lib/tasks/outbox.ts   writes waiting for the network
src/lib/tasks/snapshot.ts the read cache that lets the app open offline
PORTING.md                how the web build translates — read it before coding
```

## How it behaves

**Writes are confirmed, not optimistic.** State changes only once the server
returns the row. The single exception is an unreachable network: the write goes
to an outbox, is applied locally, and replays in order on reconnect. A write the
database *refuses* still fails loudly — the rule bends for the connection, not
for the database.

**Reads come from a snapshot first**, then refresh. Opening offline shows what
you last saw rather than an error.

**"Today" is the user's local date**, resolved from `profiles.timezone` and
recomputed while the app is open, so a habit tapped at 00:05 is not logged to
yesterday.

## Building

```bash
npx eas-cli@latest build --profile preview --platform android
```

`.env.local` is gitignored and never reaches a cloud build, so
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` have to be set as
EAS environment variables for any build made on EAS.

## Known gaps

Carried over from the web build rather than introduced here — see the full list
in [PORTING.md](PORTING.md).

- Google and Apple sign-in are not enabled in Supabase, so neither is offered.
- Password reset is incomplete.
- Tags need a connection: creating, renaming and deleting them fail loudly,
  while tasks and logs queue offline.
- No live sync — nothing subscribes to Realtime.
- History is windowed at 30 days for habit strength and 90 for streaks.
