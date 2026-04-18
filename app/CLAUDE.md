@AGENTS.md

# Banjo Trades - Collaboration Rules

## Git Safety (MANDATORY for all contributors)

Before editing ANY file:
1. Run `git pull origin main` to get the latest changes
2. Run `git status` to check for uncommitted local changes
3. If the file you're about to edit has been modified by someone else since your last pull, pull again before touching it

Before committing:
1. Run `git diff` to review your changes
2. Never commit directly to `main`. Always create a feature branch: `git checkout -b feature/your-change`
3. Push your branch and open a Pull Request
4. The other developer reviews and merges

If you encounter merge conflicts:
1. Do NOT force-push or discard the other person's changes
2. Resolve conflicts manually, keeping both sets of changes where possible
3. If unsure, ask before resolving

## Branch naming
- `feature/` for new features (e.g. `feature/add-risk-calculator`)
- `fix/` for bug fixes (e.g. `fix/chart-not-loading`)
- `refactor/` for code cleanup (e.g. `refactor/sidebar-styles`)

## Stack
- Next.js 16 (App Router, Turbopack)
- Supabase (Auth with Google OAuth, Postgres with RLS)
- TailwindCSS v4
- TradingView charts (tv.js library)
- Yahoo Finance API for live ICT analysis (via curl in API routes)
- TypeScript throughout

## Project structure
- `src/app/(dashboard)/` - all authenticated pages
- `src/app/(auth)/` - login page
- `src/app/api/` - API routes (analysis, theme)
- `src/components/` - React components (dashboard/, layout/, providers/)
- `src/lib/` - shared utilities (ict.ts, theme.ts, supabase/)

## Theme system
- Theme colours flow from `src/lib/theme.ts` through `ThemeProvider`
- All components should use `useTheme()` and apply colours via `style={}` props
- Theme customisation lives on the Settings page (`/settings`)
- The sidebar respects theme colours but does NOT contain theme controls

## Environment
- `.env.local` holds all secrets (Supabase keys, Finnhub API key)
- Never commit `.env.local`
- `.env.local.example` shows what keys are needed
