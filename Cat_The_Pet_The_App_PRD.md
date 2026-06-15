# Cat The Pet The App — Product Requirements Document

> **Version:** 1.1 (v1 / MVP scope)
> **Status:** Locked for build — base cat art direction confirmed (32×32 source asset adopted)
> **Audience:** Engineers, pixel artists, and AI coding agents (e.g. Claude Opus 4.8)
> **Platform:** Native iOS (iPhone-first)
> **One-line pitch:** A fidget toy for cat lovers — pet a cozy cat, feel it purr through haptics, earn XP, and unlock cosmetics.

---

## 0. How to Read This Document

This PRD is written to be consumed by three audiences simultaneously:

- **Engineers / AI coding agents** — see sections 3–9 for stack, architecture, data models, and interaction specs.
- **Pixel artists** — see sections 5 and 10 for art direction, sprite layer contracts, and asset deliverables.
- **Product / design** — see sections 1–2 and 11–12 for vision, UX flows, and scope boundaries.

Where a section is primarily relevant to one audience, it is tagged: `[ENG]`, `[ART]`, `[PRODUCT]`.

---

## 1. Product Vision `[PRODUCT]`

### 1.1 What It Is

Cat The Pet The App is a single-screen comfort/fidget app. The user is presented with a cozy cat seated and facing them. Petting the cat (touch + drag gestures) triggers:

1. **Region-specific animations** — the cat reacts differently depending on where it is petted.
2. **Haptic feedback** — the iPhone's haptic engine simulates the rumble of a purr, tuned per region.
3. **Progression** — petting earns Points (spendable currency) and XP (unlocks cosmetics).

A streak system rewards daily app opens, and gentle, light-hearted notifications remind users to come back and pet the cat.

### 1.2 What It Is NOT (v1)

- Not a complex pet-care sim (no feeding, cleaning, health decay).
- Not multiplayer or social.
- Not a cat with multiple body poses (the cat stays **seated, front-facing** — see §5).
- No monetization in v1 (no IAP, no ads). Architecture should not *preclude* it, but it is out of scope.

### 1.3 Emotional Goal

The app should feel **cozy, tactile, and rewarding in micro-doses**. Success is measured by whether a user instinctively opens it for 30 seconds when they need a small comfort break. The cat's *feel* (haptics + responsiveness + charm) is the entire product — everything else is scaffolding.

---

## 2. Target User `[PRODUCT]`

