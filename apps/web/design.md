# LATTERN — Landed landing-page design

Updated 2026-10-30 in the local Lantern working copy. Code is authoritative. This supersedes the previous landing specification; `docs/cinematic-experience.md` describes the older implementation.

## Direction

A western lantern guides isolated intelligences toward identity, trust, and a shared network. Dark, mythic atmosphere: aged metal, ivory typography, amber light, and spatial depth. The lantern stays the principal object. No raster scenic background.

## Active implementation

- `src/app/page.tsx` renders `MythLanding` from `src/containers/lattern/myth.tsx`; `myth.css` owns the layout.
- `src/components/organisms/lantern-journey/index.tsx` owns Three.js lighting, model, rings, signals, and bloom.
- `src/libs/cinematic/chapter-transition.ts` defines the reversible scroll score and stable signal destinations.
- `public/models/lantern.glb` is the detailed CC0 Khronos sample asset. Source and attribution: `public/models/LANTERN-CREDITS.md`.

## Continuous journey

A sticky viewport holds twelve content chapters across 1500 viewport heights (1540 on mobile), carried by the five world configurations below. Each beat has a reading hold followed by a continuous handoff. The same lantern, three rings, and 48 signals survive every scene; their positions interpolate with scroll. Reverse scrolling reverses the handoff. No timed blackout or independent chapter animation.

1. **The first light:** lantern inside moving instrument rings; a short invitation introduces the product.
2. **A signal found:** rings loosen and signals disperse; unknown signals become discoverable identities.
3. **A soul revealed:** lantern travels left and signals gather around it; identity, history, and reputation appear one at a time.
4. **A path opens:** rings become depth gates, signals become a corridor; CNY → USDC → MON → SGD advances with scroll, alongside bounded authorization and the rejected fourth swap.
5. **A network forms:** corridor opens into a constellation above the invitation; nearby connections preserve the reading area. The invitation leads into interactive discovery.

Text travels vertically through the held viewport with each handoff, instead of crossfading paragraphs. Passport details show one readable panel at a time. Technical content lives in expandable field notes, followed by retained research references.

## Content

Retain identity/passport, soulbound history, Lumen reputation, intent discovery, testnet corridor, team/research, wallet and explorer links. Discovery agents are explicitly fictional. Lumen currently comes from the API; portable permissions and on-chain scoring are direction, not shipped claims. Historical market figures remain in the trust-challenge disclosure with a verification caveat.

## Responsive and accessible behavior

Desktop alternates left/right copy to follow the lantern. Mobile places the lantern above bottom-aligned copy, supplies a navigation menu, and retains direct demo access. Scene navigation, skip link, wallet, network and docs remain available.

Inactive scenes are inert and hidden from assistive technology. Hidden passport details leave the accessibility tree. Reading mode, reduced motion, WebGL error/context loss, or a 12-second loading timeout expose a conventional document. A no-JavaScript stylesheet exposes narrative text. Animation pauses when the document is hidden. DPR caps at 1.5; scene resources are disposed on teardown.

## Verification

Pure tests cover bounded weights, continuous object destinations, reversible scrubbing, overshoot/deep-link clamps, and distinct finite configurations. Browser checks cover desktop/mobile composition, route-to-network handoff, mobile discovery, reading mode, and horizontal overflow. Visual judgment remains necessary for pacing and composition.

## Idle choreography (2026-10-30)

All five scenes remain alive while scroll is stationary: luminous bodies spiral around the opening lantern, search through dispersed signals, orbit the identity seal, stream along the corridor, and travel between constellation nodes. Every ring retains slow rotation; dust drifts, the flame light flickers, and a restrained camera breath adds depth. Idle motion blends using the same scene weights as scroll, respects reduced motion, and pauses with document visibility.

## Softer handoffs

Transitions span the last 75% of each scene with quintic easing (zero endpoint velocity and acceleration). Scroll damping uses a slower response; copy travels at most 180px with eased opacity, while the scene objects carry the spatial handoff. Directional reading scrims blend continuously with identity-scene weight rather than switching with the active chapter.

## Original chapter information restored

The narrative now retains all twelve original chapters, verified against the deployed landing in reading mode: trust desert, introduction, cross-border problem, soul/passport, discovery sample profile, reputation/history, policy/route checks, six-step execution, five-layer Monad stack, product preview, builders/research, and finale. `LATTERN_SCENES` supplies copy; twelve content weights run alongside the five continuously morphing world configurations. The longer scroll reserves reading time for every chapter. Sample profile numbers and history remain explicitly illustrative; the API-side v1 scoring clarification remains visible.

## Content-led handoffs

Whole-panel fades are replaced by cached content layers: eyebrow, individual headline lines, explanation, then evidence rows. Outgoing layers withdraw toward the lantern; incoming layers emerge with depth, gentle blur and a stagger. Profile fields, history entries, route checks, execution steps and infrastructure rows use directional reveal masks. The lantern follows a shallow forward arc during the handoff. Reading mode restores every layer fully visible. All twelve original chapter contents remain intact.

## Lantern-led agent procession

Sixteen 3D agent markers now form a connected following chain. The first steers toward the lantern; each following agent steers toward its predecessor with frame-rate-independent damping. Signal pulses travel outward along the connecting lines. Corridor spacing opens in depth and network spacing fans outward. This replaces the unrelated drifting sparks. The per-transition vertical/depth arc and content-density lifts are removed; mobile lantern height and scale stay stable.

## Distinct chapter objects

Each of the twelve chapters now has a dedicated procedural 3D assembly behind the lantern: broken monoliths, sunburst, fractured bridge, open passport, scanning frames, linked history seals, four route gates, six execution steps, five foundation plates, command cubes, two research tablets, and constellation jewels. Chapter weights control visibility, material opacity and depth; hidden assemblies are excluded from rendering. Continuous idle rotation and the connected agent procession remain. Generic rings are limited to introduction/finale; graph links are limited to history/finale so they no longer obscure the distinct objects.

## Independent agent actions

The repeated procession is replaced by twelve chapter actions. Opening signals awaken at irregular scattered positions, approach the lantern independently, shrink into it and remain dark before resetting; no opening links or train formation. Later actions are sunburst pulses, bridge-side drift, passport orbits, raster scanning, history pulses, two-lane gate travel, six-step settlement, counter-rotating foundation levels, intention orbit, paired research markers, and constellation twinkles. Connection lines and traveling packets are restricted to history, route, execution and finale.

## Continuous material transformation (supersedes separate chapter assemblies)

`chapter-structure.ts` defines twelve layouts for the same 64 numbered brass pieces. One instanced mesh persists throughout the story: the opening filament opens into rays, becomes bridge spans, folds into passport edges and lines, unfolds into scan frames, links into history, extends into gates, steps, foundation plates, cubes, tablets and the final constellation. Endpoints and thickness interpolate directly using the content chapter weights. Materials stay opaque during chapter handoffs; there is no per-chapter group replacement, shrink-away or fade-in. Only the final departure into the product demo dims the structure. Generic extra ring assemblies were removed.

## Star appearance

Agent lights use procedural diffraction shaders instead of solid octahedra and orbital rings. Four variants combine pinpoints, soft glow, short cross rays and occasional diagonal rays. Sizes, ray orientation, warmth and twinkle frequency vary by star. Light quads face the camera in 3D; no bitmap assets. Opening awakening/absorption timing remains independent and connection-free.

## Candle-lit lantern idle

