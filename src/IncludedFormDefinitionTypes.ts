/**
   * All types in the form definition components that have useful content in form data that will be processed
   * For example: button conditionals are also found in the data of a form like "vorige1": false
   * These form data types contain information useful to an person looking at the request for processing
   */
export const includedFormDataTypes = [
  'textfield_nijmegen',
  'textfield',
  'textarea',
  'textarea_nijmegen',
  'radio',
  'radio_nijmegen',
  'email',
  'email_nijmegen',
  'checkboxnijmegen',
  'selectboxes_nijmegen',
  'select_nijmegen',
  'datetime_nijmegen',
  'time_nijmegen',
  'form', // Include nested forms for a post processing step
];