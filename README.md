## How to build?
`npx projen build`

## How to run?
- First build
- Then run like: `node lib/export.js convert <inputfile> <output-dir> (optional)`

Example:
```node lib/export.js convert sampleformdefinition.json test-export```


## What does the conversion do?
- Aanpassen van de form definities
  0. Replace all subforms in the form definition tree
  0. Replace all containers with fieldsets
  1. Remove hiddenfields (not important in OpenForms)
  2. Remove overzichts pages
  3. Fix HTML elements (as they do not work in OpenForms in the same way)
  4. Add BRP prefill to form fields that need it.
  5. Remove all buttons (provided by OpenForms now)
- Opsplitsen verschillende stappen in:
  - Form definitions (json)
  - From steps (json)
  - Froms (json)
- Zippen en wegschrijven