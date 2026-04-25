# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
expo start          # Start dev server (iOS/Android/Web)
expo start --web    # Web only
expo run:ios        # Native iOS build
expo run:android    # Native Android build
expo export --platform web   # Production web build (also: npm run build:web)
expo lint           # Lint
```

There are no automated tests in this project.

## Architecture

**CaloriePal** is an Expo SDK 54 / React Native app with Expo Router for navigation. It runs on iOS, Android, and web (deployed to Vercel).

### Routing

File-based routing via Expo Router:
- `app/_layout.tsx` — root layout; wraps all providers and implements the auth guard (redirects unauthenticated users to `/auth/login`)
- `app/(tabs)/_layout.tsx` — four-tab shell: Dashboard (`index`), Log New Meal (`log-meal`), My Macros (`my-macros`), Calendar (`explore`)
- `app/auth/` — login and signup screens (not behind the auth guard)

### State & Data Flow

All app state lives in a single React Context at `store/app-store.tsx` (no Redux/Zustand). It owns:
- Meal entries (loaded from Firestore on mount, kept in memory)
- The active chat session: messages, draft meal, session status, session history ref
- Macro goals and date notes
- Admin/premium access flags (derived from `EXPO_PUBLIC_ADMIN_EMAILS` / `EXPO_PUBLIC_PREMIUM_EMAILS`)

The meal logging flow end-to-end:
1. User types or speaks a meal description in `log-meal.tsx`
2. `sendMessage()` in the store calls `interpretMealWithGroq()` (`services/meal-interpreter.ts`)
3. The service posts the full session history to the xAI Grok API (`https://api.x.ai/v1/chat/completions`, model `grok-3-mini`). API key env var is `EXPO_PUBLIC_GROQ_API_KEY` (misnamed — it's an xAI key).
4. Response is either `{ status: "clarification_needed", question, options }` or `{ status: "ready", mealTitle, calories, protein, carbs, fat, components, ... }`
5. On confirmation, `saveMealFromInterpretation()` writes a `MealEntry` to Firestore under `/users/{uid}/meals/` and fires analytics events

Other Firestore collections per user: `/goals/` (single "default" doc), `/notes/` (date-keyed).

### Authentication

Firebase Auth (email/password) via `context/auth-context.tsx`. The `onAuthStateChanged` listener drives the root navigator — the store re-initializes whenever `uid` changes.

### A/B Testing & Remote Config

`context/remote-config-context.tsx` fetches Firebase Remote Config on startup. Two flags: `show_enhanced_summary` and `show_meal_breakdown`. Consumed via `useRemoteConfig()`. Platform stubs exist at `services/remote-config.web.ts` (returns defaults on web).

### Analytics

`services/analytics.ts` wraps Firebase Analytics. A parallel `services/analytics.web.ts` is a no-op (Firebase Analytics doesn't work on web). Key events: session start, clarification turns, completion, abandonment, voice mode toggle, photo used.

### Platform-Specific Files

Expo's platform extension resolution is used heavily:
- `*.ios.tsx` — iOS-native implementation (e.g., `components/ui/icon-symbol.ios.tsx` uses `expo-symbols` `SymbolView`)
- `*.web.ts` / `*.web.tsx` — Web fallbacks (analytics, remote config, color scheme hook)
- `*.tsx` (no suffix) — Android and web fallback

**Icons:** `IconSymbol` has two implementations. On iOS it renders SF Symbols natively. On web/Android it renders Lucide icons (`lucide-react-native`) mapped by SF Symbol name (e.g., `'house.fill'` → `Home`). When adding a new tab icon, update both `icon-symbol.tsx` (Lucide map) and `icon-symbol.ios.tsx` (SF Symbol passthrough).

### Theme & Styling

`constants/theme.ts` exports `Colors` (light/dark), `Layout` (spacing/radii), and `Shadows`. Use `useColorScheme()` to get the current scheme and index into `Colors[colorScheme]`. `ThemedText` and `ThemedView` are convenience wrappers. System fonts are used throughout (`fontFamily` is `undefined`); use `fontWeight` values (`'400'`/`'600'`/`'700'`/`'800'`) for weight differentiation.

### Path Aliases

`@/*` resolves to the repo root (configured in `tsconfig.json`). Always use `@/` imports rather than relative paths.

## Environment Variables

All variables use the `EXPO_PUBLIC_` prefix and are bundled into the client.

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_GROQ_API_KEY` | xAI API key (misnamed — used for Grok, not Groq) |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase project API key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firestore project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` | Google Analytics measurement ID |
| `EXPO_PUBLIC_ADMIN_EMAILS` | Comma-separated admin emails (unlocks admin features) |
| `EXPO_PUBLIC_PREMIUM_EMAILS` | Comma-separated premium emails (unlocks premium features) |

## Key Domain Types

Defined in `models/domain.ts`:
- `MealEntry` — saved meal with macros, components, timestamp, source (`'ai'` | `'manual'`)
- `MealComponent` — individual food item within a meal (name, quantity, calories, macros)
- `MacroGoals` — daily calorie/protein/carbs/fat targets
- `ChatMessage` — chat bubble (role, text, type: `'message'` | `'clarification'` | `'confirmation'`)
- `ChatSessionStatus` — `'awaiting_input'` | `'awaiting_clarification'` | `'ready_to_confirm'` | `'saving'` | `'saved'` | `'error'`
- `MealDraft` — in-memory meal being constructed before saving

## iOS Permissions

The app requires microphone and speech recognition permissions (configured in `app.json`) for the hands-free voice logging feature in `log-meal.tsx`.
