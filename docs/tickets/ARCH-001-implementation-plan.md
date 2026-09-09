# ARCH-001 — Give the Appointment Lifecycle a home

**Type:** Architecture / multi-phase
**Decisions:** [ADR-0001](../adr/0001-appointment-lifecycle-transition-table.md),
[ADR-0002](../adr/0002-single-source-of-truth-for-server-state.md)
**Vocabulary:** [CONTEXT.md](../../CONTEXT.md) — use *Move*, *Transition*, *Status*, *Lifecycle*
exactly as defined there.

---

## For the agent picking this up

Read ADR-0001 first. It contains the verified transition table; do not re-derive it, but **do
re-check line numbers before editing** — this file cites positions in a tree that is actively
changing.

**Rules for this ticket:**

1. **One phase per pull request.** Phases are ordered by dependency. Do not start Phase N+1 before
   N is merged.
2. **Every phase ends with a runnable check.** If a phase has no test, it is not done.
3. **Do not guess at the two open questions in Phase 3.** They are business decisions. Stop and ask.
4. **Do not "fix" `payment_verified` by deleting it.** It is a real state. See Phase 2.
5. If you find the evidence in an ADR no longer matches the code, say so and stop — do not quietly
   adapt. The ADR is the record of a decision; a mismatch means someone changed something without
   updating it.

**Test commands** (run from repo root):

```bash
python -m unittest discover -s guitara -p "test_*.py"
```

```bash
cd royal-care-frontend && npm test
```

There is currently **no backend test infrastructure** — no `tests.py`, no pytest, no conftest. The
only backend check is `test_security_boundaries.py` at repo root, which asserts against source text
rather than behaviour. Phase 0 fixes that.

---

## Current state (verified 2026-09-09)

**Already done — do not redo.** The three security defects from the architecture review are fixed
and are in the working tree (uncommitted at time of writing):

- `DEFAULT_PERMISSION_CLASSES = IsAuthenticated` added to `settings.py` and
  `settings_railway_minimal.py`
- `core/permissions.py` adds `IsOperator`; the six registration views now require it
- The unguarded WebSocket Status-write path was removed from `consumers.py` (−328 lines)
- Only Operators now join the global `"appointments"` channel group (`consumers.py:36-39`), closing
  the client-PII broadcast
- `test_security_boundaries.py` passes

**Still outstanding:** everything in this ticket.

**Known loose end from that work:** `core/permissions.py:8` — `IsTherapistOrDriver.has_permission`
reads `request.user.role` without checking `is_authenticated`, so it raises `AttributeError` on
`AnonymousUser`. It is currently referenced by nothing, so it is latent. Fix it in Phase 0 or delete
it.

---

## Phase 0 — Make it possible to test anything

**Why first:** every later phase is verified by tests that cannot currently be written.

### Tasks

1. Add `guitara/scheduling/tests/__init__.py` and a `pytest.ini` (or `setup.cfg`) at repo root
   pinning `DJANGO_SETTINGS_MODULE=guitara.settings` and `python_files = test_*.py`.
2. Add `pytest` and `pytest-django` to `requirements.txt`.
3. Write one trivial passing model test to prove the harness boots against the DB.
4. Move `test_security_boundaries.py` under `guitara/` so one command runs everything.
5. Fix or delete `core/permissions.py:8` (see loose end above).
6. **Do not** let pytest collect the five root-level `test_*.py` scripts — they are one-shot scripts
   that call `django.setup()` at import and write to the live database. Exclude them explicitly, or
   move them to `scripts/`.

### Acceptance criteria

- [ ] `python -m pytest` runs green from a clean checkout
- [ ] The run does **not** touch the production database
- [ ] `IsTherapistOrDriver` either checks `is_authenticated` or no longer exists

---

## Phase 1 — Fix the defects that are already costing users

**Why now:** these are small, independent, and each is a live user-visible failure. Fixing them
before the refactor means the refactor has a working baseline to preserve. Each needs a regression
test, which Phase 0 has just made possible.

### 1a. `confirm_pickup` returns HTTP 400 on every success

