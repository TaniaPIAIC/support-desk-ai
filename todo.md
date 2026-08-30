# Project TODO

- [x] Define ticket, assignment, message, AI triage, and status data model
- [x] Add persistent schema and apply database migration
- [x] Add authenticated server procedures for ticket list/detail, creation, replies, assignments, triage, and status changes
- [x] Add realistic seeded MVP ticket states and threaded messages
- [x] Build elegant support desk shell with sidebar navigation and role switcher
- [ ] Build customer portal connected to authenticated tRPC mutations for ticket creation, status tracking, and replies
- [ ] Connect agent workspace queue, replies, assignments, and resolution controls to authenticated tRPC mutations
- [ ] Compute supervisor statistics from persistent ticket data and connect the supervisor view to tRPC
- [x] Integrate server-side AI triage with category, urgency, summary, routing, and confidence (backend procedure and persisted create flow)
- [x] Add interaction feedback, loading/empty/error states, and responsive behavior
- [ ] Expand Vitest coverage for ticket permissions, create/reply/update flows, and AI triage fallback
- [x] Run typecheck, tests, and browser preview verification
- [ ] Save final checkpoint and deliver project version

## Hardening pass

- [x] Add per-ticket authorization and not-found handling to ticket get/reply/update procedures
- [x] Seed realistic tickets and threaded messages into the database, then load them through authenticated procedures
- [ ] Wire customer, agent, and supervisor UIs to authenticated tRPC queries and mutations instead of local-only state
- [x] Invoke AI triage during ticket creation, persist category, priority, summary, route, and confidence, with fallback behavior
- [ ] Compute supervisor statistics from ticket data and add loading, error, and empty states
- [ ] Add Vitest coverage for ticket permissions, create/reply/update flows, and AI triage fallback
- [ ] Save a final checkpoint before delivery
