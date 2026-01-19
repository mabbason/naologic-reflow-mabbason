# Production Schedule Reflow

A production scheduler that reschedules work orders when disruptions occur, respecting dependencies, work center conflicts, shift boundaries, and maintenance windows.

## Setup

```bash
pnpm install
```

## Run Tests

```bash
pnpm test
```

## Run Scenarios

```bash
npx tsx src/run-scenario.ts scenarios/delay-cascade.json
npx tsx src/run-scenario.ts scenarios/maintenance-conflict.json
npx tsx src/run-scenario.ts scenarios/complex-scenario.json
```

## Algorithm Approach

The reflow algorithm processes work orders in dependency order (topological sort) and applies constraints sequentially:

1. **Dependency Constraint** - Push start to after all parent orders complete
2. **Conflict Constraint** - Push start to after previous order on same work center
3. **Shift & Maintenance Constraint** - This jumps the time to only valid start times while considering when
  a shift and maintenance constraint come into play and "block out" a chunk of time.

Each constraint can only push forward, never earlier. This greedy forward pass ensures a valid schedule.

### Shift-Aware Duration Calculation

Work pauses outside shift hours and resumes in the next shift. The algorithm iterates through shifts, using available time until the workOrder duration is "worked through"

### Maintenance Windows

Maintenance windows are treated as additional interruptions within shifts. Work splits around them just like it splits around shift boundaries. I originally had planned this as a fourth application of the constraints, but after working through the planning for this [maintenance-window (conversation).md], it seemed to make sense to just integrate into the existing shift constraint calculations. 

## Project Structure

```
src/
├── reflow/
│   ├── reflow.service.ts      # Main algorithm
│   ├── apply-constraints.ts   # Constraint functions
│   └── types.ts               # TypeScript types
├── utils/
│   └── date-utils.ts          # Date/shift helpers
└── run-scenario.ts            # Scenario runner

scenarios/
├── delay-cascade.json         # Dependency chain cascade
├── maintenance-conflict.json  # Work splits around maintenance
└── complex-scenario.json      # Dependencies + workCenter conflicts + weekend spanning
```

## Constraints Handled

- **Dependencies** - All parent orders must complete before child starts
- **Work Center Conflicts** - Only one order at a time per work center
- **Shift Boundaries** - Work only during shift hours
- **Maintenance Windows** - No work during maintenance periods
