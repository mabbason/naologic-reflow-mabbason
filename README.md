# Production Schedule Reflow

Hey guys! Miles Abbason here...

This here is a manufacturing production scheduler that reschedules work orders when disruptions occur for things like dependencies, work center conflicts, shift boundaries, and maintenance windows.

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

## NOT Handled
- **Performance Metrics** - Especially given some of the algorithms, I think it makes sense that seeing some larger test data, like you guys mentioned in the video, makes a whole lot of sense here. This probably would have been my favorite thing to add because it would have been much faster feedback regarding the algorithm decisions
and optimizations.
- **Optimizations** - I was also really hoping to get to some of the optimizations here. The priority queue was already commented, but I'm guessing once some performance metrics had gone in, it would have been easier to consider additional places for improvement. 
- **Edge Cases & Error Handling** - Given some of my prior experience with similar scheduling work, I know that additional time spent in this area would really pay off. I suspect that it would really raise a harsh light on some potential things that my current implementation might be missing.

## AI Tooling Use

I used Claude Code intermittently throughout the challenge for:
- **Algorithm Design** - Initial planning and approach validation (see `prompts/` folder for raw transcripts)
  - provided a decision priorities document to guide the AI's advice toward practical trade-offs over theoretical perfection.
  - for all of the initial prompts I used AI to help draft a more focused initial prompt
- **Implementation Feedback** - Shift calculation logic and maintenance window integration
- **Test Data** - Generating sample scenarios and the scenario runner script
- **Documentation** - First draft of this README

