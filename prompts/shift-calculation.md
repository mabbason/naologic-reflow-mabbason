# Shift Calculation Conversation

## Background Context

- [decision-priorities.md](./decision-priorities.md) - Decision ethos: Correctness → Simplicity → Speed of Implementation → Performance
- [BE-technical-test.md](../_resources/BE-technical-test.md) - Full spec

## The Problem

Calculate end date when work spans shift boundaries:
- Work pauses outside shift hours
- Work resumes in next available shift
- Track working minutes, not elapsed time

**Example from spec:**
> 120-min order starts Mon 4PM, shift ends 5PM (Mon-Fri 8AM-5PM)
> → Works 60 min Mon (4PM-5PM) → Pauses → Resumes Tue 8AM → Completes 9AM

---

## Algorithm Options Explored

### Option A: Minute-by-minute Simulation

Walk forward minute by minute, counting only minutes inside shifts.

```
function calculateEndDateWithShifts(start, duration, shifts):
    current = start
    workedMinutes = 0

    while workedMinutes < duration:
        if isInShift(current, shifts):
            workedMinutes++
        current = current + 1 minute

    return current
```

| Pros | Cons |
|------|------|
| Obviously correct | O(duration) - slow for long orders |
| Trivial to implement | Could walk thousands of minutes |
| Easy to debug | Doesn't scale |

### Option A-optimized: Simulation with Jump

Same as A, but skip non-working time by jumping to next shift start.

```
function calculateEndDateWithShifts(start, duration, shifts):
    current = snapToNextShiftStart(start, shifts)
    workedMinutes = 0

    while workedMinutes < duration:
        if isInShift(current, shifts):
            workedMinutes++
            current = current + 1 minute
        else:
            current = snapToNextShiftStart(current, shifts)

    return current
```

| Pros | Cons |
|------|------|
| Skips non-working time | Still O(working minutes) |
| Simple mental model | 258,000 iterations for 1000 orders |
| Hybrid approach | ~2.6 seconds for 1000 orders |

### Option B: Shift-chunk Iteration (CHOSEN)

Consume duration by working full (or partial) shifts arithmetically.

```
function calculateEndDateWithShifts(start, duration, shifts):
    remaining = duration
    current = snapToShiftIfOutside(start)

    while remaining > 0:
        shift = getActiveShift(current)
        availableInShift = shiftEndTime - current

        if availableInShift >= remaining:
            return current + remaining

        remaining -= availableInShift
        current = getNextShiftStart(shiftEndTime)
```

| Pros | Cons |
|------|------|
| O(shifts crossed) - efficient | More arithmetic logic |
| Handles multi-day naturally | Edge cases in shift boundary math |
| ~1,050 chunks for 1000 orders | Slightly more complex |
| ~50ms for 1000 orders | |

---

## Performance Comparison (1000 Work Orders)

Assumptions: Mix of 1hr (30%), 4hr (50%), 8hr (15%), 16hr (5%) orders

| Metric | Option A-optimized | Option B |
|--------|-------------------|----------|
| Total iterations/chunks | 258,000 | 1,050 |
| Estimated time | ~2.6 seconds | ~50 milliseconds |
| **Ratio** | **~50x slower** | **baseline** |

---

## Step-by-Step Walkthrough: Test Cases

### Case 1: Simple (same shift)
**Input:** Start Mon 8AM, Duration 60 min, Shifts Mon-Fri 8AM-5PM

**Option B:**
```
remaining = 60, current = Mon 8:00 AM

  Chunk 1:
    shift = 8AM-5PM, shiftEnd = Mon 5:00 PM
    availableInShift = 540 min
    540 >= 60? YES → return Mon 8:00 AM + 60 min = Mon 9:00 AM ✓
```

### Case 2: Spans shift (overnight)
**Input:** Start Mon 4PM, Duration 120 min, Shifts Mon-Fri 8AM-5PM

**Option B:**
```
remaining = 120, current = Mon 4:00 PM

  Chunk 1:
    availableInShift = 5PM - 4PM = 60 min
    60 >= 120? NO → remaining = 60, current = Mon 5:00 PM

  current = getNextShiftStart(Mon 5PM) = Tue 8:00 AM

  Chunk 2:
    availableInShift = 540 min
    540 >= 60? YES → return Tue 8:00 AM + 60 min = Tue 9:00 AM ✓
```

### Case 3: Starts early (before shift)
**Input:** Start Mon 6AM, Duration 60 min, Shifts Mon-Fri 8AM-5PM

**Option B:**
```
remaining = 60
current = snapToShift(Mon 6AM) = Mon 8:00 AM

  Chunk 1:
    availableInShift = 540 min
    540 >= 60? YES → return Mon 8:00 AM + 60 min = Mon 9:00 AM ✓
```

### Case 4: Spans weekend
**Input:** Start Fri 4PM, Duration 120 min, Shifts Mon-Fri 8AM-5PM

**Option B:**
```
remaining = 120, current = Fri 4:00 PM

  Chunk 1:
    availableInShift = 60 min
    60 >= 120? NO → remaining = 60, current = Fri 5:00 PM

  current = getNextShiftStart(Fri 5PM) = Mon 8:00 AM  // Skips weekend

  Chunk 2:
    availableInShift = 540 min
    540 >= 60? YES → return Mon 8:00 AM + 60 min = Mon 9:00 AM ✓
```

---

## Decision: Option B (Shift-chunk Iteration)

**Rationale:**
- Similar reasoning complexity to A-optimized
- 50x faster performance (50ms vs 2.6s for 1000 orders)
- Scales well for batch processing
- Correctness verifiable through test cases

---

## Helper Function Design

```typescript
// Query helpers
function getShiftForDay(dayOfWeek: number, shifts: Shift[]): Shift | null
function getNextShiftStart(time: DateTime, shifts: Shift[]): DateTime
function getShiftEndTime(time: DateTime, shift: Shift): DateTime

// Main calculation
function calculateEndDateWithShifts(
  start: DateTime,
  durationMinutes: number,
  shifts: Shift[]
): DateTime
```

---

## Edge Case Decisions

| Case | Behavior |
|------|----------|
| Start outside shift | Snap to next shift start, update both startDate and endDate |
| Zero duration | End = Start (no snap, no change) |
| Spans weekend | Jump to Monday naturally via `getNextShiftStart` |
| Multiple shifts per day | Supported (iterate through shifts for the day) |
| No shifts configured | Throw error |

---

## Verification Table

| Scenario | Start | Duration | Shifts | Expected End |
|----------|-------|----------|--------|--------------|
| Simple | Mon 8AM | 60 min | Mon-Fri 8AM-5PM | Mon 9AM |
| Spans shift | Mon 4PM | 120 min | Mon-Fri 8AM-5PM | Tue 9AM |
| Starts early | Mon 6AM | 60 min | Mon-Fri 8AM-5PM | Mon 9AM |
| Spans weekend | Fri 4PM | 120 min | Mon-Fri 8AM-5PM | Mon 9AM |
