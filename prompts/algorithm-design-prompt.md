# Algorithm Design Conversation

## Background Context

Read these files first:
- [decision-priorities.md](./decision-priorities.md) - Decision ethos
- [BE-technical-test.md](../BE-technical-test.md) - Full spec, data structures, requirements

---

## Context

Building a manufacturing production schedule reflow system. The system reschedules work orders when disruptions occur (delays, machine breakdowns) while respecting:
- Dependencies (all parents must complete before child starts)
- Work center conflicts (one order at a time per machine)
- Shift boundaries (work pauses outside hours, resumes next shift)
- Maintenance windows (blocked time periods)

## Questions to Explore

### 1. Core Algorithm Approach

**Question:** What's the right algorithm for reflow scheduling?

Options to consider:
- **Greedy forward pass** - Process orders in dependency order, push each to valid slot
- **Constraint propagation** - Model as CSP, let solver find valid assignment
- **Priority queue** - Always schedule highest-priority valid order next
- **Iterative refinement** - Start with invalid schedule, fix violations iteratively

Trade-offs:
- Simplicity vs optimality
- Implementation time
- Debuggability
- Extensibility

### 2. Dependency Ordering

**Question:** How should we order work orders for processing?

The spec says dependencies can form chains (A → B → C) and have multiple parents.

What are all of the options here and the pros and cons for each?

Follow-up: How do we detect cycles? What error message?

### 3. Data Structures

**Question:** What data structures minimize complexity while meeting requirements?

Dependencies:
- Adjacency list (Map<string, string[]>)
- Bidirectional maps (parent→children AND child→parents)
- Full graph library (graphlib, etc.)

Work center scheduling:
- Sorted array of scheduled orders
- Interval tree for overlap detection
- Simple linear scan

What are all of the options here and the pros and cons for each?
Library dependencies vs implementation time vs correctness

### 4. Error Handling Strategy

**Question:** How should we handle constraint violations?

Cases:
- Circular dependency detected
- No valid schedule possible (shifts too short, maintenance blocks everything)
- Missing work center reference
- Invalid date formats

Options:
- Fail fast with descriptive error
- Partial scheduling (schedule what we can, report failures)
- Suggestions for resolution

## Givens (From Spec)

Don't re-decide these:
- **Constraint order:** Dependencies → Work Center Conflicts → Shifts → Maintenance
- **Performance:** Not mentioned in spec; correctness matters, speed secondary

## Decision Points to Document

After discussion, document:
1. **Chosen algorithm:** [e.g., "Greedy forward pass with topological ordering"]
2. **Why:** [e.g., "Simple to implement and debug, correct by construction"]
3. **Trade-offs accepted:** [e.g., "Not globally optimal, but meets all constraints"]
4. **Data structures:** [e.g., "Two-Map bidirectional graph, linear scan per work center"]

## Expected Output

Save this conversation to `prompts/algorithm-design.md` in the project, showing:
- Questions asked
- Options considered
- Decisions made with rationale
- Any follow-up questions that arose
