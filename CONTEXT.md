# Domain language

The vocabulary this codebase is meant to use. When a name here disagrees with a name in the code,
the code is wrong — open a ticket rather than inventing a third spelling.

## Core

**Appointment** — a booking of one or more Therapists (and optionally a Driver) for a Client at a
place and time. The central entity; `scheduling.models.Appointment`.

**Status** — where an Appointment currently sits in its Lifecycle. One value, drawn from
`Appointment.STATUS_CHOICES`.

**Move** — a named request to change an Appointment's Status: `therapist_confirm`, `start_journey`,
`mark_payment_received`. A Move is the thing a user asks for; it is not itself a Status.

**Transition** — the rule for one Move: which Statuses it is legal *from*, which role may perform
it, which Status it lands on, which fields it sets, and which notification it emits.

**Lifecycle** — the complete set of Transitions. The Lifecycle is the authority on what an
Appointment may do next. See [ADR-0001](docs/adr/0001-appointment-lifecycle-transition-table.md).

**Legacy Status** — a Status retained in `STATUS_CHOICES` for rows written by earlier versions. No
Transition may target one. Currently: `therapist_confirm`, `driver_confirm`, `confirmed`,
`driving_to_location`, `at_location`, `therapist_dropped_off`, `picking_up_therapists`,
`transporting_group`.

## Roles

**Operator** — staff who book, assign, verify payment and resolve exceptions. The only role that
sees Appointments they are not assigned to.

**Therapist** — delivers the service. Sees and acts on their own Appointments only.

**Driver** — transports Therapists to and from the Client. Sees and acts on their own Appointments
only.

## Supporting

**Availability** — a Therapist's or Driver's bookable time slots, consulted when an Appointment is
created or rescheduled.

**Attendance** — staff check-in / check-out. Tracked per person per day, independent of any
Appointment.

**Material** — consumable stock drawn down when a service is delivered; reconciled during the
`complete` Move.

## Architecture terms

Used with the meanings in the `codebase-design` skill, not their colloquial senses:

**Module** — anything with an interface and an implementation, at any scale.
**Interface** — everything a caller must know to use a Module correctly: signature, invariants,
ordering constraints, error modes.
**Depth** — behaviour available per unit of interface a caller must learn.
**Seam** — the place where behaviour can be altered without editing in that place.
**Leverage** — what callers gain from Depth. **Locality** — what maintainers gain from it.
