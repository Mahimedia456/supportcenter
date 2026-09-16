# Phase 18.3 — Atomos Fields Final

This fixes the situation where ticket detail already shows Device, Support Type,
Region, Category, RMA and Fault Category but Insights/Devices are empty.

The previous aggregate screens used broad heuristics and could select the wrong
custom field. Phase 18.3 maps the actual semantic field titles separately.

Insights now contains:
- Forms
- Support Type
- Products
- Regions
- Category
- Fault
- RMA
- Custom
- Feedback
- Team

Devices is built from the same Device/Product custom field used by ticket
detail, and seeds Zendesk dropdown options plus actual ticket values.

Ticket Detail now has a real safe-area header and Ionicons back button.

Production source diagnostic:
`https://supportcenter-kappa.vercel.app/api/zendesk-diagnose`

It independently verifies Tickets, Forms, Fields, Groups, Agents, Views,
Satisfaction Ratings and Ticket Metrics.

OAuth `No such client` is a Zendesk OAuth registration error, not a mobile
mapping error. In Atomos Zendesk Admin Center go to:

Apps and integrations -> APIs -> OAuth clients

and confirm the saved client's Identifier exactly matches the Vercel
`ATOMOS_ZENDESK_CLIENT_ID`.
