import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { FormDefinitionParser } from './FormDefinitionParser';
import { Command } from 'commander';
import  slugify from 'slugify';
import archiver = require('archiver');

const program = new Command();

program
  .command('convert <source> [destination]')
  .description('Convert a form.io form definition to an open forms export file')
  .action(convert);

function createArchive(destination: string, filename) {
  // create a file to stream archive data to.
  const output = fs.createWriteStream(path.join(destination, `${filename}.zip`));
  const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
  });

  // listen for all archive data to be written
  // 'close' event is fired only when a file descriptor is involved
  output.on('close', function() {
    console.log(archive.pointer() + ' total bytes');
    console.log('archiver has been finalized and the output file descriptor has closed.');
  });

  // This event is fired when the data source is drained no matter what was the data source.
  // It is not part of this library but rather from the NodeJS Stream API.
  // @see: https://nodejs.org/api/stream.html#stream_event_end
  output.on('end', function() {
    console.log('Data has been drained');
  });

  // good practice to catch warnings (ie stat failures and other non-blocking errors)
  archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
      // log warning
    } else {
      // throw error
      throw err;
    }
  });

  // good practice to catch this error explicitly
  archive.on('error', function(err) {
    throw err;
  });

  // pipe archive data to the file
  archive.pipe(output);
  return archive;
}



function removeDuplicateKeys(json: any, step) {
  const parser = new FormDefinitionParser(json);
  const keys = parser.getAllFormDefinitionComponents().map(component => component.key);
  console.debug('removing duplicates');
  let replaceKeys = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (keys.includes(key, i + 1)) {
      const firstComponent = parser.getAllFormDefinitionComponents().find(component => component.key == key);
      console.log('duplicate key', key, `$${firstComponent.keyPath}`);
      replaceKeys.push(key);
    }
  }
  for(let key of replaceKeys) {
    console.debug('replacing key', key);
    json = JSON.parse(JSON.stringify(json).replace(`"key":"${key}"`, `"key":"${key}-${step}"`)); // I'm very sorry
  }
  if(replaceKeys.length > 0) { 
    json = removeDuplicateKeys(json, step+1);
  }
  return json;
}

function convert(source: string, destination?: string) {
  const hideConditionals = true;
  console.log(source, destination);
  try { 
    let raw = fs.readFileSync(source).toString('utf-8');
    raw = raw.replaceAll('_nijmegen', '');
    let json = JSON.parse(raw);
    const parser = new FormDefinitionParser(json);
    if(json.display == 'wizard') {
      console.log('Form is a wizard 🧙, create multistep export');
      const panels = parser.getAllFormDefinitionComponents().filter(component => component.type == 'panel');
      json = removeDuplicateKeys(json, 1);
      let steps = [];
      let formDefinitions = [];
      for(let i = 0; i < panels.length; i++) {
        const uuid = randomUUID();
        const formDefinition = {
          url: `http://example.com/api/v2/form-definitions/${uuid}`,
          uuid,
          name: json.components[i].title.slice(0, 49),
          slug: slugify(json.components[i].title, { strict: true, lower: true }),
          configuration: {
            display: 'form',
            components: json.components[i].components.map((component: any) => { return { ...component, conditional: undefined } }),
          }
        };
        const step = {
          uuid: randomUUID(),
          index: i,
          slug: slugify(json.components[i].title, { strict: true, lower: true }),
          form_definition: `http://example.com/api/v2/form-definitions/${uuid}`,
        };
        formDefinitions.push(formDefinition);
        steps.push(step);
      };
      const formUuid = randomUUID();
      const forms = [
        {
          uuid: formUuid,
          name: parser.allMetadata.formTitle.slice(0, 49),
          internal_name: "",
          login_required: false,
          authentication_backends: [],
          slug: slugify(parser.allMetadata.formName.slice(0, 49), { strict: true, lower: true }),
          url: `http://example.com/api/v2/forms/${formUuid}`,
          show_progress_indicator: true,
          maintenance_mode: false,
          active: true,
          is_deleted: false,
          suspension_allowed: true,
          send_confirmation_email: true,
          display_main_website_link: true,
          required_fields_with_asterisk: true,
          resume_link_lifetime: 7,
          hide_non_applicable_steps: true
        }
      ];
      destination = destination ?? '.';
      
      if(!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
      } else if(!fs.lstatSync(destination).isDirectory()) {
        throw Error('Destination exists, but is not a directory');
      }
      const formsString = JSON.stringify(forms,null,4)
      const formDefinitionsString = JSON.stringify(formDefinitions,null,4)
      const stepsString = JSON.stringify(steps,null,4)
      
      fs.writeFileSync(path.join(destination, 'forms.json'), formsString);
      fs.writeFileSync(path.join(destination, 'formDefinitions.json'), formDefinitionsString);
      fs.writeFileSync(path.join(destination, 'formSteps.json'), stepsString);
      const archive = createArchive(destination, parser.allMetadata.formName);
      archive.append(fs.createReadStream(path.join(destination, 'forms.json')), { name: 'forms.json' });
      archive.append(fs.createReadStream(path.join(destination, 'formDefinitions.json')), { name: 'formDefinitions.json' });
      archive.append(fs.createReadStream(path.join(destination, 'formSteps.json')), { name: 'formSteps.json' });
      archive.finalize();
    }
  } catch(error) {
    console.log('issue reading input file.');
  }
}

program.parse();

