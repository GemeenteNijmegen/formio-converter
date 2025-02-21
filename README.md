## How to build?
`npx projen build`

## How to run?
- First build
- Then run like: `node lib/export.js convert <inputfile> <output-dir> (optional)`

Note: the input file must be a full fromio export containing all form definitions. This is required the tool replaces nested forms with the form definition of the references form.

Example:
```node lib/export.js convert sampleformiofullexport.json test-export```

Or for help
```node lib/export.js -h```



## What does the conversion do?
- Aanpassen van de form definities
  1. Replace all subforms in the form definition tree
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


## Why is prefill flag experimental?
The hiddenfields form can add BRP prefill configuration. However in the current formio architecture of the forms the same form field is used to fill the field with a kvk or a bsn prefill (for example). This is defined in the broker-service-mapping in the formconfig ([Private repo](https://github.com/GemeenteNijmegen/aws-eform-formconfig/tree/acceptatie/broker-attribute-mapping-config/json)). Thefefore just adding a prefill configuration to the fileds that had this in the hiddenfields form will no t be sufficient.

This feature needs to be extended with:
- Variable creation that will be prefilled with the KVK or BRP values.
- Logic rule that maps those variables (when available) to the specific field.

<details>
<summary>Technical details on how to do this</summary>
Variables can be added to the import set of files by creating a formVariables.json file like below. Note this includes prefill configuration.

```json
[
  {
    "form": "http://localhost/api/v2/forms/4e95e1fd-2b71-4b53-86d2-d14be09b5f83",
    "form_definition": null,
    "name": "TestVar",
    "key": "testVar",
    "source": "user_defined",
    "service_fetch_configuration": null,
    "prefill_plugin": "kvk-kvknumber",
    "prefill_attribute": "bezoekadres.geoData.rijksdriehoekZ",
    "prefill_identifier_role": "main",
    "data_type": "string",
    "data_format": "",
    "is_sensitive_data": false,
    "initial_value": ""
  }
]
```

Logic rules to fill the field can be added to the import set of files by creating a formLogic.json file like below. Note this file sets the value of a field when the prefill variable above is set.

```json
[
  {
    "uuid": "08310c72-c874-45e1-85ae-93aa03f4bece",
    "url": "http://localhost/api/v2/forms/08310c72-c874-45e1-85ae-93aa03f4bece/logic-rules",
    "form": "http://localhost/api/v2/forms/4e95e1fd-2b71-4b53-86d2-d14be09b5f83",
    "json_logic_trigger": {
      "!=": [
        {
          "var": "testVar"
        },
        ""
      ]
    },
    "description": "",
    "order": 0,
    "trigger_from_step": null,
    "actions": [
      {
        "component": "",
        "variable": "kvKNaam",
        "form_step": "",
        "form_step_uuid": null,
        "action": {
          "type": "variable",
          "value": {
            "var": "TestVar"
          }
        }
      }
    ],
    "is_advanced": false
  }
]
```

</details>
