# Domain Name Generator — AI-Powered Domain Search

> Find the perfect domain name for your project in seconds using AI.

An open-source, full-stack web application built with **Next.js 15** that generates creative, brandable domain name suggestions powered by **Google Gemini AI**, checks domain availability (DNS/WHOIS with optional Domainr/Namecheap), and displays real-time pricing — all in a modern, dark/light-mode UI. A **CLI** reuses the same generation and checks without touching the frontend.

---

## Features

- **AI-Generated Suggestions** — Describe your idea and get 12+ creative, brandable domain names instantly (streaming output)
- **Live Availability Checking** — Each domain is checked with DNS/WHOIS (and optional third-party APIs if configured)
- **Domain Pricing** — See registration prices per TLD so you can compare costs at a glance
- **Advanced Filters** — Filter by TLD (`.com`, `.io`, `.ai`, `.co`, etc.), name length, and more
- **Favourites** — Save domains you love locally; view and manage them on a dedicated page
- **CLI** — Run the same Gemini + availability pipeline from the terminal (`npm run cli`) without starting the Next.js UI

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui + Radix UI |
| AI | Google Gemini 2.0 Flash |
| Availability | DNS / WHOIS (+ optional Domainr, Namecheap) |
| Animations | Framer Motion |

---

## Getting Started

### Prerequisites

- Node.js 20.x
- npm 10.x
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (free tier available)

### 1. Clone the repository

```bash
git clone https://github.com/bennyblanco4/domize-domain-generator.git
cd domize-domain-generator
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your API keys (see [Environment Variables](#environment-variables) below).

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI generation |
| `RAPIDAPI_KEY` | Optional | RapidAPI key for Domainr (more accurate checks) |
| `NAMECHEAP_*` | Optional | Namecheap API vars (see `.env.example`) |

Copy `.env.example` to `.env.local` and fill in the values. **Never commit `.env.local`.**

---

## Project Structure

```
src/
├── app/
│   ├── api/domains/        # API routes: generate, check availability
│   ├── domain/             # Main domain search page
│   ├── favourites/         # Saved domains page
│   └── layout.tsx          # Root layout
├── components/             # Shared UI components
│   ├── ui/                 # shadcn/ui primitives
│   ├── DomainCard.tsx      # Domain result card
│   ├── DomainPricing.tsx   # Pricing display
│   └── ...
├── context/                # React context (Favourites, Theme)
├── hooks/                  # Custom React hooks
├── lib/                    # Shared logic (Gemini, availability checks)
├── cli/                    # CLI (same engine as the API; no React/Next UI)
└── utils/                  # Helper utilities
```

---

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run clean        # Clear .next cache
npm run cli          # Terminal domain generator (uses GEMINI_API_KEY from env / .env.local)
```

CLI example:

```bash
npm run cli "habit tracker for remote teams"
```

The CLI keeps generating and checking until it finds **12 available domains** (same as the web app). Use `--goal 6` to change the target.
