# ADR-0002 — TanStack Query owns server state; Redux keeps only client state

- **Status:** Accepted
- **Date:** 2026-09-09
- **Related:** [ADR-0001](0001-appointment-lifecycle-transition-table.md),
  [ARCH-001](../tickets/ARCH-001-implementation-plan.md)

## Context

A migration from Redux Toolkit to TanStack Query was started and never finished. Both stores now
hold Appointments, split by page rather than by concern:

| Store | Read by |
|---|---|
| TanStack Query | Operator / Therapist / Driver dashboards, `Calendar.jsx` |
| Redux `state.scheduling` | `SalesReportsPage`, `BookingsPage`, `SchedulingDashboard`, `AvailabilityManager`, `WeekView`, `MainLayout` badge |

They are kept in sync by a module-level mutable singleton and a dynamic import taken specifically to
dodge a circular dependency — the cycle is acknowledged in a comment rather than removed:

```
utils/cacheInvalidation.js:13    let reduxDispatch = null;
utils/cacheInvalidation.js:19    export const setReduxDispatchBridge = (dispatch) => …
App.jsx:215                      setReduxDispatchBridge(dispatch)   // installed at boot
utils/cacheInvalidation.js:41    // Import fetchAppointments dynamically to
                                 // avoid circular dependencies
utils/cacheInvalidation.js:230   await triggerReduxRefetch()        // on EVERY invalidation
```

Consequences visible in the code today:

- **Every mutation pays for a full unpaginated `GET /scheduling/appointments/` into Redux**, for
  pages that are usually not mounted. Nothing dampens it: `lib/queryClient.js` sets `staleTime: 0`
  with `refetchOnMount`, `refetchOnWindowFocus` and `refetchOnReconnect` all true.
- **Five independent code paths issue that same request** — `schedulingSlice.js:93`,
  `useDashboardQueries.js:33`, `useEnhancedDashboardData.js:44`, `useAppointmentQueries.js:34`, and a
  raw `fetch()` inside `OperatorDashboard.jsx:528`.
- **`OperatorDashboard.jsx:116-126`** calls `useOperatorDashboardData()`, fires five queries,
  discards all but `notifications` through `_`-prefixed destructuring, then runs its own six queries
  against the same resource.
- **`getBaseURL()` is redefined in 9 files** and 15 files import raw `axios`, despite
  `src/services/api.js` existing for the purpose. There is no seam a test can intercept — which is
  why there are 3 test files for 209 sources.

## Decision

**TanStack Query is the single owner of server state. Redux keeps `auth` and nothing else.**

1. Port the six Redux-reading components to the query hooks that already exist.
2. Delete `setReduxDispatchBridge`, `triggerReduxRefetch`, and the call at
   `cacheInvalidation.js:230`.
3. Delete the Appointment, Availability, Client, Service, Staff and Notification halves of
   `schedulingSlice.js` (2,919 lines, 42 thunks).
4. Collapse the five fetch paths onto the query keys already defined in `lib/queryClient.js`.
5. Route every request through `src/services/api.js`, so `getBaseURL` and the auth header exist once.

Redux keeps `authSlice` — genuinely client-owned state that no server round-trip should govern.
`attendanceSlice` is decided in ARCH-001 Phase 5 on the same test.

### The rule going forward

> If the server is the authority for a piece of data, it lives in TanStack Query. If the client is,
> it lives in Redux. Nothing lives in both.

## Consequences

### Good

- **Locality.** "Where do Appointments come from?" gets one answer. Today a stale list could
  originate in any of five fetchers or in the bridge failing to fire, and the symptom cannot
  distinguish them.
- **Leverage.** Deleting the bridge removes a full unpaginated Appointment fetch from every mutation
  in the app.
- **The interface is the test surface.** One `api.js` means one place to intercept. Today a test
  must stub raw `axios`, raw `fetch` and `import.meta.env` across nine files.

### Costs and risks

- **`SalesReportsPage` (1,845 lines) is the largest consumer of Redux appointments** and is the
  riskiest port. Do it last, and verify the revenue and commission figures against the current build
  before and after — this is the one screen where a silent data change costs money.
- Redux DevTools time-travel is lost for server state. Accepted: TanStack has its own devtools, and
  they are already installed.
- During migration both stores are live. Keep the bridge until the *last* consumer is ported, then
  delete it in one commit — removing it early means the Redux pages silently go stale.

### Rejected alternatives

- **Go the other way — Redux owns everything, drop TanStack.** Rejected: the three dashboards, which
  are the hot spots by churn (137 commits between them), are already on TanStack, and Redux has no
  answer for cache invalidation, background refetch or request deduplication without re-implementing
  them.
- **Keep both, but make the bridge bidirectional and explicit.** Rejected: two adapters over one
  source of truth is not a seam, it is a synchronisation problem. The right number of stores for one
  fact is one.
