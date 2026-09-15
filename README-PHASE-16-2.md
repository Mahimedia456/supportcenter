# Support Command Center — Phase 16.2

Phase 16.1 failed because the installer looked for one exact import formatting
pattern inside `ticket/[id].tsx`.

Phase 16.2 does not patch that import dynamically. It installs a known-good
ticket detail screen directly.

## Fixes

- AgentCard `agent` prop -> correct `row` prop
- Zendesk comment HTML/entity cleanup
- `&nbsp;` -> normal space
- mistyped `&nbps;` -> normal space
- `<br>` / `<br />` -> real new line
- paragraph/div closing tags -> paragraph break
- list items -> bullet lines
- HTML tags removed
- repeated whitespace / blank lines normalized

## Install

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-16-2.ps1
```

Expected:

```text
PASS: AgentCard compatibility checked.
PASS: Zendesk comment formatter active.
PASS: Phase 16.2 ticket comments + AgentCard fix complete.
```
