import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { convert } from '../src/convert';

describe('Test conversion', () => {

  test('sample file', async () => {
    const input = join(__dirname, 'sampleformdefinition.json');
    const output = join(__dirname, 'testoutputs');
    if (!existsSync(output)) {
      mkdirSync(output);
    }
    await convert(input, output);
    expect(existsSync(join(output, 'test.zip'))).toBeTruthy();
  });

});