Lantern glass emissive pixels are opened with a material shader patch so a modeled wax candle and wick are visible inside. A lathed 3D flame bends and stretches with a warm/blue-base flame shader. A slow double-beat envelope plus small irregular flicker drives both flame brightness and the internal point light. The lantern sways gently in rotation; no vertical scroll arc or bob is added. Reduced motion freezes the flame and sway.

## Dark celestial revision

Celestial direction: literal props replaced by eclipse/orbit/spiral/star-chart formations; the persistent brass pieces remain. Low ambient light and traveling illumination waves let forms recede into darkness between revelations. Candle lantern remains the central warm source.

## Brighter beacon and lantern choreography

Raised celestial baseline visibility while retaining moving illumination crests. Restored moderate ambient/rim lighting and strengthened the candle point light. Twelve lantern shots now blend continuously with chapter weights: each has its own framing, depth, scale, yaw and lean. Intro, corridor and finale strengthen the candle output. Rotational idle motion continues; mobile height stays fixed and no handoff bounce is added.

## Content-first visual mapping (current)

Generic celestial overrides were removed. The persistent 64-piece structure now directly depicts each chapter: broken trust filament, introductory beacon rays, disconnected cross-border bridge, folded passport with identity seal, discovery scanner, linked history records, four policy gates with the fourth barred, six execution steps, five Monad infrastructure layers, three candidate intentions merging into one route, two research tablets, and the closing constellation. Illumination advances by record/gate/step/layer for the corresponding chapter. Dark celestial materials, candle light, star agents and continuous piece-to-piece morphing remain.

## Sculpted mythic scenery and active lantern

`mythic-relics.tsx` adds a persistent 32-piece rounded marble assembly: ruins/altar, split bridge, passport monument, discovery arch, archive steles, policy colonnade, execution steps, layered foundation, oracle bowl, research scroll forms and wing-like finale. Pieces transform with the same content weights; brass morphs serve as gilded detail rather than the only volume. Scenery anchors to chapter blocking independently of the lantern. The lantern now sweeps laterally and in depth, turning toward its movement with chapter-specific amplitudes; mobile motion is restrained and height remains steady.

## Clean sculptural revision (current)

Removed the legacy brass `ChapterArtifacts` render layer entirely. The marble assembly is now the sole chapter object, alongside lantern and agent lights. Straight shared faces and overlapping seams replace beveled disconnected tiles. Policy architecture simplifies to one portal with continuous shafts, capitals and lintel; foundation tiers and passport surfaces join into continuous planes. Per-piece wobble is removed in favor of restrained whole-object motion. Candle light and independent lantern movement remain.

## Organic mythic art direction (current)

The block/stone assembly was removed entirely. `mythic-relics.tsx` now builds a smooth, closed leaf mesh for instanced bronze laurel and a continuously deforming surface of revolution for the central relic. Identity/discovery use a seal/lens and laurel; history narrows into an hourglass; policy/execution leaves form a directional passage; infrastructure becomes an organic pedestal; intention opens an oracle bowl; research pairs vertical leaf scroll forms; finale opens larger wing-like laurels. Copper/verdigris materials, traveling leaf highlights and subtle flutter unify the scenes. There are no walls, shelves or tiled-box surfaces.

## Lantern universe passage (current direction)

Returned to the line-based world, replacing organic/stone props. Each handoff moves the camera into the lantern flame until it fills the view. A procedural star-universe crossing covers the midpoint; the next chapter world is staged beyond it and grows into view as the camera advances. Chapter geometry switches only inside the covered crossing; content leaves before entry and arrives after exit. `line-world.tsx` supplies chapter line objects; `portal-crossing.tsx` renders the camera-facing procedural passage. Scroll reversal retraces the journey; reading/reduced-motion mode skips the portal. All twelve chapter texts remain.

## Eleven distinct handoffs

The universe-through-flame passage is reserved for identity → discovery. Other handoffs now have separate camera routes and procedural motifs: radial ignition, lateral light bridge, passport seam opening, scanning eye, flowing memory threads, corridor rails, six settlement waves, five foundation planes, three converging intent paths, and constellation release. `HANDOFFS`/`transitionFlight` define the bounded camera paths; portal shader mode follows the outgoing content chapter. Every route settles at the normal camera at both ends, remains reversible, and preserves reduced-motion reading behavior.


## Continuous object handoffs (2026-10-30; current)

The chapter midpoint no longer replaces the world behind an opaque transition. The same 128 line segments interpolate their endpoints between chapter forms, while the single lantern, lights and agent positions follow the same chapter weights. The passport opens into the discovery form as the camera approaches its candle and sweeps back out; there is no second lantern or camera-position jump. The screen-space motifs are translucent accents, not a blackout. Other handoffs keep their distinct camera movements. Content and reading mode remain intact.


## Forward passage into the lantern (current)

The identity-to-discovery camera continues forward through the candle into a three-dimensional field of stars; it does not zoom back out. The same lantern travels around the camera and into the deeper scene, while the passport lines transform into the discovery form. Camera and scene remain at the new depth for later chapters; reversing scroll retraces the path. The screen-space portal overlay is disabled for this handoff.


## Longer, varied handoffs (current)

The cinematic journey spans 3000svh on desktop and 3200svh on mobile, providing roughly twice the scroll distance for each chapter and transition. Chapter copy stays present longer and the incoming copy begins returning before the scene settles. Outside the forward candle passage, camera handoffs use chapter-specific lateral sweeps, arcs and rolls without depth push-and-pull; the persistent lines and lantern continue to transform. Reading mode remains a conventional document.


## Restored object choreography (current)

During each non-universe handoff, the persistent line segments twist and sweep through chapter-specific shapes, with selected transitions also separating, rippling in depth, or undulating. The lantern turns and travels alongside this motion. Both settle continuously at the next chapter; the longer scroll and forward candle passage are retained. Reduced motion skips the added choreography.




## First ribbon journey (2026-10-30; current)

The first object fuses into a curved stripe of warm light with a narrow luminous core and a broad, softly blurred amber halo. The stripe has no hard metallic surface or visible edges. The lantern and camera follow its centerline, then it coils into a three-dimensional beacon in the introduction. The first overlay stays disabled; reverse scrolling retraces the transformation.


## Accelerating first stripe passage (current)

Chapter objects retain thin linework at rest and fuse into the previous soft amber stripe during the first handoff. Scrolling sends the lantern rightward along an extended stripe, accelerating rapidly while the camera tracks behind. Horizontal blurred light trails and a dim fade briefly obscure the scene; the next section settles under that fade before visibility returns. No radial tunnel or forward camera plunge. All phases follow scroll and reverse cleanly; reduced motion skips the effect.


## Spark ignition welcome (2026-10-30; current)

Opening stripe arrival (2026-10-31): after flame ignition, pieces fly in from the left and right along the same horizontal centerline, reach the circle at its left/right edge, then follow its circumference to populate the circle by 5.4 seconds. No piece starts at its final circle height or slides radially inward. The separated strands continuously run along that circular path while the first chapter is held, blending into the existing handoff on scroll. The warm reveal, lantern framing and copy timing remain; skipped/reduced-motion entry uses the settled shape.

