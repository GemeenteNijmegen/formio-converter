import { Command } from 'commander';
import { convert } from './convert';

const program = new Command();

program
  .command('convert <source> [destination]')
  .description('Convert a form.io form definition to an open forms export file')
  .action(convert);

program.parse();

