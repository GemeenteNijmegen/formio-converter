import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { convert } from '../src/convert';

describe('Test conversion', () => {

  test('sample file', async () => {
    const input = join(__dirname, 'sampleformdefinition.json');
    const output = join(__dirname, '_outputs', 'test-' + Date.now().toString());
    if (!existsSync(output)) {
      mkdirSync(output, { recursive: true });
    }
    await convert(input, output);

    //stuff still is happening with the archive here... Idk how to solve that.
    await delay(2000);

    expect(existsSync(join(output, 'test.zip'))).toBeTruthy();

  }, 6000);

});

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}