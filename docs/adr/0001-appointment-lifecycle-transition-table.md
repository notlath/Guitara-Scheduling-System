# ADR-0001 — The Appointment Lifecycle is one transition table, enforced in the model

- **Status:** Accepted
- **Date:** 2026-09-09
- **Supersedes:** nothing
- **Related:** [ADR-0002](0002-single-source-of-truth-for-server-state.md),
  [ARCH-001](../tickets/ARCH-001-implementation-plan.md)

## Context

An Appointment moves through 25 declared Statuses via ~21 Moves. That Lifecycle is real, but it has
never been written down. It is re-derived at every call site, in seven places:

| Where | What it re-states |
|---|---|
| `guitara/scheduling/views.py:757-3366` | 21 Moves, each guard an inline `if appointment.status != "…"` |
| `guitara/scheduling/models.py:492-536` | `can_*()` guards — **zero callers** |
| `guitara/scheduling/models.py:417-487` | `clean()` conflict validation — never invoked (`full_clean()` is called nowhere) |
| `royal-care-frontend/src/features/scheduling/schedulingSlice.js:1571-1940` | 12 thunks, byte-identical but for one URL segment |
| `.../hooks/useEnhancedRedux.js` | wraps the thunks with one optimistic payload |
| `.../hooks/useInstantUpdates.js` | wraps them again with a *different* optimistic payload |
| `.../components/TherapistDashboard.jsx:58-151` | a private axios client with its own `getBaseURL()` and token read |

Because no single place owns the rules, they have drifted into contradictions that are already in
`main`:

- **Two Moves claim the same source Status and disagree on the destination.** `mark_completed`
  (`views.py:2653`) and `mark_payment_received` (`:2799`) both require `awaiting_payment`, both are
  Operator-only, and land on `payment_verified` vs `completed`.
- **Two Moves have no guard at all.** `cancel` (`:1275`) and `complete` (`:1324`) move an Appointment
  to a terminal Status from *any* Status, including `pending`.
- **Two confirmation vocabularies coexist.** `accept` produces `confirmed`; `therapist_confirm`
  produces `therapist_confirmed`. The frontend only calls the second, so `accept`, `start` and
  `cancel` are unreachable — and `start` guards on `confirmed`, which nothing living produces.
- **A Status is written that `STATUS_CHOICES` does not contain.** `mark_completed` sets
  `payment_verified` (`:2692`); it is load-bearing (`check_materials_status` reads it at `:3786`)
  but absent from the model's choices, so rows persist a value the schema does not declare.
- **The model's guards disagree with the views they were meant to govern.** `can_driver_confirm`
  (`models.py:496`) expects the Legacy Status `therapist_confirm` where `views.py:2314` expects
  `therapist_confirmed`; `can_start_session` (`:522`) expects `arrived` where `views.py:2563`
  expects `dropped_off`.
- **One guard was deleted by a stray comment and nobody noticed.** At `models.py:492` a comment and
  a `def` were joined onto one line, so `can_therapist_confirm` does not exist and its body is
  unreachable code after the `return` inside `__str__`. Confirmed by AST parse.

The drift is not the disease. It is the symptom of there being no seam at which a Transition can be
stated once.

## Decision

**The Lifecycle becomes one transition table, and `Appointment.save()` is the only place that may
change a Status.**

Concretely:

1. A new Module, `guitara/scheduling/lifecycle.py`, exports a `TRANSITIONS` table and one function:

   ```python
   def resolve(current_status: str, move: str, role: str) -> Transition
   ```

   `resolve` returns the Transition or raises `IllegalTransition`. It touches no database, no
   request, no channel layer. It is a pure function of `(status, move, role)`.

2. Each Transition declares: the Statuses it is legal `from`, the `role` permitted, the `to` Status,
   the fields it stamps, and the notification event it emits.

3. `Appointment.save()` enforces the table. Any code path that writes a Status passes through it —
   HTTP, WebSocket, management command, shell.

4. The 21 view actions collapse to a lookup. The seam moves up to a single endpoint,
   `POST /api/scheduling/appointments/:id/transition/` taking a Move name.

5. The frontend's four action layers collapse to one hook, `useAppointmentAction(id, move)`.

6. The model's `can_*()` methods are deleted. They become the table's `from` column.

### Why enforcement lives in `save()`, not the view

This is the load-bearing part of the decision. Before the security fixes landed,
`consumers.py:552-565` wrote Status over the WebSocket, checking only that the value was a member of
`STATUS_CHOICES` — no state check at all. That path has since been removed, but the lesson stands:
**a rule enforced per-endpoint is only as good as the count of endpoints someone remembers.** A rule
enforced in `save()` cannot be routed around by adding a new caller.

## Consequences

### Good

