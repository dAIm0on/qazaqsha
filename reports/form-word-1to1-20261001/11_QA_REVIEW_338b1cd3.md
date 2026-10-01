# 11 — Review of black-box QA 338b1cd3

Date: 2026-10-01
Reviewed QA HEAD: `338b1cd3e2a9c24227bde22aa32b6553e02341e0`

## QA verdict received

QA returned `FINAL: FAIL` with two claimed blockers:
1. lesson 6.5 missing;
2. top-level navigation unavailable at 200% zoom.

## Canonical catalog correction

The first item is not a product defect.

Canonical source:
`07_КАТАЛОГ_УРОКОВ.json` in the NAV2 specification package.

It declares:
- `lessonCount: 40`;
- Part 3: lessons 3.1–3.7;
- Part 6: lessons 6.1–6.4.

Therefore:
- 3.6 and 3.7 are canonical and must be black-box walked;
- 6.5 is not canonical and must not be added;
- the QA instruction that expected 3.1–3.5 plus 6.1–6.5 was inconsistent and listed only 39 IDs while claiming 40.

No runtime catalog change is required for this point.

## Real defect retained

The 200% desktop zoom defect is valid.

Cause:
- desktop zoom can reduce the CSS viewport below 690px;
- mobile CSS hides `.topnav`;
- NAV2 immersive mode intentionally hides `.bottom-nav`;
- on a fine-pointer desktop at high zoom this combination can leave no top-level section navigation.

Fix:
- restore `.topnav` only under `@media(max-width:690px) and (pointer:fine)` for `body[data-view=morph]`;
- preserve immersive bottom-nav behavior on touch/mobile;
- allow wrapping so the navigation remains reachable rather than clipped.

Regression guard added to `verify_morph_nav2_1to1.cjs`.

## Re-QA required

Do not merge or deploy production yet.

Required re-QA:
1. 200% desktop zoom: verify top-level section navigation is visible and operable.
2. Full walk canonical lessons 3.6 and 3.7.
3. Clean-state mid-lesson Back for 1.1, 6.2, 6.3, 6.4.
4. Recheck correct-answer path for practices 3.1, 4.1, 5.3, 6.4 if QA still treats those as unresolved.

The previous "missing 6.5" finding must be marked `INVALID_SPEC_EXPECTATION`, not PASS/FAIL.
