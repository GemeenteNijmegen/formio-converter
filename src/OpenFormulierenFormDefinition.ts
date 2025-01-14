import * as fs from 'fs';
import * as path from 'path';
import { createArchive } from './createArchive';

export class OpenFormulierenFormDefinition {
  readonly definitions: string;
  readonly forms: string;
  readonly steps: string;
  readonly metadata: any;
  constructor(definitions: string, forms: string, steps: string, metadata: any) {
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
    fs.writeFileSync(path.join(dest, 'forms.json'), this.forms);
    fs.writeFileSync(path.join(dest, 'formDefinitions.json'), this.definitions);
    fs.writeFileSync(path.join(dest, 'formSteps.json'), this.steps);
  }
  async writeZipToFileSystem(destination: string) {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination);
    }
    const archive = createArchive(destination, this.metadata.formName ?? 'unknownformname');
    archive.append(this.forms, { name: 'forms.json' });
    archive.append(this.definitions, { name: 'formDefinitions.json' });
    archive.append(this.steps, { name: 'formSteps.json' });
    await archive.finalize();
  }
}