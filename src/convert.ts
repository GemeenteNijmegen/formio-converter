import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { join } from 'path';
import slugify from 'slugify';
import { FormDefinitionParser } from './FormDefinitionParser';
import { FormDefinitionTransformer, FormDefinitionTransformerContext } from './FromDefinitionTransformer';
import { OpenFormulierenFormDefinition } from './OpenFormulierenFormDefinition';
import { wrapInFieldSetComponent } from './wrapInContainerComponent';

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

      // Create a form definition for export
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
        translations: { // Not in original conversion but over time the prop seems to be have moved to here
          nl: {
            name: component.title,
          },
        },
      };
      formDefinitions.push(formDefinition);

      // Create a form step for export
      const stepuuid = randomUUID();
      const step = {
        name: component.title,
        uuid: stepuuid,
        index: parseInt(i),
        slug: slugify(component.title, { strict: true, lower: true }),
        form_definition: `http://localhost/api/v2/form-definitions/${uuid}`,
        url: `http://localhost/api/v2/forms/${uuid}/steps/${stepuuid}`,
      };
      steps.push(step);

    }

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
    const openFormsDefinition = new OpenFormulierenFormDefinition(formDefinitions, forms, steps, parser.allMetadata);

    return openFormsDefinition;

  } catch (error) {
    console.error(error);
    throw Error(`issue converting formdefinition: ${error}`);
  }
}


export async function convertFullFormDefinition(source: string, destination?: string, options?: any) {
  console.log('Converting:', source, destination, options);

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

  const contentTransformer = new FormDefinitionTransformer(convertHtmlContent, context);
  const overzichtsTransformer = new FormDefinitionTransformer(removeOverzichtsPannels, context);
  const buttonTransformer = new FormDefinitionTransformer(removeButtons, context);
  const containerTransformer = new FormDefinitionTransformer(convertContainers, context);
  const defaultErrorTextTransformer = new FormDefinitionTransformer(addDefaultRequiredErrorText, context);

  // For each form do a couple of steps
  const messages: string[] = [];
  const foundSubforms: string[] = [];

  for (const formName of Object.keys(json.forms)) {

    try {
      console.log('Processing form: ', formName);
      const form = json.forms[formName];

      // Step 0. Replace all subforms in the form definition tree with some text that explains there was a subform there
      const subformTransformerContext = { formDefinitionsExport: json, output: [] };
      const subformTransformer = new FormDefinitionTransformer(replaceSubforms, subformTransformerContext);
      subformTransformer.transform(form);
      foundSubforms.push(...subformTransformerContext.output);

      // Step 1. Replace all containers with fieldsets
      containerTransformer.transform(form);

      // Step 2. Remove hiddenfields (not important in OpenForms)
      const hiddenFieldsContext = { formDefinitionsExport: json, output: [] };
      const hiddenfieldsTransformer = new FormDefinitionTransformer(removeHiddenFields, hiddenFieldsContext);
      hiddenfieldsTransformer.transform(form);

      // Step 3. Remove overzichts pages
      overzichtsTransformer.transform(form);

      // Step 4. Fix HTML elements (as they do not work in OpenForms in the same way)
      contentTransformer.transform(form);

      // Step 6. Remove all buttons (provided by OpenForms now)
      buttonTransformer.transform(form);

      // Step 6b. Add default error text
      defaultErrorTextTransformer.transform(form);

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
      fs.writeFileSync(formDest + '/prefill-dump.json', hiddenFieldsContext.output.join('\n'));

    } catch (error) {
      messages.push(`Failed form conversion: ${formName} (${error})`);
      console.log(error);
    }

  }

  // Log unique found subforms
  const uniqueFoundSubforms = foundSubforms.filter((v, i, self) => self.findIndex(x => x == v) === i);
  messages.push(`During conversion we've found the subforms: ${JSON.stringify(uniqueFoundSubforms)}`);

  // Log the messages
  messages.forEach(x => console.log(x));
  console.log('Failed: ', messages.length);

  // Log time information
  const time = Date.now() - start;
  console.log('Conversion took ', time / 1000, 's');
}

//////////////////////////////////////////////////////////
// BELOW ARE FUNCTIONS TO APPLY TO THE FORM DEFINITIONS //
//////////////////////////////////////////////////////////

export function replaceSubforms(input: any, context: FormDefinitionTransformerContext) {
  if (input?.type == 'form' && input?.form) {
    const key = input.form;
    context.output.push(key);

    const tempelement = {
      html: `<p>Hier stond een ${key} embedded form</p>`,
      label: `Content ${key}`,
      refreshOnChange: false,
      key: `content-${key}`,
      type: 'content',
      input: false,
      tableView: false,
    };
    return [tempelement]; // Replace subform with the content element
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


export function addDefaultRequiredErrorText(input: any) {
  const types = [
    'textfield',
    'radio',
    'textarea',
    'selectboxes',
    'checkbox',
    'select',
    'currency',
    'number',
    'postcode',
    'phoneNumber',
    'time',
    'datetime',
    'date',
    'email',
    'iban',
    'licenseplate',
    'bsn',
  ];

  const translatedErrors = {
    translatedErrors: {
      en: {
        maxLength: '',
        pattern: '',
        required: 'Fill out.',
      },
      nl: {
        maxLength: '',
        pattern: '',
        required: 'Geef een antwoord.',
      },
    },
  };

  if (input?.type && types.includes(input.type)) {
    console.log();
    return [{
      ...input,
      ...translatedErrors,
    }];
  };

  // Do not modify this object
  return undefined;
}


export function removeHiddenFields(input: any, context: FormDefinitionTransformerContext) {
  if (input?.customClass
    && input.customClass.includes('hiddenfield')
    && !input.customClass.includes('nonhiddenfield')
  ) {
    // console.log('Found a hiddenfield, removing it', input.key);
    context.output.push(`${input.key} has classes: ${input.customClass}`);
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

export function collectLogicRules(input: any, context: FormDefinitionTransformerContext) {

  if (input?.validate?.custom) {
    const logic = JSON.stringify(input?.validate);
    context.output.push(`${input.key} has custom validate: ${logic}`);
  }
  if (input?.customConditional) {
    const logic = JSON.stringify(input?.customConditional);
    context.output.push(`${input.key} as custom conditional: ${logic}`);
  }

  if (input?.conditional?.show == true) {
    const logic = JSON.stringify(input.conditional);
    context.output.push(`${input.key} has conditional: ${logic}`);
    return [{ ...input, conditional: undefined }]; // Remove the conditional
  }
  if (input?.customConditional) {
    const logic = JSON.stringify(input.conditional);
    context.output.push(`${input.key} has conditional: ${logic}`);
    return [{ ...input, customConditional: undefined }]; // Remove the customConditional
  }

  return undefined;
}