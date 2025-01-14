import { readFileSync } from 'fs';
import { join } from 'path';
import { convertHtmlContent, removeSubform } from '../src/convert';
import { FormDefinitionTransformer } from '../src/FromDefinitionTransformer';

describe('FormDefinitionTransformer', () => {

  test('Remove subforms', () => {
    const form = readFileSync(join(__dirname, 'sampleformdefinition.json'), { encoding: 'utf-8' });
    const jsonForm = JSON.parse(form);
    new FormDefinitionTransformer(removeSubform).transform(jsonForm);
    expect(JSON.stringify(jsonForm)).not.toMatch('"key": "nonhiddenfields');
  });

  test('Convert htmlelements', () => {
    const form = readFileSync(join(__dirname, 'sampleformdefinition.json'), { encoding: 'utf-8' });
    const jsonForm = JSON.parse(form);
    new FormDefinitionTransformer(convertHtmlContent).transform(jsonForm);
    expect(JSON.stringify(jsonForm)).not.toMatch('htmlelement');
  });

});