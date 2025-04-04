## How to build?
`npx projen build`

## How to run?
- First build
- Then run like: `node lib/export.js convert <inputfile> <output-dir>`

Note: the input file must be a full fromio export containing all form definitions. This is required the tool replaces nested forms with the form definition of the references form.

Example:
```node lib/export.js convert sampleformiofullexport.json test-export```

Or for help
```node lib/export.js -h```


## What does the conversion do?
- Aanpassen van de form definities
  1. Replace all subforms with a content element indicating the form used a subform
  2. Replace all containers with fieldsets
  3. Remove hiddenfields (not important in OpenForms)
  4. Remove overzichts pages
  5. Fix HTML elements (as they do not work in OpenForms in the same way)
  6. Add BRP prefill to form fields that need it. (EXPERIMENTAL)
  7. Remove all buttons (provided by OpenForms now)
- Opsplitsen verschillende stappen in:
  - Form definitions (json)
  - From steps (json)
  - Froms (json)
- Zippen en wegschrijven

