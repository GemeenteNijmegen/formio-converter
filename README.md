## How to build?
`npx projen build`

## How to run?
- First build
- Then run like: `node lib/export.js convert <inputfile> <output-dir> (optional)`

Example:
```node lib/export.js convert sampleformdefinition.json test-export```


## What does the conversion do?
- Aanpassen van de form definities
  1. Replace all subforms in the form definition tree
  2. Replace all containers with fieldsets
  3. Remove hiddenfields (not important in OpenForms)
  4. Remove overzichts pages
  5. Fix HTML elements (as they do not work in OpenForms in the same way)
  6. Add BRP prefill to form fields that need it.
  7. Remove all buttons (provided by OpenForms now)
- Opsplitsen verschillende stappen in:
  - Form definitions (json)
  - From steps (json)
  - Froms (json)
- Zippen en wegschrijven