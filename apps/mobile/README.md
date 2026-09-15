# Support Command Center — Phase 01

Phase 01 is the Expo SDK 57 mobile foundation with the brand assets already placed.

## Included
- Expo SDK 57 + TypeScript + Expo Router foundation
- Generic Support Command Center icon, splash and login artwork
- Light professional green/cyan/lime theme tokens
- Login screen with **no AngelBird/Atomos logo**
- SecureStore session persistence
- Phase-01 mock workspace resolver:
  - `aamir@mahimediasolutions.com` → AngelBird
  - `shahid@mahimediasolutions.com` → Atomos
- Overview / Tickets / Insights / Devices / Alerts tab shell
- Zendesk-style read-only ticket mock UI
- Forms overview mock UI
- Pull-to-refresh wired on Overview
- Workspace logo folders ready for official assets

## Important: official logos
Replace the placeholders with:
- `assets/brand/workspaces/angelbird/angelbird-logo.png` (or SVG later with SVG support)
- `assets/brand/workspaces/atomos/atomos-logo.png`

Phase 01 currently renders a safe text workspace mark because the official logos were not provided in this chat. The UI is already workspace-aware, so Phase 02 can switch this component to the official file returned for the resolved workspace.

## Install / run (PowerShell)
```powershell
cd E:\SupportCommandCenter\apps\mobile
npm install
npx expo install --fix
npx expo install expo-secure-store
npm start
```

Expo SDK 57 requires Node 22.13.x or newer.

## Phase boundaries
Phase 01 intentionally has no Zendesk credentials and no production backend calls. Never put Zendesk tokens in Expo `.env`. Phase 02 adds NestJS/Supabase auth, real workspace resolution, and server-side Zendesk connections.
