# Notes for improvement that will likely work


## Prefill BRP

Een component in de formDefinitions.json file kan het volgend hebben:
```
"prefill": {
  "plugin": "haalcentraal",
  "attribute": "verblijfplaats.woonplaats",
  "identifierRole": "main"
},
```
Ik denk dat we zo relatief eenvoudig een hoop klikewerk kunnen voorkomen door de prefill automatisch goed te zetten (obv bestaande veld namen bijv.)


## Subformulieren
Subformulieren worden niet ondersteund in OpenForms. Hier moeten we dus anders mee omgaan.
Idee: Vervang subformulier componenten door de formulier definitie waar ze naar wijzen. Bijvoorbeeld:
1. Find subform component
2. Find corresponding subform definition
3. Get components from subform (exclude submit buttons)
4. Replace component with all subform components.


