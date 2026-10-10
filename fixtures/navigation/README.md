# Navigation fixtures (NAV-00)

Baseline `0dab333adac7c95c2dd486b85eaaf1c20cff6f5f`. These files are not linked from `index.html` and are not service-worker assets.

`clean.json` and `theory-draft.json` are `ProgressStore.serialize` output after `migrate` (`progress.js`, `config.js`). The theory draft is lesson `1-1`, beat `0`, value `nav00-draft`.

`practice-mid.json` is the `save()` session shape. Question id `m1-1-1` is resolved from `data.js` (not `STRUCTURAL`).

`practice-incompatible.json` is the same shape with queue id `missing-question-nav00`. Today's `validSaved` rejects unknown ids (`byId.has`). `migrate` keeps the id; nothing here rewrites it.

`must-*.json` are structural placeholders, status `EXPECTED_UNTIL_VOC`. v6 `session.vocab` is not on this baseline and these files are not product behavior.

`entry-map.json` maps current track and trainer ids, plus the current shell screens, onto the future public routes. Those routes are not implemented here.

`protected-sha256.json` is the sha256 of the protected morph and free-practice files at this baseline.
