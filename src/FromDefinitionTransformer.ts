import objectHash from 'object-hash';

type Modifier = (input: any, context: FormDefinitionTransformerContext) => any[] | undefined

export interface FormDefinitionTransformerContext {
  formDefinitionsExport: any;
  output: any[];
}

export class FormDefinitionTransformer {

  isNestedInDataGrid: boolean = false;
  private parentKey: string | undefined = undefined;
  private parent: any[] = [];
  private modifier: Modifier;
  private context: FormDefinitionTransformerContext;

  constructor(modifier: Modifier, context: FormDefinitionTransformerContext) {
    this.modifier = modifier;
    this.context = context;
  }

  /**
   * Run the transform function on the input object
   * Note: modifies the input object
   * @param definitionObject
   * @param path
   * @param listIndex
   * @returns
   */
  transform(definitionObject: any, path = '', listItemId?: string) {

    // Skip primitive values
    if (
      typeof definitionObject === 'string'
      || typeof definitionObject === 'number'
      || typeof definitionObject === 'boolean'
      || definitionObject == null
    ) {
      return;
    }

    // If array traverse all elements individually
    // Note as we might modify the array we need to keep track of the previous element ID
    if (Array.isArray(definitionObject)) {
      this.parent.push(definitionObject); // Push a reference to the list we are traversing right now

      // Loop based on ID (for modifying the list while looping)
      const hashes = definitionObject.map(x => objectHash(x));
      hashes.forEach(hash => {
        const index = definitionObject.findIndex(x => objectHash(x) == hash);
        const item = definitionObject[index];
        if (typeof item === 'object') {
          this.transform(item, `${path}[${index}]`, hash);
        }
      });

      this.parent.pop(); // Remove the reference as we are done traversing the list
      return;
    }

    // Check if we want to modify the object, (e.g. items is not undefined)
    const items = this.modifier(definitionObject, this.context);

    // Replace this item with the new item(s)
    if (items) {

      const parentObject = this.parent[this.parent.length-1];
      if (listItemId == undefined) {
        throw Error('Expected parent element of a form component to be an array');
      }

      // Find the index of the object currently under consideration
      const listIndex = parentObject.findIndex((x:any) => objectHash(x) == listItemId);
      // console.log('Items returned modifying current list', parentObject.length, listItemId, listIndex, items.length);
      if (items.length == 0) {
        parentObject.splice(listIndex, 1);
      } else {
        parentObject.splice(listIndex, 1, ...items);
      }
    }

    // HANDLE RECURSION
    // Traverse nested objects using a loop for generic handling
    for (const childKey in definitionObject) {
      // Traverse the childobject if it is an object
      if (typeof definitionObject[childKey] === 'object') {

        // Set isNestedInDataGrid flag if entering a datagrid
        if (definitionObject.type === 'datagrid') {
          this.isNestedInDataGrid = true;
        }

        // Container types without the key(name) container have properties that are included in forms nested in the parent
        if (definitionObject.type === 'container' && definitionObject.key !== 'container') {
          this.parentKey = !!this.parentKey ? `${this.parentKey}.${definitionObject.key}` : definitionObject.key;
        }

        // Process child object
        this.transform(definitionObject[childKey], `${path}.${childKey}`);

        // Reset isNestedInDataGrid flag if exiting the childobject of a datagrid type
        if (definitionObject.type === 'datagrid') {
          this.isNestedInDataGrid = false;
        }
        // Reset parentkey if exiting the child object of a container without key(name) container
        if (definitionObject.type === 'container' && definitionObject.key !== 'container') {
          this.parentKey = undefined;
        }
      }

    }
  }

}