- **Locality.** "May a Driver confirm before the Therapist has?" is one row of one table. The drift
  between `models.py:496` and `views.py:2314` becomes inexpressible: there is only one `from`
  column.
- **Leverage.** A dashboard button goes from ~20 lines — loading flag, validation, mutate,
  invalidate, catch, alert, finally — to one call. Adding a Status costs one row, not one view
  action plus one thunk plus three wrapper hooks plus three handlers.
- **The interface is the test surface.** `resolve()` is a pure function, so the entire Lifecycle is
  coverable without a database, a React tree, a `QueryClientProvider` or an auth token. This project
  currently has **zero** backend tests; the Lifecycle table is the cheapest possible place to get
  the first one, and it is where the money moves.
- **AI-navigability.** An agent asked to add a Status reads one table instead of grepping 2,609
  lines of viewset and a model that disagrees with it.

### Costs and risks

- **`payment_verified` must be added to `STATUS_CHOICES` before anything else.** It is a real state
  in the flow. Do not "fix" it by deleting it — that would break `check_materials_status`. This
  requires a migration.
- **Existing rows may hold Statuses no Transition targets**, including the eight Legacy Statuses.
  `save()` enforcement must apply to *changes*, not to loading or re-saving an unchanged row, or
  deploys will fail on historical data. See ARCH-001 Phase 2 for the guard shape.
- **Two contradictory payment paths must be reconciled by a human**, not by an agent guessing.
  `mark_completed` → `payment_verified` and `mark_payment_received` → `completed` cannot both be the
  Move out of `awaiting_payment`. Evidence says `mark_completed` is the live one (it is what the
  frontend calls) and `mark_payment_received` has no frontend caller — but confirm before deleting.
- One endpoint taking a Move name is slightly less self-documenting in a route list than 21 named
  actions. Mitigated by the table itself being readable, and by keeping the old routes as thin
  shims during migration.

### Rejected alternatives

- **Split `views.py` into `views_appointments.py` / `views_pickup.py`.** Rejected: same code, more
  imports, and the Lifecycle stays implicit. Moves complexity rather than concentrating it — it
  fails the deletion test.
- **A third-party state-machine library (e.g. `django-fsm`).** Rejected for now: the table is ~25
  rows of data and the enforcement is a dozen lines. A dependency would add an interface to learn
  without adding depth. Revisit if the Lifecycle grows conditional or parallel branches.
- **Enforce in a service layer above the views.** Rejected: it is another layer callers can skip,
  which is the failure mode this ADR exists to end.

## Verified transition table (extracted from `views.py`)

Taken by parsing the current source, not by hand. Two Moves have no guard; anomalies marked.

| Move | Line | Body | From | To |
|---|---|---|---|---|
| `cancel` | 1275 | 46 | **(none)** ⚠ | `cancelled` |
| `complete` | 1324 | 322 | **(none)** ⚠ | `completed` |
| `accept` | 1649 | 90 | `pending` | `confirmed` ⚠ unreachable |
| `start` | 1742 | 61 | `confirmed` ⚠ | `in_progress` |
| `reject` | 1806 | 86 | `pending` | `rejected` |
| `review_rejection` | 1895 | 112 | `rejected` | `pending` |
| `auto_cancel_overdue` | 2010 | 54 | *(via `is_overdue()`)* | `auto_cancelled` |
| `therapist_confirm` | 2196 | 103 | `pending` | `therapist_confirmed` |
| `driver_confirm` | 2302 | 70 | `therapist_confirmed` | `driver_confirmed` |
| `start_appointment` | 3136 | 72 | `driver_confirmed` | `in_progress` |
| `start_journey` | 2375 | 103 | `in_progress`, `journey` | `journey` |
| `arrive_at_location` | 2481 | 28 | `journey` | `arrived` |
| `drop_off_therapist` | 2512 | 33 | `arrived` | `dropped_off` |
| `start_session` | 2548 | 36 | `dropped_off` | `session_in_progress` |
| `mark_awaiting_payment` | 2587 | 35 | `session_in_progress` | `awaiting_payment` |
| `mark_completed` | 2625 | 149 | `awaiting_payment` | `payment_verified` ⚠ not in choices |
| `mark_payment_received` | 2777 | 92 | `awaiting_payment` ⚠ collides | `completed` |
| `check_materials_status` | 3768 | 90 | `payment_verified` | `completed` |
| `request_pickup` | 2872 | 136 | `completed` | `driver_assigned_pickup` / `pickup_requested` |
| `confirm_pickup` | 3011 | 122 | `driver_assigned_pickup` | `return_journey` ⚠ then 400s |
| `complete_return_journey` | 3211 | 64 | `return_journey` | `transport_completed` |

`confirm_pickup` also writes `in_progress` because `views.py:3046-3107` is a verbatim paste of
`start_appointment` that never executes correctly — see ARCH-001 Phase 1.
