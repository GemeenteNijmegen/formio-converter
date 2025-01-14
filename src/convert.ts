import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { join } from 'path';
import slugify from 'slugify';
import { FormDefinitionParser } from './FormDefinitionParser';
import { FormDefinitionTransformer, FormDefinitionTransformerContext } from './FromDefinitionTransformer';
import { HaalCentraalMapping } from './HaalCentraalMapping';
import { OpenFormulierenFormDefinition } from './OpenFormulierenFormDefinition';
import { wrapInFieldSetComponent } from './wrapInContainerComponent';

const emptyPrefill = {
  plugin: '',
  attribute: '',
  identifierRole: 'main',
};

function removeDuplicateKeys(json: any, step: number) {
  const parser = new FormDefinitionParser(json);
  const keys = parser.getAllFormDefinitionComponents().map(component => component.key);
  let replaceKeys = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (keys.includes(key, i + 1)) {
      replaceKeys.push(key);
    }
  }
  for (let key of replaceKeys) {
    json = JSON.parse(JSON.stringify(json).replace(`"key":"${key}"`, `"key":"${key}-${step}"`)); // I'm very sorry
  }
  if (replaceKeys.length > 0) {
    json = removeDuplicateKeys(json, step + 1);
  }
  return json;
}

export function convertFormDefinition(formdefinition: any) {
  try {

    const parser = new FormDefinitionParser(formdefinition);

    // Check for wizad form otherwise throw
    if (formdefinition.display != 'wizard') {
      throw new Error('Only wizzard forms are supported');
    }
    console.log('Form is a wizard 🧙, create multistep export');

    // The form might contain duplicate keys? I dont know
    formdefinition = removeDuplicateKeys(formdefinition, 1);
    let steps = [];
    let formDefinitions = [];

    // Loop through the form and create a new step & definition for each pannel in the form definition
    // Note: Here we make the assumption that the wizzard form always exists from panels on the root level!
    for (const [i, component] of Object.entries(formdefinition.components as any[])) {

      const uuid = randomUUID();
      const formDefinition = {
        url: `http://localhost/api/v2/form-definitions/${uuid}`,
        uuid,
        name: component.title.slice(0, 49),
        slug: slugify(component.title, { strict: true, lower: true }),
        configuration: {
          display: 'form',
          components: component.components.map((element: any) => { return { ...element, conditional: undefined }; }),
        },
      };
      const step = {
        uuid: randomUUID(),
        index: i,
        slug: slugify(component.title, { strict: true, lower: true }),
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
    throw Error(`issue converting formdefinition: ${error}`);
  }
}


export async function convertFullFormDefinition(source: string, destination?: string) {
  console.log('Converting:', source, destination);

  const start = Date.now();

  const dest = destination ?? './output';
  let raw = fs.readFileSync(source).toString('utf-8');
  raw = raw.replace(/_nijmegen/g, ''); // Convert all fields to normal fields (without _nijmegen suffix)
  raw = raw.replace(/checkboxnijmegen/g, 'checkbox'); // Special fix for checkboxes
  const json = JSON.parse(raw);

  if (!json?.forms) {
    throw Error('Cannot find form definitions in this export, is this a full export?');
  }

  const context = {
    formDefinitionsExport: json,
    output: [],
  };

  const subformTransformer = new FormDefinitionTransformer(replaceSubform, context);
  const prefillTransformer = new FormDefinitionTransformer(addBrpPrefill, context);
  const contentTransformer = new FormDefinitionTransformer(convertHtmlContent, context);
  const hiddenfieldsTransformer = new FormDefinitionTransformer(removeHiddenFields, context);
  const overzichtsTransformer = new FormDefinitionTransformer(removeOverzichtsPannels, context);
  const buttonTransformer = new FormDefinitionTransformer(removeButtons, context);
  const containerTransformer = new FormDefinitionTransformer(convertContainers, context);

  // For each form do a couple of steps
  const messages: string[] = [];
  for (const formName of Object.keys(json.forms)) {

    try {
      console.log('Processing form: ', formName);
      const form = json.forms[formName];

      // Step 0. Replace all subforms in the form definition tree
      subformTransformer.transform(form);

      // Step 1. Replace all containers with fieldsets
      containerTransformer.transform(form);

      // Step 2. Remove hiddenfields (not important in OpenForms)
      hiddenfieldsTransformer.transform(form);

      // Step 3. Remove overzichts pages
      overzichtsTransformer.transform(form);

      // Step 4. Fix HTML elements (as they do not work in OpenForms in the same way)
      contentTransformer.transform(form);

      // Step 5. Add BRP prefill to form fields that need it.
      prefillTransformer.transform(form);

      // Step 6. Remove all buttons (provided by OpenForms now)
      buttonTransformer.transform(form);

      // Step 7. Collect logic
      const logicScannerContext = { formDefinitionsExport: json, output: [] };
      const logicScanner = new FormDefinitionTransformer(collectLogicRules, logicScannerContext);
      logicScanner.transform(form);

      // Do the conversion
      const converted = convertFormDefinition(form);

      // When conversion succedded (no error thrown) write the result to output dir
      const formDest = join(dest, formName);
      if (!fs.existsSync(formDest)) {
        fs.mkdirSync(formDest, { recursive: true });
      }
      converted.writeToFileSystem(formDest);
      await converted.writeZipToFileSystem(formDest);

      // Write halffabrikaaten as well
      fs.writeFileSync(formDest + '/dump.json', JSON.stringify(form, null, 4));
      fs.writeFileSync(formDest + '/logic-dump.json', logicScannerContext.output.join('\n'));

    } catch (error) {
      messages.push(`Failed form conversion: ${formName} (${error})`);
      console.log(error);
    }

  }

  messages.forEach(x => console.log(x));
  console.log('Failed: ', messages.length);

  const time = Date.now() - start;
  console.log('Conversion took ', time/1000, 's');
}

//////////////////////////////////////////////////////////
// BELOW ARE FUNCTIONS TO APPLY TO THE FORM DEFINITIONS //
//////////////////////////////////////////////////////////

export function replaceSubform(input: any, context: FormDefinitionTransformerContext) {
  if (input?.type == 'form' && input?.form) {
    const key = input.form;
    const form = context.formDefinitionsExport?.forms?.[key];
    const components = form?.components;
    if (!form || !components) {
      throw Error(`Cannot find subform or components in subform for ${key}`);
    }
    const component = wrapInFieldSetComponent(components, input.label, input.key, input.id);
    return [{ ...component, originalFormName: key }];
  };
  // Do not modify this object
  return undefined;
}

export function convertContainers(input: any) {
  if (input?.type == 'container') {
    const components = input.components;
    if (!components) {
      throw Error(`Cannot replace container without components in ${input.key}`);
    }
    return [wrapInFieldSetComponent(components, input.label, input.key, input.id)];
  };
  // Do not modify this object
  return undefined;
}

export function removeHiddenFields(input: any) {
  if (input?.customClass
    && input.customClass.includes('hiddenfield')
    && !input.customClass.includes('nonhiddenfield')
  ) {
    // console.log('Found a hiddenfield, removing it', input.key);
    return [] as any[];
  };
  return undefined;
}

export function removeOverzichtsPannels(input: any) {
  if (input?.type == 'panel' && input?.title == 'Overzicht') {
    // console.log('Found a overzichts page, removing it', input.key);
    return [] as any[];
  };
  return undefined;
}

export function removeButtons(input: any) {
  if (input?.type == 'button') {
    // console.log('Found a button, removing it...');
    return [] as any[];
  };
  return undefined;
}

export function convertHtmlContent(input: any) {
  if (input?.label && input?.type == 'htmlelement') {

    // Check if it is a heading (h1 or h2) if so drop the element.
    // In formio we manually supply the title and subtitle

    const content = input.content?.trim();

    if (content?.startsWith('<h1>') && content?.endsWith('</h1>')) {
      return [];
    }
    if (content?.startsWith('<h2>') && content?.endsWith('</h2>')) {
      return [];
    }

    // console.log('Found htmlelement', input.label);
    const html = input.content;
    const type = 'content';
    return [{ ...input, html, type }];
  }
  return undefined;
}

export function addBrpPrefill(input: any) {

  // If field does not yet have prefill add it (otherwise openforms interface breaks)
  if (input?.type == 'textfield' && !input.prefill) {
    // console.log('Adding empty prefill');
    return [{ ...input, prefill: emptyPrefill }];
  }

  // For all Nonhiddenfields prefill add the corresponding BRP prefill config to its elements
  if (input?.type == 'fieldset' && input?.originalFormName?.includes('nonhiddenfields')) {
    const newComponents = input.components.map((component: any) => {
      const prefill = HaalCentraalMapping.getPrefillConfiguration(component);
      return { ...component, prefill };
    });
    // console.log('Adding actual prefill to former nonhiddenfields');
    return [{ ...input, components: newComponents }];
  };
  return undefined;
}

export function collectLogicRules(input: any, context: FormDefinitionTransformerContext) {
  if (input?.conditional?.show == true) {
    const logic = JSON.stringify(input.conditional);
    context.output.push(`${input.key} has conditional: ${logic}`);
  }
  if (input?.validate?.custom) {
    const logic = JSON.stringify(input?.validate);
    context.output.push(`${input.key} has custom validate: ${logic}`);
  }
  if (input?.customConditional) {
    const logic = JSON.stringify(input?.customConditional);
    context.output.push(`${input.key} as custom conditional: ${logic}`);
  }
  return undefined;
}