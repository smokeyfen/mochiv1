# RUBRIC-0 — Manual Benchmark Review

**Version:** `RUBRIC_0`  
**Scope:** one generated benchmark scene reviewed by a human against the real product references and its benchmark contract.

Review the actual generated video before recording an observation. Compare it with the real product references and the expected benchmark action, end state, and camera intent. Record each existing dimension as PASS or FAIL with concise reviewer notes. Do not infer a PASS from a numeric score or from another dimension.

## Overall verdict

The deterministic verdict is **PASS only when every required dimension passes**. A failure in any dimension produces **FAIL**. Failed dimensions are never averaged away, and a manually entered PASS cannot override the derived verdict.

A critical defect is always fail-closed. It must be recorded as a failed dimension and cannot coexist with an overall PASS. Rubric-0 does not change the Action Capability promotion policy: a classification still needs real reviewed evidence under the locked 10-attempt, 0.90 SAFE, and 0.60 RISKY thresholds.

## Dimensions

### PRODUCT_FIDELITY

PASS when the correct target product is preserved; major silhouette and geometry are stable; the dominant color family is preserved; identity-bearing packaging, logo, and label are not substituted or invented; and unrelated referenced products are not borrowed into the target.

FAIL examples: wrong SKU or product, severe geometry morph, major unexplained color shift, or identity-bearing label/logo substitution.

### HAND_ANATOMY

PASS when hand and finger anatomy, grip, and contact are plausible, with no fused or duplicated digits, impossible joints, or hand/product penetration.

FAIL examples: fused fingers, duplicated digits, impossible joint articulation, or a hand penetrating the product.

### ACTION_COMPLETION

PASS when the benchmarked primary action is visibly completed in the correct direction and reaches the expected end state.

FAIL examples: incomplete action, reversed action direction, or failure to reach the expected end state.

### PHYSICS

PASS when there is no floating, teleportation, impossible clipping or penetration, impossible product deformation, and grip/object motion remains physically plausible.

FAIL examples: floating product, teleportation, clipping, penetration, or impossible deformation.

### CAMERA_REALISM

PASS when the intended smartphone/POV camera family is preserved, framing supports the physical objective, and camera movement does not contradict the scene contract.

FAIL examples: camera family contradicts POV intent, framing prevents action review, or movement contradicts the scene contract.

### UNEXPECTED_CUTS

PASS when no uncontracted cut or reset breaks the action or state progression.

FAIL examples: an uncontracted cut or a state-reset cut that breaks the action.

### VISIBLE_ARTIFACTS

PASS when no prominent generation artifact materially damages product fidelity, hand quality, action readability, or final usability.

FAIL examples: an artifact obscures the product or materially damages hand/action readability.

## Scope boundary

RUBRIC-0 evaluates a single generated benchmark scene only. Cross-scene continuity is not artificially added to this F0 rubric. Pairwise and global continuity QC belong to the later production QC pipeline.