The opening holds the actual unlit lantern at screen center against darkness, with only welcome text above it. Sampled pixels of that text turn into sparks and fall along curved paths to the candle's projected screen position. The flame catches after the sparks arrive. A feathered warm halo expands from the candle, revealing stationary stars and chapter objects only as its pool of visibility reaches them. Finally the same lantern moves from center into its normal first-chapter framing; first-section copy appears last. The six-second sequence begins after model readiness, with skip, first-session, static-mode and deep-link bypasses. The reveal uses one capped-resolution canvas; no water or radial speed tunnel is used in this opening.

## Section star fields (2026-10-31)
Each chapter has its own seeded scattered background stars, blended with chapter weights. Independent slow pulses brighten soft halos and pinpoint cores, fade completely dark, then relight. Warm/cool tints, sizes and timing vary per star. Reduced motion holds steady brightness. Agent-star halos are also softer and their light can fade fully dark.


## Matching horizontal first handoff (2026-10-31)
On the first scroll handoff, scroll advances the existing pieces around the circle; each leaves only when it reaches its horizontal exit, so some pieces still circle while earlier arrivals follow the two separated straight lines, hold as two separated straight luminous ribbons while soft glow builds along the horizontal travel line, without leaving the scene first; the existing accelerating lantern/camera ride follows their shared center. No collective circle-to-line interpolation is used. Screen-wide expansion and glow begin only after the pieces have completed their circular exits. The same endpoints drive the linework and ribbon surface throughout formation. Ribbon width and glow grow with formation as the original thin lines fade, using the transition shader with a bright core and feathered amber halo. The two ribbons stay separated and straight across the viewport, with no loops or intertwining. Ribbon surfaces use smooth cubic curves sampled at 128 segments per strand. Slower breathing brightness and broader, gentler continuous left-to-right shader currents add a water-like light flow, including while scroll is held. Reduced motion freezes that light animation. They merge into the horizontal arrival approach at the end of the handoff. Section two settles into sixteen star objects distributed around the lantern; the old coil linework recedes. Two layers of curved connections (32 paths) between the surrounding nodes appear after the stars settle, then the stars travel back and forth along the brighter primary paths, pausing softly at endpoints. Section-local timing starts on arrival; reduced motion shows the connected static arrangement. Orbit phase holds during the handoff so reverse scrolling retraces the same route.


Star glow refinement (2026-10-31): diffuse background and agent-star halos reduced by 70% and tightened; bright cores, lens-flare rays and independent dark/relight cycles retained.


Section-two depth correction (2026-10-31): sixteen connected stars are distributed over a full ellipsoidal shell centered on the lantern, including foreground and background nodes. Curved links and back/forth travel retain their 3D coordinates; perspective and lantern occlusion expose depth instead of a flat rear layer.

Section-two network detail (2026-10-31): primary paths and dimmer secondary arcs continuously bend and ripple over the outer shell with traveling illumination, even while scroll is stationary. Each connection has its own smooth time phase and keeps its endpoints attached. Paths avoid the lantern in world space; a soft screen-space attenuation reduces lines to 4% brightness across its silhouette and restores them gradually outside it. Stars sample the same evolving primary curves in both directions so they remain on the moving lines. Reduced motion freezes geometry and illumination.


## Network-to-bridge passage (2026-11-02)
Section two's existing 32 shell curves unwrap in staggered opposite directions into two separated bridge spans for section three. The sixteen stars sample those same curves throughout the handoff and travel along the spans on arrival. Network time holds during the scroll transformation. The lantern leads into the passage with a restrained depth move shared by the camera. This handoff has no screen-space overlay and no separate fading bridge assembly; reduced motion uses the settled geometry.


## Money crosses, trust stays (2026-11-02; supersedes bridge spans)
Section three unwraps the same network curves into eight arcing payment routes crossing left to right above a concentric trust seal at the origin. Eight lights travel across the divide; eight settle on the seal and hold still. The seal never follows the payment progress. This makes “The money moves. The trust doesn't.” visible in the object itself. The object-led transition and disabled overlay remain.


## Chained credential (2026-11-02; replaces origin seal)
Section three's origin seal is replaced by a padlocked credential body, closed shackle and four connected chain links. Payments travel along eight gently breathing arcs above it. While scroll is held, the credential tugs and recoils against its anchored chain; payment lights continue crossing and path illumination travels. The network curves still unwrap into these objects. Reduced motion freezes the idle pose. This depicts money crossing while credentials remain trapped at origin.


## Drachma constellation (2026-11-05; supersedes chained credential)
The existing network paths unfold into a connected constellation. A golden drachma bearing a winged Hermes motif travels along it while the lantern remains in frame as the anchor. Reduced motion holds the coin and constellation still.


## Laurel signet (2026-11-05; supersedes drachma constellation)
Section-two network curves draw inward into the band and bezel of an ancient bronze signet with a laurel seal. The camera moves closer and lower toward the lantern while keeping it visible; the physical ring resolves as the same lines gather. Reduced motion keeps the settled pose.


## Bronze ferry (2026-11-05; supersedes laurel signet)
The close lantern view remains. Existing network curves draw into a bronze Greek skiff and luminous river paths; a small golden offering rides in the hull as it drifts slowly beside the lantern. Reduced motion holds the skiff and river still.


## Contract and golden bird (2026-11-05; supersedes bronze ferry)
The existing network gathers into a floating rolled parchment beside the close lantern. A golden bird departs the contract, turns beyond the viewport, returns and settles, conveying money in motion. Reduced motion freezes a readable scroll and resting bird.


## Pistis constellation (2026-11-05; supersedes contract and bird)
Section-two network curves and stars gather into an original classical draped figure inspired by Pistis, the Greek personification of trust, with an open hand extended toward the close lantern. Fine connecting light and subtle breathing keep the constellation alive; reduced motion freezes it.


## Enlarged trust portrait (2026-11-06)
The Pistis-inspired constellation now has explicit facial contours, hair, draped shoulders and robe, with both hands holding a clasped-hands pledge emblem. This is an original trust symbol, not a claim of canonical ancient iconography. The figure sits behind the lantern; section three parks the close lantern lower-right so the face and pledge remain unobstructed. Existing network lines continue into the portrait contours.


## Celestial armillary (2026-11-06; supersedes trust portrait)
Section three gathers the same 32 network strands into six tilted golden orbital rings around a suspended double-pyramid star. The rings counter-rotate slowly, the entire instrument rocks in depth and floats gently, and sixteen stellar lights travel along the rings. The lantern stays lower-right with the instrument above-left. Scroll formation remains continuous and reversible; reduced motion freezes the assembly. No new assets or dependencies.


## Monad center and axial rotation (2026-11-06)
The armillary rings now continuously tumble about their own axes with alternating directions. A lavender Monad-inspired rounded diamond with a tilted rounded-square opening replaces the central faceted star, using two closed smooth contours based on the supplied reference. Reduced motion holds both rings and center still.

Ring timing refinement (2026-11-06): continuous sinusoidal ease-in/ease-out speed, staggered per ring, smoothly varies axial rotation between 15% and 185% of the average speed without reversing or snapping. Reduced motion remains static.


## Intact network handoff (2026-11-06; supersedes strand gathering)
Section two to three now uses two intact assemblies: the complete network turns gently away and fades as the complete armillary turns into view. All links retain their source or destination geometry; no per-strand morph or breakup is rendered. Stars fade to zero at the exchange and return along the incoming rings. A small lateral camera arc replaces the previous depth dip. Scroll controls visibility and rotation reversibly; reduced motion stays static.

