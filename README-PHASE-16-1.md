# Support Command Center — Phase 16.1

Fixes both issues reported after Phase 16.

## 1. AgentCard TypeScript error

The existing component expects:

```tsx
<AgentCard row={agent} />
```

Phase 16 accidentally passed:

```tsx
<AgentCard agent={agent} />
```

The installer patches this to the correct `row` prop.

## 2. Zendesk comment formatting

Zendesk comments containing HTML/entity content are normalized before display.

Handled examples:

```text
&nbsp;
&nbps;
&#160;
&amp;
&lt;
&gt;
<br>
<br />
<p>...</p>
<div>...</div>
<li>...</li>
```

`<br>` and paragraph boundaries become real React Native text line breaks instead
of appearing literally inside the comment.

Repeated blank lines and spaces are also cleaned.

## Install

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-16-1.ps1
```

Expected:

```text
PASS: AgentCard now uses row={a}.
PASS: HTML entities and line breaks normalized.
PASS: Phase 16.1 AgentCard + comment formatting fix complete.
```