`views.py:3011-3136`. It sets `status = "return_journey"` and saves (`:3034-3036`), then at `:3047`
tests `!= "driver_confirmed"` — always true — and falls to the `else` at `:3065`, returning
*"Cannot start appointment in return_journey status"*. Lines `3046-3107` are a verbatim paste of
`start_appointment` (`:3149-3210`); `3109-3135` are the orphaned tail of a deleted `reject_pickup`,
unreachable after the `return` at `:3102` and referencing an undefined local `reason`.

**Fix:** delete `3046-3135`. Return success after the notification.

**Also:** the frontend still calls `reject_pickup` (`schedulingSlice.js:1644` →
`appointments/:id/reject_pickup/`) and no such route exists. Either restore the action or remove the
thunk — **ask which**; a Driver rejecting a pickup assignment may be a real requirement that was
lost.

### 1b. `complete()` returns 500 instead of 403

`views.py:1385` does `status = material_data.get("status", "used")`, shadowing the DRF `status`
module for the whole function. The permission branch at `:1353` then evaluates
`status.HTTP_403_FORBIDDEN` before assignment → `UnboundLocalError`. Same shadow at `:1526, 1552,
1570, 1593`.

**Fix:** rename the loop variable to `material_status`. One line, four call sites.

### 1c. Operator "auto-cancel overdue" has never worked

`useInstantUpdates.js:261` imports `autoCancelOverdue`; the slice exports
`autoCancelOverdueAppointments`. Wired live via `OperatorDashboard.jsx:133` →
`handleAutoCancelOverdue` (`:1041`); the `TypeError` surfaces as the generic alert at `:1063`. Same
class of bug at `useEnhancedRedux.js:553` (`cancelAppointment` is not an export either).

**Fix:** correct both import names. Then check the feature actually works end to end — it has never
run, so the code behind it is unproven.

### 1d. `handleWebSocketUpdate` never runs its own body

`cacheInvalidation.js:552` defines `performCacheUpdate` and the function ends at `:639` without
calling it — 87 unreachable lines believed live by four call sites.

**Fix:** call it, or delete `552-638`. Prefer deleting: real-time updates already work via the six
separate `invalidateAppointmentCaches` calls in `webSocketTanStackService.js`, so the code has been
redundant for as long as it has been broken. Verify that claim before deleting.

### Acceptance criteria

- [ ] A test asserts `confirm_pickup` returns 2xx and leaves Status `return_journey`
- [ ] A test asserts `complete()` returns 403 (not 500) for an unauthorised user
- [ ] Auto-cancel-overdue works from the Operator dashboard, verified by hand
- [ ] No behaviour change to any other Move

---

## Phase 2 — Build the Lifecycle module

The core of ADR-0001. **Additive only — no view is changed in this phase.**

### Tasks

1. **Migration first:** add `payment_verified` to `Appointment.STATUS_CHOICES`. It is written at
   `views.py:2692` and read at `:3786`; it is load-bearing and currently absent from the schema's
   declared choices.

2. Create `guitara/scheduling/lifecycle.py`:

   ```python
   @dataclass(frozen=True)
   class Transition:
       move: str
       from_statuses: frozenset[str]
       roles: frozenset[str]
       to_status: str
       stamps: tuple[str, ...] = ()      # fields set on the row, e.g. "pickup_confirmed_at"
       emits: str | None = None          # notification event name

   TRANSITIONS: dict[str, Transition] = { ... }

   class IllegalTransition(Exception): ...

   def resolve(current_status: str, move: str, role: str) -> Transition: ...
   ```

   `resolve` raises `IllegalTransition` with a message naming the current Status, the Move and the
   role. It imports nothing from Django models, views or channels — it must stay a pure function.

3. Populate `TRANSITIONS` from the table in ADR-0001. Leave the two contradictions **unresolved and
   commented** — Phase 3 settles them.

4. Delete the `can_*()` methods from `models.py:492-536`. They have zero callers and contradict the
   live rules. Delete `Appointment.clean()` (`:417-487`) **only after** confirming its conflict
   validation is genuinely duplicated in `serializers.py:492-521` and `:522-578`; if the serializer
   copies are stubs, port the logic rather than dropping it.

