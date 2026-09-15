# Support Command Center — Phase 17 Zendesk Native Data

This phase replaces heuristic-only operational data with Zendesk's official
Ticketing APIs.

## Authentication

OAuth is supported optionally through:

- `ANGELBIRD_ZENDESK_OAUTH_TOKEN`
- `ATOMOS_ZENDESK_OAUTH_TOKEN`

If an OAuth token is present, the backend uses Bearer authentication.

If it is not present, the existing admin/agent email + API token configuration
continues to work.

OAuth is not required merely to receive Forms, custom fields, Tickets, Comments,
Ticket Metrics, Groups or Agents. It is primarily the preferred long-term
authentication model.

## Official Zendesk endpoints now used

- Tickets/Search
- Ticket Forms
- Ticket Fields / custom fields
- Groups
- Agents
- Satisfaction Ratings
- Ticket Metrics
- Incremental Ticket Metric Events
- Ticket comments
- Per-ticket metrics

## Alerts

Real operational alerts now include:

- actual Zendesk SLA breach events when the authenticated Zendesk user is Admin
- no first reply after 2 hours
- first reply took more than 120 minutes
- unsolved more than 24 hours
- unsolved more than 72 hours
- no ticket update for 24 hours
- reopened tickets
- high/urgent tickets
- active unassigned tickets
- bad CSAT
- product support spikes

Ticket Metric Events are admin-only on Zendesk. If not available, the Alerts
screen continues working with Ticket Metrics and clearly reports that exact SLA
breach events are unavailable.

## Devices

The Devices tab now represents Zendesk product/device custom fields.

It:

- discovers Atomos Product / Product / Product 1 / Device / Model fields
- reads actual dropdown option labels
- seeds all dropdown products even if a product has zero tickets
- groups tickets product-wise
- displays Faulty / RMA / Open / trend counts
- includes a proper search icon

## Insights

Forms, Issues, Products and Regions no longer depend on Satisfaction/Agents
requests succeeding.

Each optional source loads independently using `Promise.allSettled`.

All active forms remain visible even with zero current tickets.

## Overview

Adds an `All` period. The backend `scope=all` search retrieves up to the Zendesk
Search API result cap; the response includes `limited: true` when the local cap
is reached.

## Install

Merge into:

`E:\Supportcenter`

Then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-17.ps1
```

Then commit and push because backend files changed:

```powershell
cd E:\Supportcenter
git add .
git commit -m "Add Zendesk native metrics and product data"
git push
```

Redeploy the Vercel backend before testing mobile.
