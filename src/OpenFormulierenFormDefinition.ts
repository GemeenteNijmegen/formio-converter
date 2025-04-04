import * as fs from 'fs';
import * as path from 'path';
import slugify from 'slugify';
import { createArchive } from './createArchive';

export class OpenFormulierenFormDefinition {
  readonly definitions: any[];
  readonly forms: any[];
  readonly steps: any[];
  readonly metadata: any;
  constructor(definitions: any[], forms: any[], steps: any[], metadata: any) {
    this.definitions = definitions;
    this.forms = forms;
    this.steps = steps;
    this.metadata = metadata;
  }
  writeToFileSystem(destination: string) {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination);
    }
    const dest = destination.endsWith('/') ? destination : destination + '/';
    fs.writeFileSync(path.join(dest, 'forms.json'), JSON.stringify(this.forms, null, 4));
    fs.writeFileSync(path.join(dest, 'formDefinitions.json'), JSON.stringify(this.definitions, null, 4));
    fs.writeFileSync(path.join(dest, 'formSteps.json'), JSON.stringify(this.steps, null, 4));
  }
  async writeZipToFileSystem(destination: string) {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination);
    }
    const archive = createArchive(destination, this.metadata.formName ?? 'unknownformname');
    archive.append(JSON.stringify(this.forms, null, 4), { name: 'forms.json' });
    archive.append(JSON.stringify(this.definitions, null, 4), { name: 'formDefinitions.json' });
    archive.append(JSON.stringify(this.steps, null, 4), { name: 'formSteps.json' });
    await archive.finalize();
  }

  addStep(title: string, formuuid: string, stepuuid: string) {
    const index = this.steps.length ?? 0;
    const step = {
      uuid: stepuuid,
      index: index + 1, // Append to end because we dont know where to place it yet
      slug: slugify(title, { strict: true, lower: true }),
      form_definition: `http://localhost/api/v2/form-definitions/${formuuid}`,
      url: `http://localhost/api/v2/forms/${formuuid}/steps/${stepuuid}`,
    };
    this.steps.push(step);
  }
}