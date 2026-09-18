# Project Layering and Dependency Map

This document defines the architectural hierarchy and uni-directional dependency flow for this project.

## 1. Directory Structure

```text
<project-root>/
├── .agents/                 # AI assistant rules & skill blueprints
│   ├── AGENTS.md            # Coding standards & workspace rules
│   ├── PROJECT_STRUCTURE.md # Layering and dependency map
│   └── skills/              # On-demand workflow & architecture skills
│       └── frontend-architecture-blueprint/
│           └── SKILL.md
├── public/                  # Static assets (fonts, icons, media)
├── src/
│   ├── actions/             # Next.js Server Actions (mutations, server-only data logic)
│   ├── app/                 # Next.js App Router (pages, layouts, route handlers, error/loading states)
│   ├── components/          # Reusable, design-system-aligned UI component library
│   │   ├── animations/      # Animated UI wrappers & dynamic typography
│   │   ├── atoms/           # Low-level UI primitives (Button, Input, Badge, Skeleton)
│   │   ├── icons/           # Custom SVG icons with a central barrel export
│   │   ├── molecules/       # Composed functional UI units (SearchDialog, ThemeToggle, Card)
│   │   ├── organisms/       # Self-contained global sections (DefaultHeader, DefaultFooter, Navbar)
│   │   ├── providers/       # Client context providers (ThemeProvider, QueryClientProvider)
│   │   └── index.ts         # Central layer export index
│   ├── constants/           # Shared static configurations, domain data, and navigation maps
│   ├── containers/          # Page-specific view containers & sections (e.g., containers/home/hero-section)
│   ├── hooks/               # Application-wide reusable custom hooks
│   ├── layouts/             # Shared page templates and layout wrappers
│   ├── libs/                # Pure, decoupled domain utility functions (utils.ts, math.ts, format.ts)
│   ├── store/               # Global state stores (Zustand with atomic selectors)
│   ├── styles/              # Global styling & Tailwind configuration (globals.css)
│   └── types/               # Shared domain TypeScript types and ambient declarations
├── tsconfig.json
├── package.json
└── next.config.ts
```

## 2. Uni-Directional Dependency Flow

Enforce a strict one-way dependency hierarchy. Higher layers may import lower layers, but lower layers must **never** import higher layers:

```text
[libs / types]
       ↓
[hooks / actions]
       ↓
[components/icons → atoms → molecules → animations → organisms → providers]
       ↓
[containers / layouts]
       ↓
[src/app (Pages / Routes)]
```

### Rules:

1. **No Circular Loops**: Never import containers or organisms back into atoms, molecules, or libs.
2. **Layer Barrels & Sibling Imports**:
   - Use central barrel exports (`index.ts`) when importing across distinct layers (e.g., `import { Button } from "@/components/atoms"`).
   - Within the same layer, import siblings directly to prevent circular evaluation.
3. **Clean Path Aliases**: Always use `@/` path aliases pointing to `src/*`.
