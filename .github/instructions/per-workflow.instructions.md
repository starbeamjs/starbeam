---
description: "Use when: planning or reviewing Starbeam work described as PER, Prepare/Execute/Review, or a hypothesis-driven implementation cycle."
---

# Starbeam PER Workflow

PER means **Prepare / Execute / Review**.

Use PER for non-trivial Starbeam changes where the risk is not just typing code, but choosing the right boundary, preserving behavior, and validating release-surface consequences.

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