5. Write the test suite for `resolve()`. This is the deliverable that matters: every row, every
   illegal Move, every wrong role. No database, no fixtures.

### Acceptance criteria

- [ ] `lifecycle.py` imports no Django model
- [ ] Every row in the ADR-0001 table has a passing test, plus a rejection test
- [ ] `python -m pytest guitara/scheduling/tests/test_lifecycle.py` runs in under a second
- [ ] `grep -rn "can_therapist_confirm\|can_driver_confirm\|can_start_journey" guitara/` returns
      nothing
- [ ] No view has changed yet

---

## Phase 3 — Enforce it, and settle the contradictions

### Open questions — STOP AND ASK

These are business decisions. Do not pick one.

> **Q1.** `mark_completed` (→ `payment_verified`) and `mark_payment_received` (→ `completed`) both
> claim `awaiting_payment`, both Operator-only. Evidence says `mark_completed` is live and
> `mark_payment_received` has no frontend caller — but that is an inference from grep, not a
> statement of intent. Which is the real Move out of `awaiting_payment`? Is the other dead, or an
> unfinished feature?

> **Q2.** `accept` / `start` / `cancel` produce the `confirmed` vocabulary; the frontend uses
> `therapist_confirm` / `driver_confirm` and never calls them. `start` guards on `confirmed`, which
> nothing living writes. Are these dead, or a second flow (e.g. Operator-side booking) that was
> never wired up?

### Tasks (once answered)

1. Enforce in `Appointment.save()`:
   - Only on a Status **change**. Loading and re-saving an unchanged row must not raise, or deploys
     will fail on historical rows holding Legacy Statuses.
   - Provide a documented escape hatch for data migrations and the `auto_cancel_overdue` sweep
     (e.g. `save(enforce_lifecycle=False)`), used deliberately and never from a view.
2. Give `cancel` and `complete` real `from` sets — they currently have none.
3. Rewrite the 21 view actions as lookups against `resolve()`. Keep the existing routes as thin
   shims so the frontend keeps working.
4. Add `POST /api/scheduling/appointments/:id/transition/` taking `{"move": "..."}`.

### Acceptance criteria

- [ ] A test asserts a Status change disallowed by the table raises, whatever the code path
- [ ] A test asserts an unchanged row saves cleanly with a Legacy Status
- [ ] Every old route still behaves as before (characterisation tests written *before* the rewrite)
- [ ] `AppointmentViewSet` is materially shorter than 2,609 lines

---

## Phase 4 — Collapse the frontend action layers

Depends on Phase 3's `/transition/` endpoint.

### Tasks

1. Add `useAppointmentAction(appointmentId, move)` — one hook: optimistic update, invalidation,
   error surfacing, in one place.
2. Replace the four layers: the 12 thunks in `schedulingSlice.js:1571-1940`, the wrappers in
   `useEnhancedRedux.js` and `useInstantUpdates.js`, and the private axios client at
   `TherapistDashboard.jsx:58-151`.
3. Reduce the three dashboards' 51 handlers, 29 `invalidateQueries` sites and 56 `alert()` calls
   accordingly. Replace `alert()` with the app's existing notification surface.

### Acceptance criteria

- [ ] One optimistic-update definition per Move, not three
- [ ] `grep -c "invalidateQueries" src/components/*Dashboard.jsx` is materially lower
- [ ] No component defines its own axios client or `getBaseURL`

---

## Phase 5 — Finish the store migration

ADR-0002. Independent of Phases 2–4; can run in parallel by a second agent.

### Tasks

1. Port the six Redux-reading components to existing query hooks. **`SalesReportsPage` last** — it
   is 1,845 lines and it computes revenue and commission. Capture its current figures for a known
   date range before and after.
2. Delete `setReduxDispatchBridge`, `triggerReduxRefetch`, and `cacheInvalidation.js:230` — **only
   after the last consumer is ported.**
3. Delete the server-state half of `schedulingSlice.js`. Keep `authSlice`. Decide `attendanceSlice`
   on the same test: is the server the authority? Then it moves.
