## Project Summary
6GAMER is a premium gaming platform featuring 6 exclusive games with real-time global leaderboards, achievements, and a royal gold aesthetic. It provides a high-performance experience with cross-device compatibility.

## Tech Stack
- **Framework**: Next.js 15.3.5 (Turbopack)
- **Frontend**: React 19, Framer Motion, Tailwind CSS 4, Lucide React
- **Backend/Database**: Firebase (Firestore for real-time scores), Drizzle ORM (local DB), Better Auth
- **Utilities**: Three.js (3D), Stripe (Payments), Nodemailer (Email), Sonner (Toasts)

## Architecture
- `src/app`: Next.js App Router for pages and API routes
- `src/components`: Reusable UI components and game implementations
- `src/lib`: Shared utilities, hooks, and database configurations
- `src/hooks`: Custom React hooks

## User Preferences
- Only update, change, or remove exactly what is requested
- No extra features or unsolicited changes

## Project Guidelines
- Maintain the premium gold aesthetic
- Use Firebase for real-time features
- Follow existing patterns for components and API routes
- No comments unless requested

## Common Patterns
- Framer Motion for animations
- Lucide React for icons
- Shadcn/ui-like components in `src/components/ui`
- **Leaderboard**: Auto-sliding pagination (5s interval)
- **Games**: Infinite play mode (only ends on loss), immersive sounds, and automatic fullscreen on start
- **Dev Indicators**: Disabled in `next.config.ts` for a production-like aesthetic.
- **Report**: Comprehensive 12,000+ word technical report available in `MINOR_PROJECT_REPORT.md`.

## Ludo King Specifics
- Local AI only (rule-based: prioritize hits, home racing, safe spots)
- Keyboard support: Space/Enter to roll, 1-4 to move
- Strict Auth: Login required for all games, admin test mode available for `admin@6gamer.com`
- Redirect: Users are automatically redirected to `/user-dashboard` after login/verification