- Cat lovers (including people who can't own a cat).
- People who use fidget toys / comfort apps for stress relief.
- Casual mobile gamers who enjoy light collection/progression loops.

Primary device assumption: iPhone with a Taptic Engine (iPhone 8 and newer all qualify; haptic richness scales with device).

---

## 3. Technical Framework `[ENG]`

### 3.1 Decision: React Native + Expo (TypeScript)

The core interaction is **continuous touch tracking mapped to haptics + sprite animation at 60–120fps**. This requires UI-thread responsiveness. A web-view wrapper (e.g. Capacitor) introduces latency in the pet→haptic feedback loop, which would undermine the entire product. Therefore:

| Concern | Choice | Rationale |
|---|---|---|
| Language | **TypeScript** | Team familiarity; type safety for game/economy state |
| Framework | **React Native via Expo (SDK 51+)** | Cross-platform future, strong TS support, fast iteration |
| Touch + animation | **react-native-reanimated 3** + **react-native-gesture-handler** | Runs gesture + animation on the UI thread, no JS-bridge lag |
| 2D rendering | **@shopify/react-native-skia** | GPU-accelerated canvas, ideal for layered pixel sprites |
| Sprite animation | **Skia frame-stepping + Reanimated shared values** | Slice the 32×32 sheet into frames in Skia; drive frame index via a Reanimated shared value on the UI thread so pet gestures trigger/scrub animation with no JS-bridge lag. No extra dependency. (Rive considered but deferred — see §3.4.) |
| Haptics | **expo-haptics** (+ custom CoreHaptics patterns) | Wraps the Taptic Engine; supports continuous/transient events for purr |
| Notifications | **expo-notifications** | Local scheduled notifications for streak reminders |
| Local storage | **react-native-mmkv** | Fast synchronous key-value store for XP/streak/economy |
| State management | **Zustand** | Lightweight, simple stores for progress + cosmetics |
| Audio | **expo-av** | Layered purr/ambient sound (optional, toggleable) |

### 3.2 Rejected Alternatives `[ENG]`

- **Capacitor / web view** — latency in the touch→haptic loop; wrong tool for the core feel.
- **Unity** — overkill for a single-screen 2D app; ~80–150MB binary; no TypeScript transfer.
- **Pure SwiftUI + SpriteKit** — would give the best native haptics and performance and is the long-term ceiling, but sacrifices the team's TS background and cross-platform optionality. Revisit only if RN haptic fidelity proves insufficient.

### 3.4 Sprite Animation Approach `[ENG]`

The base cat (§5.4) is an Aseprite-authored 32×32 sprite sheet, so the animation runtime must consume **frame-based pixel sprite sheets**:

- **Chosen:** load the sheet as a Skia image, slice into 32×32 frames, and advance a frame index. A small `useSpriteAnimation` hook owns the index; for gesture-reactive animation, store the index in a **Reanimated shared value** so petting can trigger or scrub states on the UI thread. Skia draws, Reanimated drives timing. No additional dependency.
- **Considered & deferred — Rive:** excellent for state-machine-driven character animation reacting to inputs, but expects art authored in Rive's own vector/mesh editor, not Aseprite sprite sheets. Adopting it would mean re-authoring the cat and abandoning the adopted asset's pipeline. Revisit only for v2 if frame-based animation proves limiting.
- **Rejected — Lottie:** built for After Effects vector animation; wrong tool for pixel sprites.

### 3.5 Haptic Fidelity Note `[ENG]`

`expo-haptics` covers standard impact/notification feedback. For a convincing **continuous purr** (a sustained, modulating rumble), evaluate during the build whether a small native module wrapping **CoreHaptics** (`CHHapticEngine`, continuous events with dynamic intensity/sharpness curves) is needed. Design the `HapticEngine` service behind an interface so the implementation can be swapped (expo-haptics → custom CoreHaptics module) without touching callers. **This is the single highest technical risk in the project — prototype it first.**

---

## 4. Visual Style Decision `[ART] [PRODUCT]`

### 4.1 Decision: Chunky Cozy Pixel Art

The cat is rendered as **high-resolution chunky pixel art**, not a 3D fuzzy model. Rationale:

- Real-time 3D fur simulation is high-cost, performance-fragile, and outside the chosen stack.
- Pixel art is genre-proven for cozy cat apps (Neko Atsume, Chicory) and makes cosmetics trivial to layer.
- The "fuzzy/fluffy" quality is achieved via **dithered fur edges** (a 2–3px dithered border on the body silhouette), not literal fur.

### 4.2 Style Targets `[ART]`

- **Reference vibe:** Neko Atsume, *Chicory: A Colorful Tale*, early Pokémon sprites.
- **Resolution:** **32×32 px base sprite** (locked — see §5.4), rendered on-screen at integer scale (e.g. 8x → 256px) with **nearest-neighbor filtering only** (never bilinear/smooth, which blurs pixel art). The original 96×96 target is superseded by the adopted 32×32 source cat, which delivers a chunkier, Neko-Atsume-tier look.
- **Outline:** thick 1px dark outline, slightly rounded corners (already present in the base asset).
- **Palette:** warm and soft — creams, oranges, grays. Limited palette (4–6 colors per element) for a clean pixel look.
- **Mood:** cozy, round, a little sleepy. Not aggressive or hyper-stylized.
- **Fluff:** suggested via dithering on the body's outer edge, not per-strand fur.

### 4.3 Pose Constraint `[ART] [PRODUCT]`

The cat is **seated and facing the user**. No rolling, walking, or pose changes in v1. All expressiveness comes from **micro-reactions** layered onto the fixed pose: ear twitches, eye squints, slow blinks, tail sway, whisker spread, chest breathing. This keeps asset production modular and small while staying true to how cats actually communicate.

---

## 5. The Cat: Layers & Pet Zones `[ART] [ENG]`

### 5.1 Sprite Layer Stack `[ART] [ENG]`

The seated cat is composed of independently animated layers, composited at runtime (bottom to top):

```
Layer 7 — Cosmetic: head/accessory (hat, bow)      ← swaps per equipped item
Layer 6 — Eyes                                      ← blink, squint, annoyed, heart
Layer 5 — Ears (left + right, independently)        ← twitch, perk, flatten
Layer 4 — Head (forehead base)                      ← subtle tilt/headbutt
Layer 3 — Tail                                       ← idle sway, happy puff/wrap
Layer 2 — Body / fur base (incl. front paws)        ← dithered fluff edge, breathe scale
Layer 1 — Cosmetic: collar (optional)               ← swaps per equipped item
Layer 0 — Background / sitting surface (scene)       ← cosmetic scene swap + ambient anim
```

> **Artist contract:** Draw ONE body. Eyes, ears, tail, and cosmetics are separate sprite sheets that compose over it. Adding a cosmetic = one new PNG, never a redraw of the cat.

### 5.2 Pet Zones (Hit-Test Map) `[ENG] [ART]`

The cat's body is divided into **8 pettable zones** (the original 9-zone concept merged the two thin neck zones into a single wide **Chin** zone for reliable touch targeting on-screen). Each zone is a static hit-test polygon defined relative to the sprite's bounding box.

Layout (front-facing seated cat):

```
        [ L.Ear ] [ Forehead ] [ R.Ear ]      ← top band (head)
                  [   Chin    ]                 ← single wide zone
   [ L.Paw ][ L.Chest ][ R.Chest ][ R.Paw ]    ← bottom band (torso)

        [ Eyes ] = "no-no" zone overlapping the face
```

| # | Zone | Type | Reaction (animation) | Haptic character |
|---|------|------|----------------------|------------------|
| 1 | Left Paw | Good | Paw pushes/kneads | Short rhythmic taps |
| 2 | Left Chest | Good | Purr intensifies (left lean) | Deep slow rumble |
| 3 | Right Chest | Good | Purr intensifies (right lean) | Deep slow rumble |
| 4 | Right Paw | Good | Paw pushes/kneads (mirrored) | Short rhythmic taps |
| 5 | Chin | Good (favorite) | Eyes close, head tilts down, strong purr | Strong sustained purr |
| 6 | Forehead | Good | Slow blink, headbutt forward | Medium steady pulse |
| 7 | Left Ear | Good | Ear flattens then perks | Soft light flicks |
| 8 | Right Ear | Good | Ear flattens then perks (mirrored) | Soft light flicks |
| 9 | **Eyes** | **No-no** | Annoyed: ears back, swat, brief recoil | Sharp single buzz (negative) |

> Note: "Eyes" is listed as zone 9 conceptually but functions as a special **negative** overlay zone, not a standard pettable region. It takes priority over Forehead/Chin when touched directly on the eyes.

### 5.3 Zone Interaction Rules `[ENG]`

- **Hit-testing:** zones are static polygons in sprite-local coordinates, scaled to the rendered sprite size. Define once; never recompute per-frame.
- **Zone lock / debounce:** when a finger enters a new zone, lock to that zone for ~150ms before allowing a new zone-change event. Prevents rapid misfires when dragging across boundaries.
- **Stroke detection:** a "pet" registers on touch-move with a minimum stroke length (tunable, start ~20px) — a static tap is a lighter event than an active stroke.
- **Eyes priority:** if the touch point is within the Eyes polygon, it overrides any overlapping good zone and fires the annoyed reaction.
- **Intensity ramp:** sustained petting in good zones escalates the cat's state: `content → purring → blissed out`. Releasing touch decays back to idle over a short window.

### 5.4 Adopted Base Asset (LOCKED) `[ART] [ENG]`

The base cat is an **existing 32×32 pixel sprite** (4-frame idle animation) that has been adopted as the locked art direction. It is round, sleepy, chunky, and front-facing — exactly the cozy target.

**Source files:**

- `cat-spritesheet-32x32.aseprite` — the **authoritative source** (2 layers, 4 frames @ 100ms). All exports derive from this.
- `cat-sprite-32x32.png` — a flattened reference strip (128×32, = 4 × 32×32 frames). **Note:** the uploaded copy was saved with JPEG compression and a black background; it is reference-only. **Never ship it.** Re-export clean PNGs from the `.aseprite` source.

**Existing animation:** the 4 frames already form a subtle idle loop (tail flick + slight body/paw shift between frames). This becomes the **Idle** state (§6) directly.

**Export requirements `[ART]`:**

1. Export from the `.aseprite` source as **PNG with a transparent background** — no JPEG, no baked background color.
2. Maintain 32×32 per frame; export as a horizontal sprite sheet (frames left-to-right) plus a `manifest.json` describing frame size, count, and FPS.
3. Preserve the existing 1px outline and limited palette.

**Required art work to reach v1 `[ART]`:** the current asset is a single flattened idle. To support the 8-zone reactive system (§5.2) it must be **separated into the layer contract** of §5.1 — at minimum split **body, eyes, ears (L/R), tail** onto independent layers so each can animate when its zone is petted. Because this is tracing/separating an existing beloved cat rather than drawing from scratch, it is low-risk art work. Additional reaction frames (squint, annoyed, ear-flat, etc., per §6) are drawn on these separated layers.

**Rendering note `[ENG]`:** render the 32×32 sprite scaled up by an **integer factor** with nearest-neighbor sampling in Skia. Do not use fractional scales or smoothing.

---

## 6. Animation States `[ART] [ENG]`

Minimum viable animation set. Each is a short sprite-sheet sequence (~4–8 frames) on the relevant layer(s).

| State | Trigger | Layers animated | Notes |
|-------|---------|-----------------|-------|
| Idle | No touch | Eyes (slow blink), Tail (sway), Body (breathe) | **Already exists** — the adopted 4-frame base asset (§5.4) is the idle loop |
| Noticing | First touch after idle | Ears (perk), Eyes (widen) | Brief transition |
| Being petted | Active stroking, good zone | Per-zone layer (see §5.2) | Zone-specific |
| Purring peak | Sustained good petting | Eyes (full squint), Tail (wrap), Whiskers (spread) | Escalated state |
| Post-pet | Touch released | Eyes (slow blink) → Idle | Decay transition |
| Annoyed | Eyes zone touched | Ears (back), Body (recoil/swat) | Negative reaction |
| Streak milestone | App open reward | Ears (wiggle), Overlay (sparkle) | Celebration |

---

## 7. Core Gameplay Loop `[PRODUCT] [ENG]`

```
Open app
   ↓
Streak check (increment if new calendar day)  →  possible milestone reward
   ↓
Pet the cat (touch + drag across zones)
   ↓
Each valid pet stroke  →  +Points  &  +XP   (and haptic + animation feedback)
   ↓
XP accumulates  →  Level up  →  unlocks new cosmetics in shop
   ↓
Spend Points in shop  →  buy/equip cosmetics (cat accessories + scenes)
   ↓
(Repeat; notifications pull user back)
```

### 7.1 Currencies & Progression `[ENG] [PRODUCT]`

- **Points** — soft currency earned per pet. Spent on cosmetics. No cap.
- **XP** — earned per pet (can use same or different rate than Points). Never spent; drives Level.
- **Level** — derived from cumulative XP via a level curve. Each level may **unlock** cosmetics (gating availability) which are then **purchased** with Points.

> Design intent: XP gates *what's available*; Points gate *what you can afford*. This creates two interleaved progression vectors.

**Earning rules (tunable constants — see §9.4):**

- Base: each valid pet stroke grants `POINTS_PER_PET` and `XP_PER_PET`.
- Favorite-zone bonus (e.g. Chin) may grant a small multiplier.
- Eyes (no-no) zone grants **no** Points/XP (and may briefly suppress earning during the annoyed recoil).
- Consider a soft anti-grind measure (e.g. diminishing returns within a single rapid session) — flag for tuning, not required for v1.

### 7.2 Streak System `[PRODUCT] [ENG]`

- A "day" counts when the user **opens the app** on a new local calendar day.
- Track `currentStreak`, `longestStreak`, `lastOpenDate`.
- Missing a day resets `currentStreak` to 1 on next open (not 0 — the open itself counts).
- Milestones (e.g. 3, 7, 14, 30 days) trigger a celebration animation and a reward (bonus Points and/or an exclusive cosmetic).
- **Timezone handling:** use the device's local calendar date. Define "new day" by local midnight. Document this assumption; do not use UTC.

---

## 8. Cosmetics System `[PRODUCT] [ART] [ENG]`

### 8.1 Categories

1. **Cat accessories** — hats, bows, collars, bandanas (Layers 1 & 7).
2. **Scenes / sitting surfaces** — cushion, windowsill, cardboard box, cozy blanket (Layer 0). **This is the primary content surface** — one cat, infinite cozy scenes. Scenes may carry their own ambient animation (rain on a window, drifting leaves, flickering candle).

> Strategic note: prioritizing **scenes** as the main cosmetic category doubles content surface area without drawing new cat poses, and anchors the brand identity ("one cat, infinite cozy scenes").

### 8.2 Cosmetic Item Model `[ENG]`

Each cosmetic is data-driven (see §9.3) with: id, category, display name, asset reference(s), unlock level (XP gate), price (Points), and equip slot. Equipping swaps the relevant layer's asset at runtime.

### 8.3 Equip Rules `[ENG]`

- One item equipped per slot at a time (one hat, one collar, one scene).
- Slots are independent (a hat + a collar + a scene can all be equipped together).
- Equipped state persists in local storage.

---

## 9. Architecture & Data `[ENG]`

### 9.1 Suggested Project Structure

```
src/
├── screens/
│   └── PetScreen.tsx           // Skia canvas + gesture handler (the main screen)
├── components/
│   ├── CatSprite.tsx           // layered pixel sprite renderer
│   ├── PetZonesOverlay.tsx     // debug overlay for hit-test zones
│   ├── XPBar.tsx               // level / XP display
│   ├── PointsCounter.tsx       // points display
│   └── shop/                   // cosmetics shop UI
├── engine/
│   ├── HapticEngine.ts         // interface + impl (expo-haptics / CoreHaptics)
│   ├── hitTest.ts              // zone polygon hit-testing
│   ├── petController.ts        // stroke detection, zone-lock, intensity ramp
│   └── animationController.ts  // state machine for animation states
├── stores/
│   ├── progressStore.ts        // points, xp, level, streak (Zustand + MMKV)
│   └── cosmeticsStore.ts       // owned + equipped cosmetics
├── services/
│   ├── notificationService.ts  // schedule + handle local notifications
│   └── streakService.ts        // day-rollover logic
├── data/
│   ├── cosmetics.ts            // cosmetic item catalog (data-driven)
│   ├── levelCurve.ts           // XP → level mapping
│   └── tuning.ts               // all tunable constants in one place
└── assets/
    └── cat/                    // sprite assets (see §10 contract)
```

### 9.2 Progress State Shape (illustrative)

```ts
type ProgressState = {
  points: number;
  xp: number;
  level: number;            // derived from xp via levelCurve, cached
  currentStreak: number;
  longestStreak: number;
  lastOpenDate: string;     // local calendar date, e.g. "2026-06-15"
};
```

### 9.3 Cosmetic Catalog Entry (illustrative, data-driven)

```ts
type Cosmetic = {
  id: string;
  category: 'hat' | 'collar' | 'scene';
  slot: 'head' | 'collar' | 'scene';
  displayName: string;
  assetKey: string;         // resolves to a file in assets/cat per §10 contract
  unlockLevel: number;      // XP-gated availability
  pricePoints: number;      // Points cost
  isStreakReward?: boolean; // if granted by streak milestone instead of purchase
};
```

### 9.4 Tuning Constants (single source of truth) `[ENG]`

Centralize all balance values in `data/tuning.ts` so they can be iterated without hunting through code. At minimum:

```ts
export const TUNING = {
  POINTS_PER_PET: 1,
  XP_PER_PET: 1,
  FAVORITE_ZONE_MULTIPLIER: 1.5,   // e.g. Chin
  MIN_STROKE_PX: 20,
  ZONE_LOCK_MS: 150,
  INTENSITY_DECAY_MS: 800,
  STREAK_MILESTONES: [3, 7, 14, 30],
};
```

### 9.5 Persistence `[ENG]`

- All progress, streak, and cosmetic ownership/equip state persists via MMKV.
- Writes should be debounced/batched during active petting to avoid thrashing storage on every stroke (accumulate in-memory, flush on pause/background).

---

## 10. Asset Pipeline & Artist Deliverables `[ART] [ENG]`

### 10.1 The Asset Contract

The renderer loads assets from a fixed folder structure so swapping placeholder → final art is a **file replacement, not a code change**. Artists deliver to this exact structure and naming:

```
assets/cat/
├── body.png                    // base body incl. front paws, 32×32 (see §5.4)
├── eyes/
│   ├── idle.png                // (sprite sheet) open/blink frames
│   ├── squint.png
│   ├── annoyed.png
│   └── heart.png               // optional, for peak/bliss
├── ears/
│   ├── left_idle.png
│   ├── left_perk.png
│   ├── left_flat.png
│   ├── right_idle.png
│   ├── right_perk.png
│   └── right_flat.png
├── tail/
│   ├── idle.png                // (sprite sheet) sway frames
│   └── happy.png               // puff/wrap frames
├── overlays/
│   └── sparkle.png             // streak celebration overlay
├── cosmetics/
│   ├── hats/<id>.png
│   ├── collars/<id>.png
│   └── scenes/<id>.png         // background scene, may include ambient frames
└── manifest.json               // maps assetKey → file + frame metadata
```

### 10.2 Sprite Sheet & Frame Specs `[ART]`

- **Base resolution:** **32×32 logical px** (locked, §5.4). Render at integer scale with nearest-neighbor. Do **not** export `@3x` raster variants — pixel art scales cleanly at runtime via integer nearest-neighbor, so a single 32×32 source per frame is correct.
- **Frame counts:** keep small — the base idle is 4 frames; blink ~3, ear twitch ~4, tail sway ~4–6, annoyed ~4–6.
- **Format:** PNG with transparency. Trimmed to a consistent canvas so layers align.
- **Registration:** every layer shares the same 32×32 canvas origin/size as `body.png` so they composite without per-layer offsets. If offsets are unavoidable, record them in `manifest.json`.
- **Manifest:** `manifest.json` declares each asset's frame width/height, frame count, and FPS so the renderer can slice sheets generically.

### 10.3 Production Plan (recommended sequence) `[ART] [PRODUCT]`

1. **Base asset adopted (DONE):** the 32×32 cat (§5.4) is locked as the visual target and idle animation. Re-export clean transparent PNGs from the `.aseprite` source.
2. **Placeholder phase (during build):** the adopted cat's idle loop *is* the placeholder — render it in Skia early so engineering builds against real art. Use colored zone overlays (debug mode) on top for hit-test validation.
3. **Validate the feel:** confirm zone sizes, stroke thresholds, and haptic patterns with real fingers on-device. Adjust the zone map if needed before committing to the full layer separation.
4. **Layer separation + reaction frames:** split the cat into the §5.1 layer contract (body/eyes/ears/tail) and draw the per-zone reaction frames (§6). This is the main remaining art task — done in **Aseprite** by tracing/separating the existing cat, or commissioned to spec (itch.io, #pixelart on X, Fiverr/Behance).
5. **Swap & polish:** drop separated layers + cosmetics into `assets/cat/`, update `manifest.json`, polish timings.

### 10.4 Artist Brief Summary `[ART]`

- **Base cat is already chosen** (§5.4): a 32×32 chunky cozy seated, front-facing cat with a 4-frame idle. The main art task is **separating it into modular layers** and drawing reaction frames, not designing a new cat.
- Warm limited palette (creams, oranges, grays); thick rounded 1px dark outline; chunky cozy style. Match the existing base asset.
- Deliver modular layers (body, eyes states, ears states, tail states) + cosmetics as separate transparent PNGs, all on a shared 32×32 canvas.
- Scenes are the priority cosmetic category — design several cozy environments with optional ambient animation.

---

## 11. UX Flows `[PRODUCT]`

### 11.1 First Launch

1. (Optional, minimal) brief welcome — name the cat? Keep onboarding to near-zero friction.
2. Request notification permission with a light-hearted rationale ("So your cat can say hi 🐾"). Do not block app use if declined.
3. Land directly on the Pet screen.

### 11.2 Returning Launch

1. App open → streak service evaluates calendar day → increments/resets streak.
2. If a milestone is hit, play celebration + grant reward before settling into idle.
3. Land on Pet screen.

### 11.3 Petting (core)

Touch/drag on the cat → zone hit-test → animation + haptic + Points/XP. Sustained petting escalates state; releasing decays to idle. Eyes zone → annoyed reaction, no rewards.

### 11.4 Shop / Cosmetics

Accessible from the Pet screen (e.g. a small button). Browse by category; locked items show their unlock level; affordable unlocked items can be purchased with Points; owned items can be equipped/unequipped per slot. Changes reflect immediately on the cat.

### 11.5 Notifications `[PRODUCT]`

- Tone: light-hearted, never guilt-tripping ("Your cat stretched and looked at the door 🐱", "Someone misses your scritches").
- Cadence: gentle. A daily-ish reminder window; back off if the user has been active. Respect quiet hours.
- All notifications are **local** (no server in v1).

---

## 12. Scope & Milestones `[PRODUCT] [ENG]`

### 12.1 Build Order

| Phase | Deliverable |
|-------|-------------|
| 0 | **Haptic spike** — prototype the continuous purr (expo-haptics vs CoreHaptics module). De-risk first. |
| 1 | Pet screen with Skia canvas, **adopted 32×32 cat idle (§5.4)**, zone hit-testing, per-zone haptics + debug overlay |
| 2 | Animation state machine wired to zones (idle from base asset; reaction frames stubbed until layer separation) |
| 3 | Points + XP + level curve; persistence via MMKV |
| 4 | Streak system + milestone rewards |
| 5 | Cosmetics system (data-driven catalog, shop UI, equip/persist) |
| 6 | Local notifications (light-hearted, scheduled) |
| 7 | Swap in **layer-separated cat + reaction frames + cosmetics** per asset contract; polish timings, haptics, balance |
| 8 | Settings (sound toggle, haptics toggle, notification toggle), polish, ship |

### 12.2 v1 Definition of Done

- Seated cat responds to all 8 good zones + the Eyes no-no zone with distinct animation + haptics.
- Continuous purr feels convincing on a modern iPhone.
- Points/XP/level/streak all persist across launches.
- At least a starter set of cosmetics across hats, collars, and scenes, with XP-gated unlocks and Points purchases.
- Light-hearted local notifications schedulable and respectful of permissions/quiet hours.
- Final art swapped in via the asset contract.

### 12.3 Explicitly Out of Scope (v1)

Multiple cat poses; multiple cats/breeds (consider v2); IAP/ads; cloud sync/accounts; social features; Android release (architecture-compatible but untested in v1).

---

## 13. Open Questions / To Tune `[PRODUCT] [ENG]`

1. **Haptic implementation** — does expo-haptics suffice for the purr, or is a CoreHaptics native module required? (Resolve in Phase 0.)
### Prioritze expo-haptics, if needed then proceed to build the modules in CoreHaptics
2. **Points vs XP rates** — same rate or differentiated? (Tune in §9.4.)
### Points are earned in portion to the XP
3. **Anti-grind** — is diminishing-returns needed in v1, or defer? 
### Yes
4. **Naming the cat** — onboarding step or skip entirely for v1?
### Allow users to name the cat, similar in Pou, and the name will be displayed above the cat
5. **Sound** — is layered purr audio in v1 scope, or haptics-only with a v1.1 audio pass?
### Audio and Haptics
6. **Cat customization vs single cat** — v1 is one cat; is breed/color selection a v2 priority?
### Different breed and color will be a feature in v2, and can be purchased with points and unlocked with XP

---

*End of PRD v1.*