4. Collapse the five appointment-fetch paths onto the query keys in `lib/queryClient.js`.
5. Route all requests through `src/services/api.js`; remove the other 8 `getBaseURL` definitions.
6. Delete `OperatorDashboard.jsx:116-126`'s discarded `useOperatorDashboardData()` call — it fires
   five queries and uses one field. Removing it is −4 requests per mount with no UI change; do this
   one **first**, as a standalone commit, since it is free.

### Acceptance criteria

- [ ] `grep -rn "state.scheduling" src/` returns only `authSlice`-adjacent hits or nothing
- [ ] `grep -rln "^import axios" src/ | wc -l` is 1
- [ ] SalesReports figures match the pre-migration capture exactly
- [ ] `setReduxDispatchBridge` no longer exists

---

## Phase 6 — Delete what nothing reaches

**Can be done at any time and makes every other phase cheaper.** Split by category, one commit each,
with the import-graph evidence in the message.

| Category | Approx lines |
|---|---|
| 18 unreferenced hooks | ~3,000 |
| 31 unreferenced components | ~5,300 |
| 3 of 4 `AppointmentForm*` variants (only `AppointmentFormTanStackComplete` is imported) | ~3,000 |
| `optimized_data_manager.py` + `optimized_views.py` + the 3 never-resolving imports at `views.py:1305, 1621, 2456` | ~1,055 |
| 9 of 10 startup scripts (only `railway_simple_start.py` runs) | ~1,400 |
| Unreachable view actions, pending Q1/Q2 | ~300 |

**Method:** for each file, grep the tree for its basename excluding itself. **Watch for
`React.lazy(() => import(...))`** — a naive `from ".../Name"` regex reports lazily-loaded pages as
dead. Verify with a build before deleting.

Re-verify the backend items in this table independently; several came from an exploration pass that
was not fully re-checked. See §5 of the handoff document referenced below.

### Acceptance criteria

- [ ] `npm run build` succeeds
- [ ] Full test suite green
- [ ] No route or lazy import references a deleted file

---

## Phase 7 — One deployment configuration

Independent. Pull forward if production security headers are about to change.

`Dockerfile:43` sets `ENV DJANGO_SETTINGS_MODULE=guitara.settings_docker`; `railway_simple_start.py:16`
then calls `os.environ.setdefault(..., "guitara.settings_production")`, which **cannot** override an
already-set variable. So production runs `settings_docker.py` (119 lines) and
`settings_production.py` (400 lines — HSTS, security headers, Railway `ALLOWED_HOSTS` derivation) is
never loaded. `Procfile` and `nixpacks.toml` describe two further start commands that never run, and
both include a `migrate` step the live entrypoint lacks.

### Tasks

1. Confirm the above against the current tree before changing anything.
2. One entrypoint, one settings module per environment. Fold `settings_docker`'s real differences
   (local Postgres/Redis hosts) into a thin local override on one production base.
3. Assert the expected `DJANGO_SETTINGS_MODULE` at boot; fail fast if it is not what the deployment
   intends.
4. Delete the 9 unused start scripts and the unreferenced settings modules; drop `Procfile` and
   `nixpacks.toml`.
5. Reconcile the health-check path — `railway.json:8` uses `/health/`, `Dockerfile:142` uses
   `/api/health/`.
6. Decide whether the entrypoint should run migrations. It currently does not, so schema changes
   deploy silently unapplied.

### Acceptance criteria

- [ ] A boot assertion fails loudly on the wrong settings module
- [ ] Production loads the settings module whose name says so
- [ ] One start command exists in the repo

---

## Sequencing

```
Phase 0 ──▶ Phase 1 ──▶ Phase 2 ──▶ Phase 3 ──▶ Phase 4
                                        │
Phase 5 ────────────────────────────────┘  (parallel; independent of 2–4)
Phase 6 ── any time, makes everything cheaper
Phase 7 ── any time, independent
```

Phase 3 is gated on human answers to Q1 and Q2.

## Related material

- Architecture review (evidence, diagrams, before/after) — HTML report in the OS temp directory,
  `architecture-review-20260908-142400.html`. Temp artifact; may have been cleaned up.
- Session handoff, including a list of findings that were **reported but not independently
  verified** — `HANDOFF-guitara-architecture-review.md`, same directory. Re-check anything sourced
  from there before acting on it.
