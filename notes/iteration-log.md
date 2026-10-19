# Iteration log

After every render: checklist result, 5 weakest points, chosen fix.

## 2026-10-19 - Style review (before scenes exist, no episode render)
Looked at: styles-compare.png, style-warm/dusk/line.png, faces-10-crop.png, StreetVesuvius.tsx, Stickman.tsx, StyleTest.tsx. No render, no check-episode run.
Decision known: A "Warm flat" is the base, darkening toward B over the episode, stickman always ink #1d2433.
Measured (WCAG contrast, ink #1d2433 vs palette): A wall 7.3, A ground 7.2, A volcano 3.2, A doorway/windows 1.14 (same value as ink); B walls 1.04-1.05, B ground 1.13, B volcano 1.5. In A: smoke vs sky 1.04, sun vs sky 1.29, wall vs ground 1.01. A background needs luminance >= ~0.15 behind the ink for 3:1.
Top problems: (1) danger not visible in A, plume looks like thought bubbles, sun is the loudest element; (2) black stickman disappears on dark stages (only the white head stays); (3) composition: stickman ~22% of height, feet at y=1530 on the safe line (zoom 1.06 pushes them to ~1544), caption space collides with head/arms; (4) faces too fine at phone size, clutter next to head (roof apex, dark windows); (5) A is monotone in value, slow fade gives little variety.
Proposed next: (a) stickman light halo + rule for dark stages, (b) re-compose frame (street line up, stickman bigger, caption zone above head) and replace sun/bubbles with a big ash plume.
