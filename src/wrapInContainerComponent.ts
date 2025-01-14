

export function wrapInFieldSetComponent(components: any[], label: string, key: string, id: string) {
  return {
    id: id,
    components: components,
    key: key,
    type: 'fieldset',
    label: label,
    tree: false,
    input: false,
    hidden: false,
    legend: '',
    prefix: '',
    suffix: '',
    unique: false,
    widget: null,
    dbIndex: false,
    overlay: {
      top: '',
      left: '',
      style: '',
      width: '',
      height: '',
    },
    tooltip: '',
    disabled: false,
    multiple: false,
    redrawOn: '',
    tabindex: '',
    validate: {
      custom: '',
      unique: false,
      multiple: false,
      required: false,
      customPrivate: false,
      strictDateValidation: false,
    },
    autofocus: false,
    encrypted: false,
    hideLabel: false,
    modalEdit: false,
    protected: false,
    refreshOn: '',
    tableView: false,
    attributes: {},

    errorLabel: '',
    hideHeader: false,
    persistent: false,
    properties: {},
    validateOn: 'change',
    clearOnHide: true,
    conditional: {
      eq: '',
      show: null,
      when: null,
    },
    customClass: '',
    description: '',
    placeholder: '',
    defaultValue: null,
    dataGridLabel: false,
    labelPosition: 'top',
    showCharCount: false,
    showWordCount: false,
    calculateValue: '',
    calculateServer: false,
    allowMultipleMasks: false,
    customDefaultValue: '',
    allowCalculateOverride: false,
  };
}