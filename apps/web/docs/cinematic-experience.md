# Lattern cinematic prototype

The new route starts at `src/app/page.tsx` → `src/containers/lattern/index.tsx`.
It does not import the previous home/experience implementation.

## Development

- `npm run dev`: local preview.
- `npm test`: timeline reversal, chapter boundaries, responsive resampling and demo discovery tests.
- `npx tsc --noEmit`: type checks.
- `npm run lint`: repository lint.
- `npm run build`: production compilation.

## Editing the experience

- `src/constants/lattern-scenes.ts`: chapter copy and normalized boundaries.
- `src/libs/cinematic/runtime.ts`: deterministic camera, lantern and lighting milestones.
- `src/containers/lattern/hooks/use-cinematic-scroll.ts`: one Lenis/GSAP scroll timeline, semantic panel visibility and navigation focus.
- `src/components/organisms/cinematic-lantern/`: procedural silk, brass, ribs, flame and spotlight.
- `src/components/organisms/lattern-world/`: persistent canvas, instanced network, Soul, paths and infrastructure.
- `src/components/organisms/lattern-preview/`: mock discovery and explicit local authorization simulation.
- `src/styles/lattern.css`: editorial layout, light mask, responsive and static-reading presentation.

Scroll progress owns narrative state. Idle flame and dust may animate independently, but must not accumulate camera or journey transforms. React state changes at chapter boundaries, not every frame.

## Fallbacks and integration boundaries

Reduced-motion preference, manual reading mode, renderer failure or a 12-second initialization timeout show the DOM story. Mobile uses fewer nodes and particles, smaller lantern geometry on screen and a simplified layout. Modal dialogs pause Lenis and restore focus on close.

All agent profiles, scores, histories and confirmations are fictional. The demo has no wallet connection, transaction signing, RPC submission or live verification. GitHub and contract links remain “Not published yet” until official URLs are supplied. Launch Lattern opens the local product preview.

Before release, test the full journey on physical mobile devices, measure frame rate and accessibility contrast, and replace mock product wiring only once actual APIs and authorization requirements are available. No measured FPS guarantee is implied by the current DPR and instancing optimizations.
