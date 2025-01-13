import { includedFormDataTypes } from './IncludedFormDefinitionTypes';


export type FormDefinitionComponents = {
  key: string; // Only the key of the object
  keyPath: string; // The entire path to the object
  label?: string; // Optional label property
  type: string; // Type of the form object like textfield, content or html_element
  inDataGrid: boolean; // Indicates if nested in a datagrid
  parentKey?: string;
};

export interface ParsedFormDefinition {
  name: string;
  title: string;
  created: string;
  modified: string;
  formType: 'wizard' | string;
  includedFormDefinitionComponents: FormDefinitionComponents[];
}
/**
 * This class parses a form definition object and extracts relevant information
 * for further processing. It provides methods to access both the parsed
 * form components and the overall form metadata.
 */
export class FormDefinitionParser {

  /**
   * The raw form definition object provided to the constructor.
   */
  private formDefinitionObject: any;

  /**
  * An array containing all parsed form components with details about
  * their key, key path, label, type, nesting within datagrids, and parent key.
  */
  private allParsedFormDefinitionComponents: FormDefinitionComponents[] = [];

  /**
  * Extracted metadata from the form definition, including form name, title,
  * creation date, and modification date.
  */
  private formName: string = '';
  private formTitle: string = '';
  private formType: string = '';
  private createdDate: string = '';
  private modifiedDate: string = '';

  /**
  * Creates a new FormDefinitionParser instance with the provided form definition object.
  * @param {any} formDefinitionObject - The form definition object to be parsed.
  */
  constructor(formDefinitionObject: any) {
    this.formDefinitionObject = formDefinitionObject;
    this.allParsedFormDefinitionComponents = this.extractFormDefinitionComponents();
    this.setFormMetaData();
  }

  /**
   * Returns all parsed form components as an array of objects.
   * @returns {FormDefinitionComponents[]} - An array containing information about all form components.
   */
  getAllFormDefinitionComponents(): FormDefinitionComponents[] {
    return this.allParsedFormDefinitionComponents;
  }
  getIncludedFormDefinitionComponents(): FormDefinitionComponents[] {
    return this.allParsedFormDefinitionComponents.filter(component =>
      includedFormDataTypes.includes(component.type),
    );
  }
  getParsedFormDefinition(): ParsedFormDefinition {
    return {
      name: this.formName,
      title: this.formTitle,
      created: this.createdDate,
      modified: this.modifiedDate,
      formType: this.formType,
      includedFormDefinitionComponents: this.getIncludedFormDefinitionComponents(),
    };
  }
  /**
   * For development and debug purposes
   * Provides an overview of all form component types encountered during parsing.
   * This includes all types (included and excluded), excluded types, and included types.
   * @returns {{allTypes: string[], includedTypes: string[], excludedTypes: string[]}} - An object containing information about form component types.
   */
  getFormDefinitionTypeOverview(): {
    allTypes: string[];
    includedTypes: string[];
    excludedTypes: string[];
  } {
    const allTypes = new Set<string>();
    this.allParsedFormDefinitionComponents.forEach(component => allTypes.add(component.type));
    const allTypesArray = Array.from(allTypes);
    const includedTypes = allTypesArray.filter(type => includedFormDataTypes.includes(type));
    const excludedTypes = allTypesArray.filter(type => !includedTypes.includes(type));

    return { allTypes: allTypesArray, includedTypes, excludedTypes };
  }

  /**
   * Validates the presence of required metadata keys in the form definition object
   * and throws an error if any are missing.
   */
  setFormMetaData() {
    const REQUIRED_METADATA_KEYS = ['name', 'title', 'created', 'modified', 'type'];
    const missingKeys = REQUIRED_METADATA_KEYS.filter(
      key => !this.formDefinitionObject.hasOwnProperty(key) || this.formDefinitionObject[key] === undefined,
    );
    if (missingKeys.length > 0) {
      throw new Error(
        `Parsing Form Definition failed. Missing required metadata keys: ${missingKeys.join(', ')}`,
      );
    }
    const { name, title, created, modified, type } = this.formDefinitionObject;

    this.formName = name;
    this.formTitle = title;
    this.createdDate = created;
    this.modifiedDate = modified;
    this.formType = type;
  };


  /**
   * A getter for all extracted metadata as a single object.
   * @returns {{formName: string, formTitle: string, createdDate: string, modifiedDate: string}} - An object containing all form metadata.
   */
  get allMetadata(): { formName: string; formTitle: string; createdDate: string; modifiedDate: string } {
    return {
      formName: this.formName,
      formTitle: this.formTitle,
      createdDate: this.createdDate,
      modifiedDate: this.modifiedDate,
    };
  }

  /**
    * Checks the entire form definition object including nested objects and arrays
    * For each object with a key and type it sets an object in the results array
    * The goal is to extract all form components
    */
  extractFormDefinitionComponents(): FormDefinitionComponents[] {
    const results: FormDefinitionComponents[] = [];
    let isNestedInDataGrid = false; // Flag to track datagrid nesting because the objects can be the same. In the form it looks like "Nog een toevoegen"
    let parentKey: string | undefined = undefined; // Track the parent container name for the next traverses. Makes it possible to see the form components that are nested. In the form it might look like  "stadsdeelVolwassen": { "stadsdeel": "Nijmegen-Midden & Zuid" } parentkey is stadsDeelVolwassen in this case

    function traverse(definitionObject: any, path = '') {
      if (typeof definitionObject === 'string' || typeof definitionObject === 'number' || typeof definitionObject === 'boolean') {
        return; // Skip primitive values
      }

      if (Array.isArray(definitionObject)) {
        definitionObject.forEach((item, index) => {
          if (typeof item === 'object') {
            traverse(item, `${path}[${index}]`);
          }
        });
      } else {
        // Check if key and type properties exist before adding to results
        if (definitionObject?.key && definitionObject?.type) {
          const key = definitionObject.key; // Extract the key
          const keyPath = `${path}.${key}`; // Construct the keyPath

          results.push({
            key,
            keyPath,
            label: definitionObject.label || '',
            type: definitionObject.type,
            inDataGrid: isNestedInDataGrid, // Set inDataGrid flag
            parentKey: parentKey,
          });
        }

        // Traverse nested objects using a loop for generic handling
        for (const childKey in definitionObject) {
          // Traverse the childobject if it is an object
          if (typeof definitionObject[childKey] === 'object') {

            // Set isNestedInDataGrid flag if entering a datagrid
            if (definitionObject.type === 'datagrid') {
              isNestedInDataGrid = true;
            }
            // Container types without the key(name) container have properties that are included in forms nested in the parent
            if (definitionObject.type === 'container' && definitionObject.key !== 'container') {
              parentKey = !!parentKey ? `${parentKey}.${definitionObject.key}` : definitionObject.key;
            }

            // Process child object
            traverse(definitionObject[childKey], `${path}.${childKey}`);

            // Reset isNestedInDataGrid flag if exiting the childobject of a datagrid type
            if (definitionObject.type === 'datagrid') {
              isNestedInDataGrid = false;
            }
            // Reset parentkey if exiting the child object of a container without key(name) container
            if (definitionObject.type === 'container' && definitionObject.key !== 'container') {
              parentKey = undefined;
            }
          }
        }
      }
    }

    traverse(this.formDefinitionObject);
    return results;
  }
}
