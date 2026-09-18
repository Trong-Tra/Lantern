> **Illuminate the agent economy.**  
> _Trust shouldn't be a leap in the dark. Discover agent identity, reputation, and history. Find a trusted path with Lantern._

---

## Overview

Lantern is a monorepo platform designed to provide transparent reputation, identity discovery, and routing for autonomous agents. Built with modern web and API standards, the repository leverages **pnpm workspaces** for modular code sharing between frontend applications and backend services.

---

## Monorepo Architecture

```text
my-project/
├── apps/
│   ├── web/               # Next.js 16 (Turbopack) frontend application
│   └── api/               # Express 5 + TypeScript backend service
├── packages/
│   ├── config/            # Shared configuration, constants & tsconfig presets
│   ├── types/             # Shared TypeScript domain & API response types
│   └── utils/             # Shared isomorphic utility functions
├── package.json           # Root workspace orchestrator
├── pnpm-workspace.yaml    # Workspace definition
└── tsconfig.json / base   # Root TypeScript configuration
```

### Apps

- **[`@lantern/web`](./apps/web)**:
  - **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack) & [React 19](https://react.dev/)
  - **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
  - **3D & Motion**: [Three.js](https://threejs.org/) & [React Three Fiber](https://r3f.docs.pmnd.rs/), [GSAP](https://gsap.com/), [Lenis](https://lenis.darkroom.engineering/) smooth scroll
  - **Port**: `3000`

- **[`@lantern/api`](./apps/api)**:
  - **Runtime**: Node.js with [Express 5](https://expressjs.com/)
  - **Development**: Fast live reload via [`tsx watch`](https://github.com/privatenumber/tsx)
  - **Language**: TypeScript (`NodeNext` module resolution)
  - **Port**: `4000`

### Packages

- **[`@lantern/config`](./packages/config)**:
  - Centralized runtime constants (`DEFAULT_API_PORT`, `API_ENDPOINTS`, `APP_CONFIG`)
  - Dynamic API URL resolution (`getApiBaseUrl()`) supporting client and server environments
  - Shared [`tsconfig.base.json`](./packages/config/tsconfig.base.json) compiler options
- **[`@lantern/types`](./packages/types)**:
  - Shared domain interfaces and standard API envelope types (`ApiResponse<T>`, `ApiErrorResponse`, `PaginationParams`, `PaginatedResponse<T>`)
- **[`@lantern/utils`](./packages/utils)**:
  - Common utility functions: `formatAddress`, `formatScore`, `sleep`, `createApiResponse`, `createApiErrorResponse`, `buildApiUrl`

---

## Prerequisites

- **Node.js**: `>= 20.0.0` (Recommended: Node.js 22 LTS)
- **Package Manager**: [pnpm](https://pnpm.io/) `>= 9.0.0` (configured with `pnpm@12.4.2`)

---

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd my-project
pnpm install
```

### 2. Environment Variables

Create the local environment files from their examples:

#### Frontend (`apps/web/.env`)

```bash
# apps/web/.env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

#### Backend (`apps/api/.env`)

```bash
# apps/api/.env
PORT=4000
```

### 3. Running Locally

You can launch the web application and backend API independently:

```bash
# Start the Next.js frontend (http://localhost:3000)
pnpm run dev:web

# Start the Express API with live reload (http://localhost:4000)
pnpm run dev:api
```

---

## Available Scripts

Run these commands from the root directory:

| Command                           | Description                                                               |
| :-------------------------------- | :------------------------------------------------------------------------ |
| `pnpm run dev:web`                | Starts the Next.js development server at `http://localhost:3000`          |
| `pnpm run dev:api`                | Starts the Express API server with `tsx watch` at `http://localhost:4000` |
| `pnpm run build:web`              | Builds the Next.js frontend for production                                |
| `pnpm run build:api`              | Compiles the Express API TypeScript source into `dist/`                   |
| `pnpm run build:packages`         | Compiles all workspace packages (`config`, `types`, `utils`)              |
| `pnpm run typecheck`              | Runs `tsc --noEmit` across all workspace projects in parallel             |
| `pnpm --filter @lantern/web test` | Runs the web test suite (`node --test`)                                   |
| `pnpm --filter @lantern/web lint` | Runs ESLint on the frontend codebase                                      |

---

## API Endpoints

| Method | Endpoint     | Description           |
| :----- | :----------- | :-------------------- |
| `GET`  | `/`          | Health check endpoint |
| `GET`  | `/api/hello` | Sample hello endpoint |

Example response envelope:

```json
{
  "success": true,
  "data": {
    "status": "ok"
  },
  "message": "API is running"
}
```

---

## License

Private repository. All rights reserved.
