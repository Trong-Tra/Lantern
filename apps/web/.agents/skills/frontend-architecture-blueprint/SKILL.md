---
name: frontend-architecture-blueprint
description: Comprehensive production architecture blueprint for Next.js (App Router), React 19, TypeScript, and Tailwind CSS. Enforces Atomic Design layering (atoms, molecules, organisms, layouts, containers), multi-file component layouts, uni-directional dependency flow, Radix UI primitives, atomic Zustand selectors, and Senior Frontend standards. Use when bootstrapping, organizing, or refactoring React/Next.js projects.
license: MIT
metadata:
  author: portfolio-tblong0210
  version: "1.0.0"
---

# Production Next.js Architecture & Engineering Blueprint

This skill provides a complete, battle-tested architectural blueprint for modern Next.js (App Router), React 19, TypeScript, and Tailwind CSS applications. It serves as a portable standard to apply across production frontend projects.

---

## 1. Directory Structure Map

```text
<project-root>/
├── .agents/                 # AI assistant rules & skill blueprints
│   ├── AGENTS.md            # Coding standards & workspace rules
│   ├── PROJECT_STRUCTURE.md # Layering and dependency map
│   └── skills/              # On-demand workflow & architecture skills
├── public/                  # Static assets (fonts, icons, media)
├── src/
│   ├── actions/             # Next.js Server Actions (mutations, server-only data logic)
│   ├── app/                 # Next.js App Router (pages, layouts, route handlers, error/loading states)
│   ├── components/          # Reusable, design-system-aligned UI component library
│   │   ├── animations/      # Animated UI wrappers & dynamic typography (FoldText, AuroraText)
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

---

## 2. Uni-Directional Dependency Flow

Enforce a strict one-way dependency hierarchy. Higher layers may import lower layers, but lower layers must **never** import higher layers.

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

### Dependency Rules:

1. **No Circular Loops**: Never import containers or organisms back into atoms, molecules, or libs.
2. **Layer Barrels & Sibling Imports**:
   - Use central barrel exports (`index.ts`) when importing across distinct layers (e.g., `import { Button } from "@/components/atoms"`).
   - Within the same layer, import siblings directly to prevent circular evaluation (e.g., inside `components/molecules/`, use `import { SearchInput } from "@/components/molecules/search-input"`).
3. **Clean Path Aliases**: Always use `@/` path aliases instead of relative paths with nested `../../`.

---

## 3. Component Architecture & Folder Organization

### A. Single-File vs. Multi-File Components

- **Single-File Component**: For simple, self-contained components (< 150 lines), maintain a single file directly in its layer:
  - Example: `src/components/atoms/button.tsx`
- **Multi-File Component / Container**: When a component or page container requires supporting subcomponents, local configurations, or custom hooks, encapsulate it in a dedicated folder:

```text
src/components/.../<component-name>/  (or src/containers/<page>/<section-name>/)
├── index.tsx                 # Main entry point, primary component & main Props interface
├── components/               # Internal supporting React JSX child components ONLY
│   ├── <subcomponent-1>.tsx  # Internal child component
│   └── <subcomponent-2>.tsx  # Internal child component
├── constants/                # Internal static config, defaults, or mock data (.ts)
│   └── <config-data>.ts
├── types/                    # Internal subcomponent prop interfaces & local types (.ts)
│   └── index.ts
└── hooks/                    # Internal component-scoped hooks (.ts)
    └── use-<feature>.ts
