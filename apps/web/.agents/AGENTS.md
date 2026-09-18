# Coding Standards & Workspace Rules

This repository follows the **Senior Frontend Engineering Standards** defined in the frontend architecture blueprint.

## 1. Code Quality & Readability

- **Optional Chaining**: Always prefer optional chaining (`?.`) over logical AND (`&&`) for nested property verification.
- **Eliminate Nested Ternaries**: Never write `a ? b : c ? d : e`. Extract into early returns, explicit `if / else if` blocks, or pure lookup helpers.
- **Read-Only Props**: Enforce prop immutability using `Readonly<Props>` or `readonly` field modifiers.
- **Explicit React Hook Imports**: Write `import { useState, useEffect, useRef } from "react"` rather than `React.useState`.

## 2. Styling (Tailwind CSS v4)

- **Standard Utilities First**: Prioritize standard design tokens (`rounded-2xl`, `p-6`, `gap-4`) over arbitrary values.
- **Tailwind Utility Classes over Custom CSS**: Use Tailwind utility classes and `@utility` rules in `@/styles/globals.css`.

## 3. UI Primitives & Accessibility

- **Accessible Interactive Elements**: Ensure interactive triggers have `aria-label`, visible focus rings (`focus-visible:ring-2`), and keyboard support.
- **Next.js `<Image>` Everywhere**: Use `import Image from "next/image"` for all images to guarantee zero CLS and optimal performance.
- **Dedicated Icons Directory**: Extract SVG icons into dedicated components inside `@/components/icons/` with barrel export.

## 4. State Management & Performance

- **Atomic Zustand Selectors**: Always select state atomically (`useStore((state) => state.activeId)`).
- **Derive State in Render**: Calculate values during render rather than synchronizing state via `useEffect` chains.
- **Move Logic to Event Handlers**: Execute state mutations in event callbacks rather than cascading `useEffect` reactions.
