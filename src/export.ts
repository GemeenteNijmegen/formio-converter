import { Command } from 'commander';
import { convertFullFormDefinition } from './convert';

const program = new Command();

program
  .command('convert <source> [destination]')
  .option('--convert-prefill', 'experimental feature add prefill configuration to hiddenfieldsform elements', false)
  .description('Convert a form.io export to a set of open forms importable zips')
  .action(convertFullFormDefinition);

program.parse();

