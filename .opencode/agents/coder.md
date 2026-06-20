---
description: Coding agent with full edit access except linting,tsconfig etc.
mode: primary
permission:
  edit:
    "*": "allow"
    ".oxlintrc.json": "deny"
    "lint/**": "deny"
    "tsconfig.json": "deny"
  external_directory:
    "/tmp/**": "allow"
---