Ring refinement (2026-11-06): faster axial spin with a stronger staggered sinusoidal acceleration/deceleration envelope. A feathered screen-space clearance keeps golden ring lines and their halos away from the central logo. Dense sampled additive Gaussian halos soften all network/armillary linework.


## Open axes and luminous breathing (2026-11-06; supersedes logo clearance mask)
Removed the projected logo mask entirely. Rings use shallow, precessing axes and a restrained shared viewing angle to keep their complete outlines outside the logo naturally. One seven-second breath expands the rings gently, brightens their warm cores and wider soft additive halos, and accelerates their rotation on the inhale before easing back on the exhale. Traveling highlights add shine. Reduced motion holds constant illumination and geometry.

Continuous line glow (2026-11-06): removed sampled point-sprite halos. Three nested additive wide-line layers follow the exact connected segments, feathering outward with lower opacity. Breathing still controls brightness and glow width.


## Buffered chapter scrolling (2026-11-06)
Each chapter owns one full scroll interval with a stable composition. Crossing its boundary starts a 1.35-second adjacent handoff that finishes independently of further scrolling. Reverse scrolling uses the same timed handoff; large jumps traverse chapters in order. Network and armillary clocks continue whenever either assembly is visible, including transitions. Reading/reduced-motion mode retains direct scrolling.

Dot-free section three (2026-11-06): removed the sixteen traveling star sprites from the rings and removed localized traveling line highlights. Complete lines now brighten and breathe uniformly through continuous wide-line glow layers.

Glow removed (2026-11-06): deleted all halo layers. Rings retain only their bright core lines, breathing brightness and eased motion.


## Continuous post-process bloom (2026-11-06)
Section three hides the lantern while retaining its invisible anchor for ring placement. The center logo has steady HDR brightness; rings keep uniform breathing brightness. Existing UnrealBloomPass now becomes stronger and wider only in section three: a blurred mip chain spreads light from the rendered connected lines rather than placing halo sprites or sampled dots. Other chapter bloom settings remain unchanged.

Section-three dots removed (2026-11-06): disabled its background star field and hid ambient dust and signal points while chapter three is present. Rings and logo remain visible.


## Section four: floating constellation (2026-11-06)
Replaced the paired panel object with a minimal child constellation: star joints, thin cool lines, a small diamond head, arms pointing downward at 45 degrees and gently suspended legs. A slow shared float preserves the pose; reduced motion freezes it. The lantern sits centered, smaller and in front of the figure. Section-four background stars, signals and agents are suppressed for an uncluttered silhouette.


## Section-four girl and lantern embrace (2026-11-06)
Expanded the constellation into a recognizable girl: layered bob and drifting hair, three-quarter face with eyes looking toward the light, nose and smile, cape/collar, tunic, bent legs and boots. Both arms curve up around the lantern; its smaller silhouette sits beside her cheek above her cupped hands. Cool fine contours and smaller star joints preserve the constellation treatment.


## Section-four style restored (2026-11-06)
Restored the prior cool constellation girl and original lantern pose after the crescent was rejected. Chapter-four background stars remain enabled.


## Section-four light weave (2026-11-06; current)
Replaced the constellation figure with three interlaced amber spatial curves, echoing the first section’s ribbons, second section’s curved network and third section’s celestial linework. The open center frames a larger lantern; slow shared rotation and breathing expose depth without figurative detail. Reduced motion freezes the sculpture. Existing chapter stars and reversible scroll presence remain.


## Section-four luminous iris (2026-11-06; supersedes light weave)
Sixteen swept amber petals with sparse lavender accents form a rotating three-dimensional iris around an open center. The larger lantern and iris share one anchor. Desktop projects that anchor to the center of the left half at every aspect ratio; mobile retains the above-copy composition. Reduced motion freezes the iris.

## Section-four memory cathedral (current)
Replaces the rotating iris: 96 amber memory fragments fly from depth and assemble into four receding architectural layers around the left-centered lantern. A traveling illumination passes through the settled shelves. No continuous rotation; reduced motion shows the complete still assembly. References: DNEG's Interstellar Tesseract and Bruno Simon's spatial web portfolio.



## Section-four tarot close-up (current)
Replaces the memory cathedral with a two-sided illustrated Soul tarot card. A closer camera retains the left-half lantern anchor. A 0.6-second eased flip reveals the face in front, followed by a 2.8-second reading hold, a 0.55-second hide flip, and a 6.05-second eased orbit in front of and behind the lantern. Reduced motion holds the face still. Art is drawn locally with no remote fonts or images.


## Story tarot deck and lantern revelation (current)
Three original engraved adaptations cycle: IX The Hermit (identity), XI Justice (earned reputation), XXI The World (history across borders). Fine aged-gold celestial linework on grainy midnight stock matches the earlier scenes. Rough, lightly metallic faces catch a warm reveal light. Front placement follows the lantern-to-camera ray to eliminate perspective drift; the readable face turns slowly, then flips rapidly and spins six world units outward and into depth before disappearing. Card changes happen while hidden. Reduced motion holds the Hermit face.


## Section-four memory tree (current; replaces tarot)
A woven amber tree grows from a shared base behind the left-centered lantern over 4.5 seconds. Layered spatial branches open into a canopy; warm points flow upward along the same curves, with sparse lavender fibers echoing section three. The tree stays upright and stationary. Reduced motion holds the complete tree. Removed tarot artwork, timing helper and its test.


## Section-four agent soul (current; replaces memory tree)
A faceless head and tapered shoulder/body silhouette made from 1,600 cool luminous points emerges above the guiding lantern. A warm chest core pulses outward through the body, representing inner life and persistent history. The figure remains upright and does not spin; reduced motion shows a complete, still form. The smaller lantern stays below the soul in the left-half composition.


## Discovery: lantern holograms
Chapter five projects three fine amber/lavender holograms above a smaller lantern: passport booklet, Lumen dial and linked execution trail. A faint striped projection cone connects the objects to the lantern. The assembly reveals over 2.4 seconds and floats gently; reduced motion holds it still and fully formed. The adjacent receipt explicitly identifies illustrative data; no live score is implied.


## Discovery idle sequence (supersedes simultaneous holograms)
One centered object cycles passport → Lumen dial → history every seven seconds: 1.2s formation, hold through 4.8s, 1.3s fade, then a fully clear interval. Gentle hover and angular sway continue while held. A continuous Gaussian projection beam and screen-space bloom replace stripes; no point sprites generate the glow, and chapter-five background stars, ambient motes and secondary agents are hidden. Reduced motion holds a complete still passport.


## Discovery traveling outline (replaces shine)
Removed the projection beam and disabled bloom in chapter five. A broad warm highlight travels along cumulative outline distance on each active glyph, with no point sprites or shine layers. The idle sequence and reduced-motion still state remain.


## Discovery projected light (current)
The right-side passport, score dial and history now read as cyan holograms projected from the lantern. A warm narrow source opens into a translucent cyan fan with soft converging light shafts, fading above the object. Fine scan lines and restrained bloom illuminate each outline. The existing sequential formation/hold/clear timing drives both light and object together; reduced motion holds a still passport and beam.


Discovery placement correction: holograms sit to the right of the lantern at flame height; the projection fan points horizontally right from the same source.


Discovery background correction: replaced the enclosing circular linework with four open angular projection brackets. The circular score glyph remains part of the record sequence.

Section-three glow disabled (2026-11-06): bloom fades to zero as The money moves / The trust doesn't chapter arrives. Preserve the core ring and logo lines and their breathing; no replacement halos or dots. Supersedes the section-three post-process bloom above.


