---
description: "Use when: addressing PR review comments, Copilot comments, inline review threads, or reviewer feedback on a pull request."
---

# PR Review Comment Practice

When addressing PR review comments, keep the conversation attached to the review
thread that raised the issue.

## Default workflow

1. Read the actual diff and the unresolved review thread before changing code.
2. Make the smallest change that addresses the specific comment.
3. Validate the change locally as needed, but do not turn the validation checklist
   into PR-description or PR-comment ceremony.
4. Reply inline on the original review thread when a reply is needed.
5. Resolve the review thread once the comment has been addressed and you are able
   to resolve it.

## Inline replies

Respond to Copilot and reviewer comments inline, on the original review thread.
This keeps the fix, the reasoning, and the reviewer context together.

Do not post a separate top-level PR comment just to say an inline comment was
addressed. A top-level follow-up is only appropriate when there is something
holistic for reviewers to know, such as:

- a cross-cutting explanation that applies to multiple threads;
- a meaningful change in direction from the original PR description;
- a caveat, failed validation, or remaining reviewer decision that is not local
  to one thread.

## Resolving threads

After addressing a review thread:

- resolve it if the platform allows you to;
- do not leave addressed Copilot threads open as a progress log;
- do not resolve threads that still need reviewer input or where the fix is only
  partial.

If an inline reply endpoint or resolve action is unavailable, mention that in the
summary rather than compensating with a routine top-level PR comment.
