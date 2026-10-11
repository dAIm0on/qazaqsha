# Navigation fixtures (NAV-00)

Baseline `0dab333adac7c95c2dd486b85eaaf1c20cff6f5f`. These files are not linked from `index.html` and are not service-worker assets.

`clean.json` and `theory-draft.json` are `ProgressStore.serialize` output after `migrate` (`progress.js`, `config.js`). The theory draft is lesson `1-1`, beat `0`, value `nav00-draft`.

`practice-mid.json` is the `save()` session shape. Question id `m1-1-1` is resolved from `data.js` (not `STRUCTURAL`).

`practice-incompatible.json` is the same shape with queue id `missing-question-nav00`. Today's `validSaved` rejects unknown ids (`byId.has`). `migrate` keeps the id; nothing here rewrites it.

`must-*.json` are `save()` sessions captured from the product on main `9a1fbc4714393c52f17f5f42abf4a01c58c94319`. Production cache `qazaq-offline-live-20261011-vocab-pr6c` is unchanged: this capture does not edit the product. Recapture with `node tools/capture_nav_must_fixtures.js`. `queueEpoch`, `trainerEpoch`, `elapsed_ms` and sitting timestamps are whatever that run wrote. Checks restore the committed file. They do not byte-compare two captures. `session.vocab` is the v6 snapshot (`plan`, `sitting`, `retry`, `closed`, `unaided`, `blindFails`, `nearMiss` null). On these fresh sessions `sitting.legacy` is null and `sitting.shown` lists the lemmas actually shown. An open summary is not stored. `must-summary.json` is the session saved while that summary was on screen, and a reload returns to that card. The capture keeps the queue `planPortion` built, including a repeated tail when the product queues one.

`entry-map.json` maps current track and trainer ids, plus the current shell screens, onto the future public routes. Those routes are not implemented here.

`protected-sha256.json` is the sha256 of the protected morph and free-practice files at this baseline.
