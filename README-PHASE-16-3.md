# Support Command Center — Phase 16.3

## Account/Profile fixes
- SafeAreaView prevents status-bar overlap
- real Ionicons chevron-back replaces broken encoded glyph
- broken `â€¹`, `â€¢`, `â€º` text removed
- workspace header does not double-apply safe area
- profile cards, typography and spacing polished
- system health row gets proper icon
- logout gets real icon

## Shared tab header
`WorkspaceHeader` now respects the device top safe-area inset by default.

Profile passes `safeTop={false}` because the whole Profile screen is already
inside SafeAreaView.

## Overview recovery
Phase 16 made 90-day analytics part of the blocking initial load. On a slow or
failing analytics request this could show `Unable to load overview`.

Phase 16.3 changes the loading strategy:

1. Fetch fast `/zendesk/tickets` first.
2. Render Overview as soon as recent tickets arrive.
3. Fetch Zendesk health separately; health failure never blocks metrics.
4. Fetch 90-day analytics in the background.
5. Replace recent tickets with 90-day data when successful.
6. If analytics fails, continue showing the working recent-ticket snapshot.
7. If no session token exists, stop the loader and show a clear session error.

## Install

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-16-3.ps1
```
