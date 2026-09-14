# Forms and inputs

- Build forms with FieldGroup and Field rather than raw spacing wrappers.
- Use FieldLabel, FieldDescription, FieldError, FieldSet, and FieldLegend for accessible structure.
- Inside InputGroup, use InputGroupInput or InputGroupTextarea; place buttons and icons in InputGroupAddon.
- Use ToggleGroup for compact option sets rather than mapping Buttons with manual selected state.
- Use Select for predefined options, Combobox for searchable options, Switch for settings booleans, Checkbox for form choices, RadioGroup for one-of-few choices, InputOTP for verification codes, and Textarea for multiline text.
- Put `data-invalid` or `data-disabled` on Field and the matching `aria-invalid` or `disabled` state on the control.
- Labels, descriptions, errors, keyboard interaction, focus behavior, and disabled states are required parts of the implementation.
