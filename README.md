# 🧪 Glycer Expo Template

<div align="center">

[![Expo](https://img.shields.io/badge/Expo-54.0-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**A production-ready Expo template with AI-powered chat, image generation, real-time backend, and full-stack tooling — built for the modern mobile developer.**

[Getting Started](#-getting-started) · [Features](#-features) · [Project Structure](#-project-structure) · [AI Services](#-ai-services) · [Scripts](#-scripts) · [Contributing](#-contributing)

</div>

---

## ✨ Features

- 🤖 **Multi-Provider AI Integration** — OpenAI (GPT-5), Anthropic (Claude 4.5), Grok 4 with streaming support
- 🎨 **AI Image Generation** — GPT Image 1.5 with text-to-image, image editing, and multiple sizes/formats
- ⚡ **Real-time Backend** — Hono + tRPC server with Convex for real-time data
- 🗄️ **Database ORM** — Prisma with full migration support
- 🧭 **File-based Routing** — Expo Router v6 with typed routes
- 🎯 **New Architecture** — React Native new arch enabled by default
- 📡 **Tunnel SDK** — `@urmatetech/tunl-sdk` for secure device-to-sandbox communication
- 🔒 **TypeScript First** — Strict typing throughout the entire codebase
- 🧩 **State Management** — Zustand + TanStack Query pre-configured
- 📱 **Cross Platform** — iOS, Android & Web out of the box

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | ≥ 18.x | [nodejs.org](https://nodejs.org) |
| **Bun** | Latest | `curl -fsSL https://bun.sh/install \| bash` |
| **Expo CLI** | Latest | `npm install -g expo` |
| **Git** | Any | [git-scm.com](https://git-scm.com) |

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/xgauravyaduvanshii/glycer-expo-template.git
cd glycer-expo-template
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# E2B Sandbox / Project Config
EXPO_PUBLIC_PROJECT_ID=your_project_id_here
EXPO_PUBLIC_SESSION_TOKEN=your_session_token_here

# EAS (optional)
EAS_PROJECT_ID=your_eas_project_id
```

> **Note:** `EXPO_PUBLIC_PROJECT_ID` is used to construct the proxy URLs for AI APIs and the backend. Never use `localhost` — the app runs on the user's physical device.

### 4. Start the Development Server

```bash
# Start Metro + all services
bun run dev

# Or individually:
bun run start       # Expo only
bun run android     # Android
bun run ios         # iOS
bun run web         # Web
```

---

## 📁 Project Structure

```
glycer-expo-template/
├── app/                        # Expo Router screens (file-based routing)
│   ├── _layout.tsx             # Root layout
│   └── index.tsx               # Home screen
│
├── lib/
│   ├── ai/
│   │   ├── chat-service.ts     # Multi-provider AI chat (OpenAI / Anthropic / Grok)
│   │   ├── asset-generation.ts # Image generation & editing (GPT Image 1.5)
│   │   ├── openrouter.ts       # Unified API client
│   │   └── sandbox-config.ts   # E2B sandbox environment config
│   └── types/
│       └── ai.ts               # Shared AI TypeScript types
│
├── assets/
│   ├── fonts/                  # Custom fonts
│   └── images/                 # App icons, splash screen, favicon
│
├── scripts/
│   ├── start-dev.sh            # Dev environment bootstrap
│   ├── start-backend.sh        # Hono backend startup
│   ├── start-convex.sh         # Convex real-time service startup
│   ├── start-tunnel.mjs        # Tunnel for device access
│   ├── start-prisma-studio.sh  # Prisma Studio on port 5555
│   ├── expo-logger.js          # Expo process logger
│   ├── prewarm-bundle.js       # Metro bundle pre-warmer
│   ├── generate-asset.js       # CLI image generation tool
│   └── convex-api-proxy.js     # Convex anonymous mode proxy
│
├── patches/                    # patch-package patches
│   ├── @expo+metro-runtime+6.1.2.patch
│   └── react-native+0.81.4.patch
│
├── app.config.js               # Dynamic Expo config (replaces app.json)
├── metro.config.js             # Metro bundler config
├── tsconfig.json               # TypeScript config
└── package.json
```

---

## 🤖 AI Services

This template includes a **Multi-Provider AI Proxy** that routes requests to OpenAI, Anthropic, or Grok based on the endpoint called.

### Proxy Routing

| Endpoint | Provider |
|----------|---------|
| `POST /v1/chat/completions` | OpenAI (default) |
| `POST /v1/chat/completions` (grok model) | Grok |
| `POST /v1/messages` | Anthropic |
| `POST /v1/images/generations` | OpenAI GPT Image |

### Available Models

**OpenAI**
- `gpt-5-2025-08-07` _(default, vision support)_
- `gpt-5.2`, `gpt-4o`, `gpt-4o-mini`

**Anthropic**
- `claude-sonnet-4-5-20250929` _(default)_
- `claude-haiku-4-5-20251001`, `claude-opus-4-5-20251101`

**Grok (xAI)**
- `grok-4-latest` _(default)_
- `grok-4.1-fast`

### Chat Service Usage

```typescript
import {
  // Streaming
  streamOpenAIChat,
  streamAnthropicChat,
  streamGrokChat,
  // Non-Streaming
  getOpenAITextResponse,
  getAnthropicTextResponse,
  getGrokTextResponse,
} from '@/lib/ai/chat-service';
import type { AIMessage } from '@/lib/types/ai';

// Streaming example
const messages: AIMessage[] = [
  { role: 'user', content: 'Hello! Tell me about React Native.' }
];

await streamOpenAIChat(messages, (chunk, done) => {
  if (!done) console.log(chunk);
  else console.log('Stream complete!');
});

// Non-streaming example
const response = await getAnthropicTextResponse(messages, {
  model: 'claude-sonnet-4-5-20250929',
  maxTokens: 2048,
});
console.log(response.content);
```

### Image Generation Usage

```typescript
import {
  generateImage,
  generateImageAsDataUrl,
  editImage,
} from '@/lib/ai/asset-generation';

// Generate an image
const images = await generateImage('A futuristic city at sunset', {
  size: '1536x1024',
  quality: 'high',
  outputFormat: 'png',
});

// Get as a data URL (ready for <Image> component)
const dataUrl = await generateImageAsDataUrl('A cute robot waving', {
  size: '1024x1024',
  background: 'transparent',
});

// Edit an existing image
const edited = await editImage(base64ImageString, 'Add a rainbow in the sky');
```

---

## 🗄️ Database (Prisma)

```bash
# Generate Prisma client
bun run db:generate

# Push schema to database
bun run db:push

# Run migrations
bun run db:migrate

# Open Prisma Studio (UI on port 5555)
bun run db:studio
```

---

## ⚡ Real-time (Convex)

```bash
# Start Convex in dev mode
bun run convex:dev

# Deploy to production
bun run convex:deploy
```

---

## 🌐 Backend (Hono + tRPC)

The backend runs as a Hono server on **port 5000** with tRPC integration.

```bash
# Start the backend server
bun run backend
```

Access via: `https://5000-{PROJECT_ID}.e2b.app`

---

## 📜 Scripts Reference

| Script | Description |
|--------|-------------|
| `bun run dev` | Start all dev services (Metro, backend, tunnel) |
| `bun run start` | Start Expo Metro bundler |
| `bun run android` | Launch on Android |
| `bun run ios` | Launch on iOS |
| `bun run web` | Launch on Web |
| `bun run backend` | Start Hono/tRPC backend |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:push` | Push Prisma schema |
| `bun run db:migrate` | Run database migrations |
| `bun run db:studio` | Open Prisma Studio |
| `bun run convex:dev` | Start Convex dev server |
| `bun run convex:deploy` | Deploy Convex to production |
| `bun run prewarm` | Pre-warm Metro bundle |
| `bun run lint` | Run ESLint |

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Expo 54, React Native 0.81, React 19 |
| **Language** | TypeScript 5.9 |
| **Routing** | Expo Router 6 |
| **State** | Zustand 5, TanStack Query 4 |
| **Backend** | Hono 4, tRPC 10 |
| **Real-time** | Convex |
| **Database** | Prisma 6 |
| **Package Manager** | Bun |
| **AI** | OpenAI, Anthropic, Grok via unified proxy |
| **Navigation** | React Navigation 7 |
| **Animations** | React Native Reanimated 4 |
| **Icons** | Lucide React Native, Expo Vector Icons |
| **Maps** | React Native Maps |

---

## 🔧 Configuration

### `app.config.js`

The app uses a dynamic config file (instead of `app.json`) to support environment variable injection at build time.

Key settings:
- **Scheme:** `glycer`
- **New Architecture:** Enabled (`newArchEnabled: true`)
- **Typed Routes:** Enabled (`experiments.typedRoutes: true`)
- **Web Output:** Static via Metro bundler

### `tsconfig.json`

Path aliases are configured:
- `@/*` → project root (e.g., `@/lib/ai/chat-service`)

---

## 🚨 Important Notes

> **Never use `localhost`** for API calls — the app runs on a physical device or emulator, so all service URLs must use the E2B public URLs (`https://{PORT}-{PROJECT_ID}.e2b.app`).

> **Session Token** — All API requests require the `x-session-token` header set via `EXPO_PUBLIC_SESSION_TOKEN`.

> **Reasoning Models** — Some OpenAI reasoning models do not support `temperature` or `max_tokens`. This template uses `max_completion_tokens` and omits temperature for maximum compatibility.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Commit** your changes: `git commit -m 'feat: add your feature'`
4. **Push** to the branch: `git push origin feature/your-feature-name`
5. **Open** a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ by [Glycer](https://github.com/xgauravyaduvanshii)

⭐ **Star this repo** if you find it useful!

</div>