Discovery light refinement: removed the distinct projection shafts and narrow source streak. Only a soft diffuse warm-to-cyan light wash remains between lantern and hologram.


## Discovery golden wings (current)
Restored chapter-five background stars. Centered the lantern and right-side hologram together in the desktop left half using viewport-relative positioning. Gold/warm-white hologram outlines and a diffuse golden projection wash replace cyan. Eight layered folded feather contours form a faceted pair of golden wings behind the lantern, replacing the corner brackets. Existing reduced-motion state and sequential records remain.


## All-chapter stars and engraved trust section (2026-11-06)
All twelve chapter star fields are enabled, including section three. Five staggered, tapered shooting stars cross the distant background; reduced motion hides meteors and holds the stars steady. Section three adds a fine 120-mark celestial calibration scale around its existing rings, and an open border-crossing ledger under the copy contrasts money movement with reputation reset. No glow layers or dependencies added.


## Seven simplified chapters (2026-11-06; current)
Discovery, reputation, policy, execution, Monad, intention and builders retain the original dark celestial theme, Georgia serif headings, italic gold second lines, lantern choreography and star fields. Their content now uses one short explanation and one relevant action; builders retains two paper links and the interactive preview is labeled as sample data. Removed the seven decorative SVG signatures and dense sample receipts, sequences and infrastructure lists. The other five chapters, site navigation and demo are unchanged. An initial navy/sans redesign was rejected and reverted; preserve the existing theme in future changes. Mobile, reading/no-JS and reduced-motion layouts remain supported. No new dependencies.

## Seven chapter comfort refinement (2026-11-06; current)
Only `EditorialChapter` and its `.panel-editorial` styles changed. Preserve the original celestial palette, serif/italic typography, lantern scenes, navigation, other five chapters and demo. Copy sits over a feathered dark reading well, with looser heading spacing, 16–17px body text and fewer labels. Reputation and Monad use different title scales; authorization uses a compact You/Your agent comparison; execution is three typographic steps; Ask Lattern offers a linked sample request; builders uses two restrained research citations. No added diagrams, scenery changes or dependencies. Reading mode and responsive layouts retain the same content.


## Compact scroll and chapter navigation (2026-11-06)
Story travel reduced from 3000svh (3200 mobile) to 1600svh. A fixed right-side numbered rail highlights the visible chapter, reveals names on hover/focus, and jumps directly to any chapter without queuing intermediate handoffs. Reading mode uses actual panel positions and tighter vertical spacing. The rail hides during the welcome and after the story, and supports keyboard navigation.

## Seven sculptural lantern scenes (2026-11-06; current, supersedes text redesigns)
The user clarified that the redesign concerns the objects around/behind the lantern and lantern placement, not the text. Restored original scene copy, supporting lists, receipts, links and text typography; removed the temporary EditorialChapter component and its styles. Navigation changes from parallel work are preserved.
Chapters 5–11 now share a continuous satin-bronze ribbon sculpture: discovery open sweep, reputation rising helix, authorization low arch, execution directional strokes, Monad parallel waves, intention open crescent, and builders paired curved leaves. Geometry interpolates with existing chapter weights; slow whole-form motion replaces busy symbolic diagrams. Discovery holograms, old chapter linework and foreground agent trails are suppressed only in these seven chapters. Lanterns sit in the opposite desktop half from copy, smaller and steadier; mobile centers the artwork above copy. Highlights and bloom are reduced only for these chapters. Existing stars, dark celestial palette, first four scenes, finale, scroll handoffs, reading/reduced-motion fallback and demo remain.


