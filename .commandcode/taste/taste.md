# workflow
- Write plan files in the project repository (e.g., .commandcode/plans/) rather than global ~/.commandcode/plans/. Confidence: 0.70

# testing
- Don't use `process.env` in tests; use Effect Config instead. Confidence: 0.70

# typescript
- Under strictBooleanExpressions, replace `!!process.env.X` with `process.env.X !== undefined` and truthiness checks on non-boolean types (Date, string, object unions) with explicit `!== undefined` comparisons. Confidence: 0.70
- For testing schema/RPC type boundaries, prefer Vitest compile-time type tests (`expectTypeOf`) over runtime `JSON.parse` hacks to produce invalid payloads. Confidence: 0.70

# workflow
- Don't disable lint/diagnostic rules to work around tooling bugs; investigate and fix the root cause instead. Confidence: 0.70
