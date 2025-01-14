import { randomUUID } from 'crypto';
import * as fs from 'fs';
import slugify from 'slugify';
import { FormDefinitionParser } from './FormDefinitionParser';
import { FormDefinitionTransformer } from './FromDefinitionTransformer';
import { HaalCentraalMapping } from './HaalCentraalMapping';
import { OpenFormulierenFormDefinition } from './OpenFormulierenFormDefinition';


export async function convert(source: string, destination?: string) {
  console.log(source, destination);

  const dest = destination ?? './output';
  let raw = fs.readFileSync(source).toString('utf-8');
  const json = JSON.parse(raw);

  // Convert and save
  const converted = convertFormDefinition(json);
  converted.writeToFileSystem(dest);
  await converted.writeZipToFileSystem(dest);
}

function removeDuplicateKeys(json: any, step: number) {
  const parser = new FormDefinitionParser(json);
  const keys = parser.getAllFormDefinitionComponents().map(component => component.key);
  console.debug('removing duplicates');
  let replaceKeys = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (keys.includes(key, i + 1)) {
      const firstComponent = parser.getAllFormDefinitionComponents().find(component => component.key == key);
      console.log('duplicate key', key, `${firstComponent?.keyPath}`);
      replaceKeys.push(key);
    }
  }
  for (let key of replaceKeys) {
    console.debug('replacing key', key);
    json = JSON.parse(JSON.stringify(json).replace(`"key":"${key}"`, `"key":"${key}-${step}"`)); // I'm very sorry
  }
  if (replaceKeys.length > 0) {
    json = removeDuplicateKeys(json, step + 1);
  }
  return json;
}

export function convertFormDefinition(input: any) {
  try {

    // Remove all _nijmegen suffixes in the form definition
    let raw = JSON.stringify(input);
    raw = raw.replace(/_nijmegen/g, '');
    let formdefinition = JSON.parse(raw);

    const parser = new FormDefinitionParser(formdefinition);

    // Check for wizad form otherwise throw
    if (formdefinition.display != 'wizard') {
      throw new Error('Only wizzard forms are supported');
    }
    console.log('Form is a wizard 🧙, create multistep export');

    // Loop through the form and create a new step & definition for each pannel in the form definition
    const panels = parser.getAllFormDefinitionComponents().filter(component => component.type == 'panel');
    formdefinition = removeDuplicateKeys(formdefinition, 1);
    let steps = [];
    let formDefinitions = [];
    for (let i = 0; i < panels.length; i++) {
      const uuid = randomUUID();
      const formDefinition = {
        url: `http://localhost/api/v2/form-definitions/${uuid}`,
        uuid,
        name: formdefinition.components[i].title.slice(0, 49),
        slug: slugify(formdefinition.components[i].title, { strict: true, lower: true }),
        configuration: {
          display: 'form',
          components: formdefinition.components[i].components.map((component: any) => { return { ...component, conditional: undefined }; }),
        },
      };
      const step = {
        uuid: randomUUID(),
        index: i,
        slug: slugify(formdefinition.components[i].title, { strict: true, lower: true }),
        form_definition: `http://localhost/api/v2/form-definitions/${uuid}`,
      };
      formDefinitions.push(formDefinition);
      steps.push(step);
    };

    // Create a form to wrap the steps and definitions in
    const formUuid = randomUUID();
    const forms = [
      {
        uuid: formUuid,
        name: parser.allMetadata.formTitle.slice(0, 49),
        internal_name: '',
        login_required: false,
        authentication_backends: [],
        slug: slugify(parser.allMetadata.formName.slice(0, 49), { strict: true, lower: true }),
        url: `http://localhost/api/v2/forms/${formUuid}`,
        show_progress_indicator: true,
        maintenance_mode: false,
        active: true,
        is_deleted: false,
        suspension_allowed: true,
        send_confirmation_email: true,
        display_main_website_link: true,
        required_fields_with_asterisk: true,
        resume_link_lifetime: 7,
        hide_non_applicable_steps: true,
      },
    ];

    // Create the export object
    const formsString = JSON.stringify(forms, null, 4);
    const formDefinitionsString = JSON.stringify(formDefinitions, null, 4);
    const stepsString = JSON.stringify(steps, null, 4);
    const openFormsDefinition = new OpenFormulierenFormDefinition(formDefinitionsString, formsString, stepsString, parser.allMetadata);

    return openFormsDefinition;

  } catch (error) {
    console.error(error);
    throw Error('issue converting formdefinition');
  }
}


export async function convertFullFormDefinition(source: string, destination?: string) {
  console.log('Converting:', source, destination);

  const dest = destination ?? './output';
  let raw = fs.readFileSync(source).toString('utf-8');
  const form = JSON.parse(raw);

  // const subformTransformer = new FormDefinitionTransformer(removeSubform);
  // const prefillTransformer = new FormDefinitionTransformer(addBrpPrefillConfiguration);
  const contentTransformer = new FormDefinitionTransformer(convertHtmlContent);
  const hiddenfieldsTransformer = new FormDefinitionTransformer(removeHiddenFields);
  const overzichtsTransformer = new FormDefinitionTransformer(removeOverzichtsPannels);

  // For each form do a couple of steps

  // console.log('Processing form: ', formName);
  // const form = json.forms[formName];

  // Step 1. Remove hiddenfields (not important in OpenForms)
  hiddenfieldsTransformer.transform(form);  // Tested

  // Step 2. Remove overzichts pages
  overzichtsTransformer.transform(form); // Tested

  // Step 3. Fix HTML elements (as they do not work in OpenForms in the same way)
  contentTransformer.transform(form); // Tested

  // Step 3. Replace all subforms in the form definition tree
  // subformTransformer.transform(form); // TODO do lookup and on the fly conversion here

  // Step 4. Add BRP prefill to form fields that need it.
  // prefillTransformer.transform(form); // TODO make the mapping and test if we can actually use this


  // DUMP halffabrikaat (to be removed)
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  fs.writeFileSync(dest+'/dump.json', JSON.stringify(form, null, 4));

  // Convert and save
  const converted = convertFormDefinition(form);
  converted.writeToFileSystem(dest);
  await converted.writeZipToFileSystem(dest);
}

export function removeSubform(input: any) {
  if (input?.type == 'form' && input?.key) {
    console.log('Replacing subform with form contents', input.key);
    return [] as any[];
  };
  return undefined;
}

export function removeHiddenFields(input: any) {
  if (input?.customClass
    && input.customClass.includes('hiddenfield')
    && !input.customClass.includes('nonhiddenfield')
  ) {
    console.log('Found a hiddenfield, removing it', input.key);
    return [] as any[];
  };
  return undefined;
}

export function removeOverzichtsPannels(input: any) {
  if (input?.type == 'panel' && input?.title == 'Overzicht') {
    console.log('Found a overzichts page, removing it', input.key);
    return [] as any[];
  };
  return undefined;
}

export function addBrpPrefillConfiguration(input: any) {
  if (input?.label && (input?.type == 'textfield' || input?.type == 'textfield_nijmegen')) {
    const prefill = HaalCentraalMapping.getPrefillConfiguration(input);
    if (prefill) {
      return [{ ...input, prefill }];
    }
  }
  return undefined;
}

export function convertHtmlContent(input: any) {
  if (input?.label && input?.type == 'htmlelement') {
    console.log('Found htmlelement', input.label);
    const html = input.content;
    const type = 'content';
    return [{ ...input, html, type }];
  }
  return undefined;
}