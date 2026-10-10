# Working guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. MCP-First Tool Selection

**Use configured external tools before local connection workarounds.**

- When a task requires data or context from an external system, first search the available and deferred MCP tools/connectors for a matching capability.
- Treat explicit references to ClickHouse tables, row counts, task statuses, or operational metrics as a strong signal to use the ClickHouse MCP.
- Prefer a suitable MCP tool over reading `.env`, asking for credentials, using a local CLI, or making a direct network connection.
- For inspection and reporting, use read-only MCP operations. Do not perform DDL or DML unless the user explicitly requests the mutation.
- If an MCP server's default endpoint fails, discover its configured nodes or resources and try an appropriate alternative before falling back.
- Use local project code to understand schemas and business semantics, while retrieving current external data through MCP.
- Fall back to local or manual access only when no suitable MCP tool exists or the MCP remains unavailable; briefly state the reason.

## 6. Product and Interface Decisions

**Check whether an element is needed before deciding how to display it.**

- Before changing the interface, identify the user's decision or action that the change should support.
- Before adding a block, check where the same information or action already appears.
- The home screen helps the user choose the next action and see today's results.
- Each standalone block must provide a unique action or information that affects the user's decision.
- Put recurring explanations next to the relevant action or in expandable help.
- Before shrinking or collapsing a block, consider removing it if its useful purpose is already served elsewhere.
- Review the whole affected user flow, including existing recommendations, rather than only the component named in the request.
- Propose simplifications when you find redundancy in that flow. Keep unrelated improvements outside the implementation scope.
- Example: if a planned measurement already appears in recommendations when it becomes available, a separate home card repeating that plan needs a distinct purpose to justify its presence.

## 7. Interface Verification

**Passing logic tests does not establish that a screen is useful.**

- For home-screen changes, inspect the mobile layout in the affected states: before training, during a rest interval, after the daily plan is completed, after a measurement, and when a wellbeing or recovery assessment is needed.
- For each affected state, check whether the next action is clear, whether information or actions repeat, and whether any block takes space without helping a decision.
- Use synthetic data when needed to reproduce these states without modifying the user's stored history.
- Report any visual verification that could not be completed; do not imply that logic tests cover it.

## Project Checks

- The app runs directly from `index.html`; no build step is required.
- Run `node --test tests/app.test.cjs` when changing application behavior.
- Documentation-only changes do not require application tests.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
