Directory structure:
└── midday-ai-zuno/
    ├── README.md
    ├── drizzle.config.ts
    ├── index.ts
    ├── package.json
    ├── tsconfig.json
    ├── wrangler.jsonc
    ├── docs/
    │   └── providers/
    │       ├── fortnox.md
    │       ├── qbo.md
    │       ├── sage.md
    │       └── spiris.md
    ├── src/
    │   ├── index.ts
    │   ├── db/
    │   │   └── schema.ts
    │   ├── lib/
    │   │   └── fileHandler.ts
    │   ├── providers/
    │   │   ├── core.ts
    │   │   ├── fortnox.ts
    │   │   ├── manager.ts
    │   │   └── xero.ts
    │   ├── routes/
    │   │   └── api.ts
    │   └── schemas/
    │       └── index.ts
    └── .cursor/
        └── rules/
            └── use-bun-instead-of-node-vite-npm-pnpm.mdc
