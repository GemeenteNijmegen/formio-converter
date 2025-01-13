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
  ],
  gitignore: [
    'test/testoutputs/*',
  ],

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();