## Celestial chapter rail (2026-11-06; supersedes pill rail)
The right navigator now echoes the scene’s armillary: warm gold (#d1b384), parchment (#eee6d8), muted silver (#aab5b8) and the existing night background (#080b10), with a serif italic journey heading, fine vertical track, diamond chapter stars and an orbit marking the active chapter. No rounded enclosing card. A compass button explicitly opens/closes names; selection closes the list and Escape closes it with focus returned to the button.
The rail owns a separate viewport strip (64px closed / 232px open on desktop, 44px / up to 190px on mobile). The story, WebGL canvas, scrim and header resize together, so expanded names never overlay scene objects or copy. The open mobile header keeps the brand while section navigation is in use. The active orbit glides between chapters; the compass rotates, names reveal, and the counter animates on selection. Reduced motion disables these transitions. No new dependencies.
Verified desktop expanded composition and mobile DOM boundaries, direct selection and auto-close, Escape and focus return. Focused ESLint, TypeScript and all 74 current web tests passed. The mobile screenshot capture was clipped by the browser viewport override; mobile non-overlap and label bounds were checked against rendered layout geometry. Local-only source copy without Git metadata.


Chapter rail refinement (2026-11-06): transparent navigation and unselected marker backgrounds; removed all rail section numbers and its numeric counter, including numbered accessible labels. Kept chapter names, active orbit, compass animation and reserved content space.

## Bright connected line concepts (2026-11-06; current)
User clarified that the seven concepts must use luminous line geometry like the early scenes, not filled models. Replaced the physical meshes with crystal facets, an attestation seal, an open vault, dominoes, a radial turbine, an oracle bowl and dovetail blocks traced as bright warm-white/gold outlines. Every form uses the original 128 persistent LineWorld segments. The existing chapter weights interpolate the same endpoints directly into the next form, with the existing scroll-driven twist/travel handoffs, in both directions. No separate object groups or independent fades for these seven scenes. Lantern framing now includes scene-specific offsets within each wire form, with smaller mobile offsets. Text, theme, first four/final scenes, stars and parallel navigation work are preserved; original rendering parameters remain outside the seven redesigned chapters. TypeScript, focused ESLint and 74 tests pass, including shared-topology/morph bounds.


Transparent rail correction (2026-11-06): the narrowed main exposed the body background behind the navigation. A full-viewport landing backdrop and scrim now continue underneath the transparent rail; content and canvas still reserve its width to prevent overlap.

The Three.js scene no longer paints an opaque, tone-mapped background over the shared CSS backdrop. Fog remains; the scene and rail now share the same visible night color. Expanded desktop browser review confirms the black strip is gone, transparent computed navigation background and content clearance verified.

## Abstract luminous fields (2026-11-06; current)
User rejected recognizable object outlines. Chapters 5–11 now use abstract light phenomena: clustered local relationships, folded history strata, constrained flow, a branching decision field, parallel currents, resonant interference and an interdependent weave. These are volumetric/internal patterns, with no traced crystal, seal, vault, domino, turbine, bowl or block silhouettes. The existing 128 shared line segments remain bright and morph continuously with the original handoff score; low-amplitude procedural motion keeps the fields alive and freezes with reduced motion. Execution's lantern is placed lower at the branching source. Original text, palette, other scenes and navigation work are preserved. Geometry, animation continuity and bounds are tested.

## Living light material (2026-11-06; current)
Reviewed taiko.xyz in the browser as a reference for material depth, layered atmosphere and coordinated scene motion; no assets, logos, colors or compositions copied. Seven Lattern chapters now use original continuous, translucent light surfaces with fine luminous grains: a pearlescent aperture, folded history fabric, bifurcating caustic currents, a comet-like execution plume, an interference bloom, a resonant light pool and a twisting woven membrane. Shared surface vertices and stable particle identities interpolate through the existing chapter weights, so the same material changes into the next formation. Warm gold/ivory, the lantern, stars, text, first four scenes, finale and navigation remain. The earlier line-only layer is suppressed only inside these seven scenes. Shader texture, soft depth highlights and grain glow replace outlined props and flat dashes. Reduced motion freezes procedural time; surface bounds and morph compatibility are tested. No new dependencies or remote media.

## Causal lantern stories and protected composition (2026-11-06; current)
User clarified that the lantern and artwork must act out the section meaning, rather than merely showing a moving decorative shape. Added 12-second narrative cycles driven by the same scene clocks as the material response. Discovery emits scans; reached beacons become verified and retain their connection. Reputation receives evidence pulses and accumulates lit records. Authorization opens before accepted agents pass and turns a divergent agent back. Execution relays a message through ordered stages. Monad carries simultaneous messages in parallel lanes. Ask Lattern receives an intention, presents three candidates, selects one and sends a reply. Builders grows reciprocal connections from an established pair into a network. Material illumination follows active messages and responds locally to these events; it is no longer the main actor.
All new surfaces, grains, message paths and beacons respect a softly rounded screen-space exclusion derived from the actual visible lantern geometry, with pixel padding and feathering. Action moves above and beside the lantern. Responsive station placement stays outside that exclusion and above the mobile copy; beacons, packets and links share the adjusted station coordinates. Reduced motion uses stable resolved poses. Text, palette, first four scenes, finale, navigation and existing handoffs are preserved.
Validation: TypeScript, focused ESLint and 81 tests pass, including arrival-before-verification, permission-before-passage, rejection, intent-before-selection, reduced motion, projected lantern margins and shared responsive message targets. Recorded a full intention/response cycle and visually confirmed candidate/selected states without shader errors. Local preview only.


## Authored clearance and continuous story (2026-11-06; current)
Supersedes the protected-composition implementation above. Removed the selected chapters' projected lantern mask, fragment cutout and screen-space target pushing entirely. Fields, stations, agents and routes are authored in shared world space to the upper-left of the lower-right lantern, following the section-three composition. Paths stop at an outside emission port, with no geometry crossing the lantern. The same sheet vertices and grains gather into a travelling light stream at each of the six adjacent handoffs, then unfold into the next formation. One uninterrupted narrative clock preserves activity across chapters. Selected handoffs last 2.1 seconds; other transitions, text, theme and navigation are unchanged. Desktop/mobile browser review, TypeScript and 82 tests pass. Local preview only.


## Intact luminous bands (2026-11-06; supersedes travelling-stream collapse)
Enlarged the art domain from .45 to .65 horizontally and .8 vertically, with brighter warm gold surfaces and sparse grain. One persistent set of broad illuminated bands carries identity through credential curls, recorded folds, permission corridors, execution lanes, parallel activity, response branches and woven trust. A travelling deformation front reshapes the leading edge before the trailing material follows; longitudinal extent is conserved. Removed carrier collapse buffers and helpers. Disabled PortalCrossing overlay and camera flame dives/rolls for the six internal selected handoffs. Material never dissolves or resets during these handoffs; physical lantern clearance remains. Text, theme, navigation and other chapters retained. Browser reviewed desktop/mobile and captured an actual handoff.


## Agent procession (2026-11-06; replaces all ribbon artwork)
Removed the shader sheet, dust and ribbon bands from LivingLight. Thirty persistent faceted agent lights, led by six larger ivory/gold identities, carry small attached wakes through identity clusters, accumulated history columns, an open permission corridor, coordinated execution, three parallel lanes, branching responses and a rotating trust community. Instance identity survives each staggered handoff. Motion loops smoothly without teleporting. All agents are physically authored away from the lantern; no masks or flare overlays. Text, theme and other chapters retained. TypeScript/lint and automated clearance/motion checks pass. Browser screenshot capture failed across both existing and fresh tabs, so visual appearance remains unverified in this revision.


## Distinct concepts and lantern exchange (2026-11-06; current)
Reduced the maximum cast from thirty shards to six objects, with just three visible shards in discovery and execution. Each selected chapter has a different physical concept: discovery shards approach the light; reputation uses six embossed attestations; authorization uses two opening gateway arcs and a passing orb; execution uses three couriers; Monad has three independently turning rings; Ask uses a central pearl and three candidates; trust connects six polished nodes. Shared UV topology deforms the persistent objects between concepts rather than hiding swaps with a flare. Active objects brighten alongside the actual candle/flame intensity through a bounded shardResponse; restrained arcs end outside the lantern silhouette. Theme/text/first four/finale retained. Desktop concept captures, mobile gateway and an actual scroll handoff reviewed. TypeScript, focused lint and 85 tests pass.


## Continuous line concepts (2026-11-06; current, replaces solid objects)
Returned the seven selected chapters to the complete, bright spatial line language of the first three sections. No solid medallions, pearls, rings or repeated shards remain. Twelve persistent strands form a focusing lens, an ascending archive of traces, separated permission routes, an execution relay, three parallel currents, response branches and a softly bowed trust weave. Shared strand/segment identities carry a staggered deformation front into each next composition. A traveling light crest and physically authored line-end reach share the actual candle's bounded artResponse. The lantern silhouette stays clear without masks; no flare covers the handoff. Mobile artwork is shifted slightly to keep its full width visible. Text/theme/first four/finale unchanged. Desktop/mobile and actual scroll handoff reviewed; 84 tests pass. TypeScript and focused lint pass.


## Causal line-built scenes (2026-11-06; current, replaces abstract formations)
Replaced the generic lens/wave/weave arrangements with seven readable actions: a head-and-shoulders agent being scanned and verified, a branching history whose records brighten after signal arrival, a permission gate with admitted and returning rejected traffic, four execution checkpoints that acknowledge in order, three parallel infrastructure channels, a query that explores candidates before selecting and returning one answer to the lantern, and a suspension span carrying reciprocal trust. Twenty-four persistent paths keep a continuous scene handoff. Six small moving signals and earned seals share the actual path geometry, so arrivals and consequences agree. The near-lantern endpoint is authored outside its silhouette; no cutout or covering flare. Increased art size; mobile stays inside the viewport. Theme, original text, first four chapters and finale retained. Reviewed desktop/mobile, recorded the query and an actual scroll handoff. 86 tests, TypeScript and focused lint pass. Local only.


## Seven celestial chapter redesigns — 2026-11-06
The first four chapters remain the visual authority. Chapters Discovery through The builders now use larger, spatial orbital compositions: a six-plane identity lens, six earned record armillaries, opening orbital policy leaves, a sequential double helix, three parallel settlement tracks, three candidate worlds with a returned answer, and interlocking trust armillaries. The existing single lantern, causal packets, continuous line morphs, star field and reduced-motion reading fallback remain. Warm gold carries the forms with restrained cool glints, matching the opening armillary's material language.
Chapter headings have more presence; repeated kickers are removed only in these seven chapters. Existing passport/history/route/execution/infrastructure/research information is retained in keyboard-accessible native disclosure rows. Ask Lattern has a direct intent invitation to the existing fictional-agent preview. No new product claims or production behavior are introduced.

### Detailed idle animation pass
Following feedback that the first revision was too simple, the seven forms now have 42 persistent strands, narrow shaded bronze bands, fine inset bands, 180 travelling orbital lights, independent ring rotation and travelling specular highlights. The parallel-settlement scene includes a rotating braided core. Policy leaves breathe subtly even while the authorization gate is held open. Reading/reduced-motion modes retain the static content path; background visibility pauses the existing render loop. Framing was corrected after desktop review to keep art inside its half of the screen and clear of headings.


## Distinct cosmic regions and steady lighting — 2026-11-06
Each of the twelve chapters now has its own persistent universe backdrop: a distant blue dust horizon, amber cloud, inclined halo, vertical violet aurora, blue identity halo, bronze history lane, teal passage, blue execution stream, parallel violet dust bands, a cyan search nursery, paired bronze clouds, and a wide blue network halo. One low-octave nebula field drifts slowly; chapter weights blend the silhouettes and colours continuously. The text side remains darker. Star distributions differ between halos, diagonal streams, parallel bands and clusters.
Removed the seven later chapters' cyclic candle intensity and orbital highlight flashes. Orbit illumination remains steady while geometry rotates, the policy leaves breathe and particles move. Signal brightness now eases rather than switching abruptly, tiny points are soft round sprites, and reverse-moving orbital particles wrap correctly. Reading/reduced-motion behavior is preserved.


## Chapter universes and hyperspace — 2026-11-07
Every chapter is framed as a separate universe, retaining its nebula/star distribution and adding a distant shaded planetary limb. All eleven handoffs now share a reversible hyperspace flight: a subtle off-axis vanishing point, accelerating radial star trails, curved tunnel lanes, a dark throat and a passing exit rim. The travel envelope overlaps the existing copy exit/arrival beats, decelerates into the next universe and never uses a full-white flash. Reduced motion/reading mode bypasses the flight. The top navigation now uses a translucent dark surface, backdrop blur and a faint brass edge, with a darker mobile menu and non-blur fallback.


## Physical hyperspace flight — 2026-11-07
Replaced the screen-space tunnel overlay with 360 depth-tested 3D star trails surrounding the camera. Camera dolly and eased field-of-view expansion establish departure, cruise and braking; the actual chapter world remains visible. Navigation flights last 2.4 seconds. Reduced motion skips travel.


## Planet departure and approach — 2026-11-07
Planet silhouettes now use perspective distance during chapter travel: the outgoing planet shrinks toward the flight vanishing point, while the incoming planet approaches from far away and settles during braking. Planet surface/atmosphere opacity stays constant rather than following the chapter crossfade; reduced-motion mode keeps the settled view.


### Whole-universe halo travel correction
Removed chapter-opacity blending from the circular nebula halos as well as planet surfaces. During travel both departure/destination fields use perspective distance and constant opacity; their halo shapes recede/approach with their planets.


## Real 3D planet correction
The solid circles identified in the screenshot are now actual shaded sphere meshes in ChapterPlanets, replacing the backdrop shader planet entirely. Their opacity remains one. Departure moves the source sphere 320 world units into the distance; the destination approaches along the same depth path. A shared flight clock synchronizes scroll and arbitrary navigation jumps with the star tunnel.


## Varied flights, living planets and heroic backdrop — 2026-11-07
Lantern motion now includes slow compound idle drift and four deterministic flight families: a near-camera lateral pass, leading departure with damped recoil, a banking dive, and a slingshot with braking recoil. Jump star geometry varies between two-sided spatial compression, twisting tunnel, curved shear and split-space expansion; camera impact is damped and bounded. Mobile amplitudes are restrained; reduced motion rests.
Planets have wide upper-scene idle orbits, slow axial spin and three procedural surface families: rocky continental, banded gas giant with inclined rings, and fractured ice. They keep real depth departure/approach. Generated marble-and-bronze armored combat statues sit far behind the scene as a transparent raster tableau with subtle idle drift and the same jump depth movement. Asset: public/images/heroic-combat.png, generated with the built-in image tool; prompt: two fully armored Greco-Roman warrior statues duelling, low angle, cinematic chiaroscuro, marble and bronze, transparent background. This is a still sculptural combat pose, not an animated fight.


## Volumetric fighters and explicit planet routes — 2026-11-07
Supersedes the raster tableau: HeroicBackground now contains two articulated procedural 3D warrior models, with volumetric torso/muscle forms, jointed spear arms, shields, helmets, crests and pleated skirts. Stone/bronze physical materials and local warm/cool lights provide depth. Continuous lunge, thrust and guard motion pauses under reduced motion. These are stylized procedural models, not scanned museum sculptures. The image asset is retained but no longer rendered.
Planets now have six material families (continental rock, ringed gas, fractured ice, lava, ocean with orbiting moons, and luminous storm), each in two palettes. A declared clockwise rounded-rectangle screen-perimeter path replaces arbitrary drift. Live projected bounds of the lantern and line artwork reserve a padded exclusion zone; planets reverse before blocked route segments and select a clear waypoint if foreground motion occupies their current position. Planet bodies spin and moon systems orbit; actual perspective travel remains.


## Restored detailed fight artwork cycle — 2026-11-07
Supersedes the procedural 3D warriors, which the user rejected as low quality. Restored the high-detail marble/bronze illustration and added matching shield-impact and crossed-sword variants. Exactly one tableau appears at a time: 1.8-second arrival, clash waves after 3.1 and 3.58 seconds, fade from 6.2 to 8 seconds, then a quiet gap until the next 11-second cycle. Seeded positions, scale and slight angle vary per appearance within the background visual area. Image proportions are preserved. Two small expanding rings originate at the weapon contact point and dissipate. Reduced motion shows one still tableau. Existing planet routes and foreground objects are unchanged.
Generated with the built-in image tool using the original artwork as a reference. Prompts requested fully armored monumental Greco-Roman marble/bronze duelling statues, cinematic low-angle chiaroscuro, transparent background, in shield-bash and crossed-sword combat poses. Assets: public/images/heroic-combat.png, public/images/heroic-shield-clash.png, public/images/heroic-sword-clash.png. The generated images remain raster artwork, as explicitly requested in this revision.


### Distant, brief combat glimpses
Moved fight tableaux from 44 to 76 units behind the camera and reduced their scale and tint. Peak opacity is now 0.16. Each glimpse lasts three seconds (0.65s arrival, fade from 1.7s to 3s) in a thirteen-second cycle, with ten seconds of empty background. Contact ripples occur earlier and dissipate in 1.05s with lower intensity.


### Shadow-only fight silhouettes
The distant tableaux are tinted near-black (#080a10) to suppress stone/metal detail and read as shadows. Three-second appearances and ten-second gaps remain; ripple strength reduced to 0.06.


### Softer travel and blurred shadow fighters
Reduced jump field-of-view expansion from 24 to 10 degrees, camera dolly from 8 to 3 units, trail speed/length/opacity, tunnel deformation and lantern travel amplitudes. Replaced oscillatory impact/recoil with a single gentle settling envelope and lengthened navigation travel to 3 seconds. Fighters now use a nine-sample soft silhouette shader; peak opacity is 0.5 (less transparent) while near-black tint and brief timing remain.


## Calm transitions, Ask crystals and finale alignment — 2026-11-07
Removed the hyperspace star tunnel and all transition-driven camera field-of-view changes, dolly, roll and shake. Removed the older first-chapter camera rides as well. Chapter content uses smaller, quieter translation and blur; lantern transition displacement is strongly restrained. Planet/scenery departure still uses the shared scene timing.
Ask Lattern now shows three faceted answer crystals with gentle idle turning, maintaining the candidate/selected-return routes and existing content. The final section's action row, headline, aside and detail align to a shared center axis within the chapter rail. The final lantern is smaller, lower and exempt from lateral/depth idle drift to keep that axis stable. Desktop and phone layouts reviewed without horizontal overflow; reduced-motion behavior retained.

## Reference text parity (2026-11-07)

Chapter headings, kickers, body copy, supplemental evidence, research citations and closing resources now match https://lantern-five-virid.vercel.app/ verbatim. Removed added field notes, demo introduction and footer copy. Shared interactive discovery remains below the journey; the current visual world, chapter rail and accessible controls remain. `reference-details.tsx` contains the original supplemental wording.

## Continuous section handoffs — 2026-11-07
Chapter travel now eases across the full interval in both directions, eliminating the previous quarter-chapter jumps at departure/arrival. Section links begin at the current interpolated position rather than teleporting the rendered chapter. Lantern idle phases and flight paths blend with chapter weights, so the dominant-chapter change introduces no pose switch. Existing durations, reduced-motion reading mode and reference copy remain.

### Slower section pacing — 2026-11-07
Normal handoffs last 2.4 seconds, celestial handoffs 3.4 seconds, and longer navigation jumps up to 4.5 seconds. Navigation scenery glide lasts 4.5 seconds. Continuous easing and weighted lantern poses remain.

## Artwork centering and free planetary drift — 2026-11-07
Desktop chapters 5–11 center the combined visible lantern and line-art bounds at the center of their assigned left/right half, vertically centered; chapter weights carry this alignment through transitions. Mobile framing is retained. Planets no longer inspect foreground bounds or avoid the lantern/artwork; deterministic straight drift has constant speed (0.035 view half-heights per second) with reflections only at outer viewport edges. Existing rotation, materials and chapter depth travel remain. Top navigation background is fully transparent with no backdrop filter or border; the expanded mobile menu retains its readable surface.

## Section names and rolling type — 2026-11-07
Removed the top header/navigation. The former Read the story control now displays the active chapter name in a fixed 216 × 44px box; its accessible name retains the reading-mode action. Chapter names enter with delayed vertical blur rolls. Headline, kicker, body and aside letters roll vertically with bounded per-letter delays synchronized to the reversible chapter score; whole words wrap together and accessible full text is retained. Reduced motion keeps all text still. The chapter rail remains available.

### Fixed character slots and spinning letters
The section label now reserves one equal-width slot for every character in the longest chapter name. Shorter names are left aligned within those slots, with trailing slots blank. Every slot rotates old/new letter faces around its horizontal axis with a short stagger and bounded blur, including transitions to blank. Main story letters now rotate in place rather than translate vertically. Reduced motion shows only the settled new faces.

### Navigation removal and right-aligned section names
Removed the remaining chapter rail and its reserved viewport gutter. Fixed-width section-name slots now pad on the left, aligning names at their right edge while keeping blank positions and spinning transitions.

## Native section scrolling with shorter spacing — 2026-11-07
Restored the previous scroll-position-based chapter transitions. Removed wheel/touch interception, gesture thresholds, momentum blocking and cooldowns. Only the journey scroll length changes: `calc(100svh + 6608px)` gives 560px of native scroll per chapter interval at every viewport size, replacing approximately 1073–1144px on the reviewed phone/desktop sizes. Scene transition timing and the existing snap behavior are retained.


## Prepared animation paths — 2026-11-07
The live 3D network and seven orbital scenes now consume path frames prepared by a dedicated Web Worker at 15Hz, buffered roughly 400ms ahead and interpolated at display refresh rate. The worker samples the authored path functions, retaining curve density and existing geometry/lighting; direct procedural rebuilding has left the main animation loop. Adjacent orbital chapters are warmed for forward/reverse handoffs. Jobs and cached rows are bounded, transferable buffers avoid copying, and teardown releases the worker and cache. Worker errors invoke the existing reading fallback. Sparse packets, camera/light movement and projected clearance remain live.
Spinning chapter letters use CSS driven by their own panel progress, avoiding per-letter JavaScript writes and animated blur. Inactive panels do not receive changing letter progress. Current chapter copy, reversible timing, reading mode and reduced-motion behavior remain.
Chapter timing uses real elapsed time, with its existing visibility reset, so rendering stalls no longer extend the authored handoff durations.

Outgoing and incoming nebula illumination now attenuates with squared travel distance, preventing a receding universe from leaving a bright compressed color stripe during the destination scene's arrival. Settled nebula lighting is unchanged.

## Direct scroll response — 2026-11-07
Live chapter poses now sample the native scroll position directly, with no timed chapter queue and no initial quarter-interval hold. Stopping holds the current handoff; reversing retraces it immediately. Idle artwork continues animating. Reading and reduced-motion layouts remain native.


## Reading rhythm — 2026-11-07
Preserve Georgia display type, Geist body type and the celestial palette. Headlines use balanced lines, -0.025em tracking and a consistent 24px gap; desktop prose uses 17px/1.75 and mobile prose 16px/1.65. Supporting thoughts use 15px desktop / 14px mobile. Original kicker content now sits below the prose as quiet chapter context. Body text remains whole during chapter handoffs; only headline letters turn, bounded to 24 degrees with an 80ms-score stagger cap. Scroll timing and 3D scene behavior remain intact. Buttons have 48px minimum height, next-scene targets 44px, visible focus and restrained hover/press feedback; reduced motion removes spatial feedback. Very short phones allow the copy area to scroll. Selection uses gold on ink.

## Section text motion (2026-11-07)
Headlines use a clearer 60-degree letter roll. Descriptions, asides and context follow with a short stagger and gentle vertical travel driven by the same reversible scroll score. Reading mode, no-JavaScript and reduced motion keep supporting copy still and fully visible. No new animation loop or dependency.

## Repeated inner-world approaches — 2026-11-07
The soul-to-universe transition remains the depth reference. Each of the six following inner-world handoffs advances the camera another 6.5 world units, with the scenery following a slower cubic approach. The bounded separation enlarges the artwork during approach and softly settles it into its authored framing. Chapter boundaries meet at equal camera/world depth; native scroll still owns the pose and reverses it directly. Reduced-motion/reading views remain static. No extra animation loop or geometry.


## Smooth scrolling — 2026-11-07
The live landing reuses the existing Lenis hook for a short 650ms wheel easing and section-button travel. Scene poses still follow the actual scroll position, without chapter snapping or a separate scene catch-up queue. Nested evidence and short-screen copy retain independent scrolling; touch retains native scrolling. Smoothing starts after the welcome and is destroyed in reading, reduced-motion or renderer-fallback mode. The final demo button also respects reduced motion.

## Connected shape motion — 2026-11-07
Inner-world artwork now moves into the next form with one shared quintic motion clock. Removed the per-strand and per-point delays that opened closed rings and split shared crystal edges during handoffs. All persistent paths deform together, preserving joined endpoints; travelling lights follow the same moving paths. Scroll reversal retraces the motion.

## Separate chapter spaces — 2026-11-07
Supersedes connected shape morphing: chapters 5–11 render independent, complete artwork assemblies. The outgoing object travels sideways into the distance; the already-formed destination approaches from depth. Geometry, bands, particles and signals stay with their own chapter, with no cross-chapter vertex interpolation. The camera/lantern depth journey and first four sections remain. Reverse scroll retraces spatial placement.


## Softer background fighters — 2026-11-07
Doubled the Greek statue combat artwork blur radius from 12 to 24 source pixels for all three background tableaux.
