# AXIOM v2 Release Summary

## What is shipped

- Core `Kernel` contract now returns a stable envelope for public methods.
- `paranoidMode` disables `learnFromLLM` and any external LLM-backed learning path.
- `AXIOM_ERROR` and `CONTRACT_VERSION` are exposed for programmatic consumers.
- CLI and legacy REST behavior remain user-facing compatible.
- Minimal stdio MCP adapter is available with `tools/list` and `tools/call`.
- Deterministic benchmark fixtures are available for repeatable local performance checks.

## Current verification

- Test suite: `145/145`
- Benchmark runner: `npm run bench`
- Main branch: pushed and synchronized

## Performance snapshot

Quick benchmark output is intentionally deterministic in fixture shape and safe to compare across commits. Use:

```bash
npm run bench -- --quick
```

## Next phase priorities

1. Benchmark interpretation and regression tracking.
2. MCP polish: richer tool metadata, stronger schema docs, and optional output schemas.
3. Release packaging: changelog automation, tagged release notes, and public-facing roadmap.

## Non-goals for v2 Phase 1

- Dashboard
- Full NLP model integration
- New storage backend migration
- Heavy product UI work
- N-API rewrite
