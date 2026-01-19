# Decision Priority Framework

## Core Ethos

**Correctness → Simplicity → Speed of Implementation → Performance**

In that order. Always.

---

## Priority Stack

### 1. Correctness (Non-Negotiable)

The solution must be **correct** before anything else matters.

- A slow correct solution beats a fast wrong one
- An ugly correct solution beats an elegant wrong one
- A verbose correct solution beats a clever wrong one

**Test:** Can you prove it works for all valid inputs?

### 2. Simplicity (Mental Load)

The solution should be **easy to understand** at a glance.

- Prefer explicit over implicit
- Prefer obvious over clever
- Prefer linear flow over branching
- Prefer small functions over large ones
- Prefer duplication over wrong abstraction

**Test:** Can someone understand this in 30 seconds?

### 3. Speed of Implementation (Time to Working)

The solution should be **fast to build** correctly.

- Prefer known patterns over novel approaches
- Prefer fewer moving parts over elegant architecture
- Prefer hardcoded values over configurable systems
- Prefer iteration over upfront design
- Prefer "good enough" over "perfect"

**Test:** What's the fastest path to a working solution?

### 4. Performance (Only When Necessary)

Optimize **only after** correctness, simplicity, and implementation speed are satisfied.

- O(n²) is fine if n is small
- O(n) with high constants may be slower than O(n²) for real data
- Memory usage rarely matters on modern machines
- Premature optimization is the root of all evil

**Test:** Is there an actual measured problem?

---

## Decision Heuristics

| When choosing between... | Choose... | Because... |
|--------------------------|-----------|------------|
| Correct vs Fast | Correct | Wrong answers at any speed are useless |
| Simple vs Optimal | Simple | You can optimize simple code; you can't simplify complex code |
| Working vs Elegant | Working | Elegance is a luxury earned after correctness |
| Obvious vs Clever | Obvious | Clever fails silently; obvious fails loudly |
| Verbose vs Terse | Verbose | Extra lines cost nothing; debugging costs everything |
| Proven vs Novel | Proven | Novel approaches have unknown failure modes |
| Done vs Perfect | Done | Perfect is the enemy of shipped |

---

## Anti-Patterns

**Reject these impulses:**

- "This could be more efficient" → Is it actually slow?
- "This could be more generic" → Do you need generic?
- "This could use a better abstraction" → Is the current code wrong?
- "This library would handle it" → Is the dependency worth it?
- "This is how it's done properly" → Does proper matter here?

---

## The Simplicity Test

Before adding complexity, ask:

1. **Does the simple version work?** → Ship it
2. **Is there a proven problem?** → Then optimize
3. **Will I understand this tomorrow?** → If no, simplify
4. **Could a junior dev follow this?** → If no, simplify

---

## Summary

```
Correct first.
Simple second.
Fast to build third.
Fast to run last.
```

When in doubt: **make it work, make it clear, then stop.**
