# Media DIY Backend Specifications

This directory contains all project specifications, organized by category.

## Directory Structure

```
specs/
├── architecture/       # System architecture documentation
├── guides/             # Developer how-to guides
└── README.md           # This file
```

## Quick Links

### Developer Guides (How-To)

Start here when working on the codebase:

| Guide                                           | Description                                         |
| ----------------------------------------------- | --------------------------------------------------- |
| [effect-patterns.md](guides/effect-patterns.md) | Effect-TS patterns: Layers, Schema, errors, testing |
| [http-guide.md](guides/http-guide.md)           | RPC patterns, handlers, request/response schemas    |
| [testing-guide.md](guides/testing-guide.md)     | Unit, integration testing with Effect               |

### Architecture (Reference)

Reference these to understand system design:

| Document                                                    | Description                                           |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| [overview.md](architecture/overview.md)                     | High-level architecture, layers, data flow            |
| [clear-architecture.md](architecture/clear-architecture.md) | Domain, adapters, infrastructure (Clean Architecture) |
| [error-handling.md](architecture/error-handling.md)         | Error handling strategy                               |

## For New Contributors

1. Start with [architecture/overview.md](architecture/overview.md) for system understanding
2. Read [architecture/clear-architecture.md](architecture/clear-architecture.md) for domain and infrastructure patterns
3. Read [guides/effect-patterns.md](guides/effect-patterns.md) before writing backend code
4. Read [guides/http-guide.md](guides/http-guide.md) for API development
5. Read [guides/testing-guide.md](guides/testing-guide.md) before writing tests

## What's In Each Section

### architecture/

**System design documentation.** Reference these to understand:

- How layers are organized ([overview.md](architecture/overview.md))
- Domain, adapters, and infrastructure ([clear-architecture.md](architecture/clear-architecture.md))
- How errors flow through the system ([error-handling.md](architecture/error-handling.md))
- Key architectural decisions

### guides/

**Developer how-to documentation.** Use these as reference while coding:

- How to write Effect code ([effect-patterns.md](guides/effect-patterns.md))
- How to create HTTP handlers ([http-guide.md](guides/http-guide.md))
- How to write tests ([testing-guide.md](guides/testing-guide.md))

## Maintenance

- **Guides** are living documents - update them as patterns evolve
- **Architecture** specs should be updated when the architecture changes
- Add new guides for new topics
- Keep guides focused and practical
