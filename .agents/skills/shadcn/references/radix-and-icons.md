# Radix and icon rules

The template base is fixed to Radix and the icon library is fixed to Lucide.

- Use Radix `asChild` composition for custom triggers and links. Do not use Base UI `render` or `nativeButton` props.
- Radix Select uses inline SelectItem values and `SelectValue placeholder`; keep SelectItem inside SelectGroup.
- Radix ToggleGroup uses `type="single"` or `type="multiple"`, with string values for single selection.
- Radix Slider values are arrays, including a single-thumb slider.
- Radix Accordion uses `type="single"` or `type="multiple"`; use `collapsible` only where supported.
- Import icons from `lucide-react` and pass icon components, not string lookup keys.
- Icons inside Button and other shadcn components should not carry manual sizing classes unless the user explicitly requests a different size.
- Button icons use `data-icon="inline-start"` or `data-icon="inline-end"`.
