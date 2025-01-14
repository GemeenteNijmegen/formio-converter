import { typescript } from 'projen';
const project = new typescript.TypeScriptProject({
  defaultReleaseBranch: 'main',
  name: 'formio-converter',
  projenrcTs: true,
  deps: [
    'commander',
    'slugify',
    'archiver',
    '@types/archiver',
    'object-hash',
    '@types/object-hash',
  ],
  gitignore: [
    'test/_outputs',
    'testdata',
  ],
  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();