```

### B. Encapsulation & Prop Rules:

- **Root Entry Point**: The folder entry must be `index.tsx`.
- **Primary Props Only**: Export only the main component and its primary interface (`<Component>Props`) from `index.tsx`. Keep helper types and subcomponent props inside `types/index.ts`.
- **Nested Child Props Pattern**: Instead of flat, bloated prop lists (`headerTitle`, `headerSubtitle`, `headerIcon`), group subcomponent properties into nested configuration objects:
  ```typescript
  export interface FeatureCardProps {
    readonly title: string;
    readonly header?: Readonly<FeatureCardHeaderProps>;
    readonly action?: Readonly<FeatureCardActionProps>;
  }
  ```
- **Static Defaults Merging**: Define static default maps in `constants/` and merge incoming props with defaults (`const resolvedHeader = { ...DEFAULT_HEADER, ...props.header }`) to eliminate repetitive ternary fallbacks and render-time allocations.

### C. Standard Component File Anatomy:

Structure every component file in deterministic section order:

1. Client directive (`"use client"` if needed)
2. Grouped imports:
   - React / Next.js core
   - Third-party packages
   - `@/` path alias modules
   - Local sibling imports
3. Props interface (prefixed with `Readonly<Props>`)
4. Static constants & configuration maps
5. Pure module-scoped helper functions
6. Main component definition & export

---

## 4. Senior Frontend Engineering Standards

### 1. Code Quality & Readability

- **Eliminate Nested Ternaries**: Never write `a ? b : c ? d : e`. Extract nested conditions into early returns, explicit `if / else if` blocks, or pure helper lookup functions.
- **Read-Only Props**: Always enforce prop immutability using `Readonly<Props>` or `readonly` field modifiers.
- **Explicit React Hook Imports**: Always write `import { useState, useEffect, useRef } from "react"` rather than `React.useState`.

### 2. Styling (Tailwind CSS v4)

- **Standard Utilities First**: Prioritize standard design tokens (`rounded-2xl`, `p-6`, `gap-4`) over arbitrary bracket syntax (`rounded-[18px]`, `p-[23px]`). Only use arbitrary values for truly dynamic runtime properties (e.g., calculated inline styles).
- **Tailwind Utility Classes over Custom CSS**: Use Tailwind utility classes and `@utility` rules in `globals.css` rather than separate `.css` files per component.

### 3. UI Primitives & Accessibility

- **Prioritize Radix UI Primitives**: Use `@radix-ui` primitives (`@radix-ui/react-dialog`, `@radix-ui/react-popover`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tooltip`, `@radix-ui/react-slot`) for complex interactive components to ensure accessible keyboard navigation, focus trapping, and ARIA attributes out of the box.
- **Accessible Interactive Elements**: Ensure all custom buttons and interactive triggers have `aria-label`, visible focus rings (`focus-visible:ring-2`), and keyboard support (`Enter` / `Space`).

### 4. Media & Assets

- **Next.js `<Image>` Everywhere**: Use `import Image from "next/image"` for all images to guarantee automatic WebP/AVIF compression, blur placeholders, zero Cumulative Layout Shift (CLS), and responsive image generation.
- **Dedicated Icons Directory**: Extract SVG icons into dedicated components inside `src/components/icons/` with a central `index.ts` barrel export.

### 5. State Management & Performance

- **Atomic Zustand Selectors**: Always select state atomically (`useStore((state) => state.activeId)`) rather than destructuring full state objects (`const { activeId, items } = useStore()`), preventing wasteful re-renders.
- **Derive State in Render**: Calculate values during render rather than synchronizing state via `useEffect` chains.
- **Move Logic to Event Handlers**: Execute state changes directly inside event callbacks (`onClick`, `onChange`) rather than triggering cascading `useEffect` reactions.
- **Lifecycle Cleanup**: Always clean up GSAP timelines (`tl.kill()`), Framer Motion listeners, timers (`clearTimeout`), and event listeners in `useEffect` return functions.

### 6. SEO & Semantic HTML Hierarchy

- **Single `<h1>` Tag**: Ensure each route/page contains exactly one semantic `<h1>` tag containing unbroken entity keywords.
- **Semantic Tags**: Use `<header>`, `<main>`, `<section>`, `<article>`, `<footer>`, and `<nav>` to structure pages.
- **Core Web Vitals**: Avoid blocking Largest Contentful Paint (LCP) with long entrance animation delays on above-the-fold hero elements.

---

## 5. Rapid Project Bootstrap Script

To apply this folder structure to a fresh Next.js project, run the following shell command from the project root:

```bash
mkdir -p src/{actions,components/{animations,atoms,icons,molecules,organisms,providers},constants,containers,hooks,layouts,libs,store,styles,types}

# Create central layer barrels
touch src/components/atoms/index.ts \
      src/components/molecules/index.ts \
      src/components/organisms/index.ts \
      src/components/icons/index.ts \
      src/components/animations/index.ts \
      src/components/providers/index.ts \
      src/components/index.ts
```
