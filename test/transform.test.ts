import { readFileSync } from 'fs';
import { join } from 'path';
import { convertHtmlContent, replaceSubform } from '../src/convert';
import { FormDefinitionTransformer } from '../src/FromDefinitionTransformer';

describe('FormDefinitionTransformer', () => {

  const exportFile = readFileSync(join(__dirname, '../', 'testdata', '2024-10-05-ontwikkel.json'), { encoding: 'utf-8' });
  const formDefinitionsExport = JSON.parse(exportFile);

  test('Remove subforms', () => {
    const testform = formDefinitionsExport.forms.devops;
    new FormDefinitionTransformer(replaceSubform, { formDefinitionsExport: formDefinitionsExport }).transform(testform);
    expect(JSON.stringify(formDefinitionsExport)).not.toMatch('"key": "nonhiddenfields');
  });

  test('Convert htmlelements', () => {
    const testform = formDefinitionsExport.forms.individueleInkomenstoeslagAanvragen2;
    new FormDefinitionTransformer(convertHtmlContent, { formDefinitionsExport: formDefinitionsExport }).transform(testform);
    expect(JSON.stringify(testform)).not.toMatch('htmlelement');
  });

  test('Missing titles?', () => {
    console.log();
    for (const formName of Object.keys(formDefinitionsExport.forms)) {
      const form = formDefinitionsExport.forms[formName];
      if (!form.title) {
        console.log(form.label);
      }
    }
  });

});