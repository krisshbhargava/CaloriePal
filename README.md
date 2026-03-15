# CaloriePal

A React Native (Expo) app for tracking calories and macros through natural language chat. Describe what you ate, answer a few quick questions, and CaloriePal logs the macros automatically.

## Features

- **Conversational meal logging** — type what you ate in plain English; the AI asks targeted follow-up questions (sauces, portion size, cooking method, etc.) before committing to an estimate
- **Button-based clarification** — follow-up questions come with tappable option chips so you rarely have to type more than once
- **Meal summary modal** — after confirming, a clean popup shows calories, protein, carbs, and fat before resetting the chat
- **Edit past meals** — tap any logged meal to edit macros manually or re-open the AI chat with the original meal pre-loaded as context
- **Daily macro progress** — dashboard shows progress bars toward your calorie and macro goals
- **Animated typing indicator** — three-dot pulse while the AI is thinking

## Tech stack

- [Expo](https://expo.dev) (SDK 54, New Architecture enabled)
- [Expo Router](https://expo.dev/router) for file-based navigation
- [xAI Grok](https://x.ai) (`grok-3-mini`) for meal interpretation
- React Context for state management
- TypeScript throughout

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Add your xAI API key

Create a `.env` file in the project root:

```
EXPO_PUBLIC_GROQ_API_KEY=xai-your_key_here
```

Get a key at [console.x.ai](https://console.x.ai). The `EXPO_PUBLIC_` prefix is required for Expo to expose the variable to the app bundle.

> **Note:** This key is included in the app bundle and visible to anyone who inspects it. Fine for personal/prototype use — for production, route API calls through a backend.

### 3. Start the app

```bash
npx expo start
```

Press `i` for iOS simulator, `a` for Android, or scan the QR code with Expo Go on your phone.

If the simulator fails to connect, try:

```bash
npx expo start --clear
```

Or for network issues:

```bash
npx expo start --tunnel
```

## Project structure

```
app/
  (tabs)/
    index.tsx        # Dashboard — daily macro totals + meal list
    log-meal.tsx     # Chat interface for logging meals
    my-macros.tsx    # Weekly macro analytics
components/
  meal-summary-modal.tsx   # Post-save confirmation popup
  edit-meal-modal.tsx      # Manual or AI-assisted meal editing
  typing-dots.tsx          # Animated three-dot indicator
services/
  ai-meal-interpreter.ts   # xAI API call + response parsing
  macro-aggregation.ts     # Daily/weekly macro summaries
store/
  app-store.tsx            # React Context — all app state
models/
  domain.ts                # TypeScript types
```

## Chat flow

1. User describes a meal (e.g. "chicken nuggets with sauce")
2. AI asks 1–3 targeted questions with button options (e.g. "What sauce?" → Ranch / BBQ / None / Other)
3. Once it has enough detail, AI returns a macro estimate
4. User confirms → meal is saved and a summary modal appears
5. Chat resets, ready for the next meal
