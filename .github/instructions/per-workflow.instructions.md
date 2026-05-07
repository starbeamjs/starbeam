---
description: "Use when: planning or reviewing Starbeam work described as PER, Prepare/Execute/Review, or a hypothesis-driven implementation cycle."
---

# Starbeam PER Workflow

PER means **Prepare / Execute / Review**.

Use PER for non-trivial Starbeam changes where the risk is not just typing code,
but choosing the right boundary, preserving behavior, and validating
release-surface consequences.

Use PER especially when work touches public package surfaces, adapter APIs,
reactive semantics, or cross-framework vocabulary. PER is also appropriate when
an implementation should test a hypothesis from a decision record before the
project commits to a broader API direction.

## Phases

1. **Prepare**
   - Gather evidence from the current codebase.
   - State the hypothesis and the intended behavior.
   - List falsifiable predictions.
   - Identify high-consequence unknowns before editing.
   - Produce a bounded execute plan and validation plan.

2. **Execute**
   - Make the smallest changes that test the Prepare hypothesis.
   - Keep unrelated files out of the branch.
   - Record any divergence from the prediction.
   - Run the validation plan.

3. **Review**
   - Compare the outcome to Prepare's predictions.
   - Call out mismatches and whether they matter.
   - Decide whether the result is safe to push, needs a targeted execute loop, or needs a new Prepare phase.

## Coordination guidance

When a user says "do the next PER" or asks to proceed with a PER-sized change:

1. Start by loading this instruction file.
2. If the task is ambiguous or consequential, run Prepare before editing.
3. Keep Execute bounded to the smallest change that tests the hypothesis.
4. Review the result against the Prepare predictions before opening or merging a
   PR.

Avoid treating PER as ceremony. For small local fixes, execute directly. For API
or package-surface work, preserve the separation between prediction, change, and
review.

## Starbeam package-surface use

For package-surface work, PER should explicitly check:

- public manifest dependencies
- default/development JavaScript artifacts
- production JavaScript artifacts
- generated declarations
- declaration maps and source maps when private package names could leak
- `pnpm test:workspace:pack`
- relevant bootstrap or behavior tests, not only package metadata

Production stripping alone is not enough. Published default/development artifacts and declarations are part of the release surface.

## PR and docs language

When using the acronym in docs or PR descriptions, spell it out on first use:

> Prepare / Execute / Review (PER)

After first use, `PER` is fine.
