export class UtopiaSchemaField extends foundry.data.fields.SchemaField {
  // TODO: Replace this whole-ass thing with a "Widget" 

  toFormGroup(groupConfig, inputConfig) {
    console.warn(this);
    console.warn(groupConfig, inputConfig);
    let columns = 5;
    if (!isNaN(parseFloat(groupConfig.columns))) {
      columns = parseFloat(groupConfig.columns)
    }
    else if (!isNaN(parseFloat(inputConfig.columns))) {
      columns = parseFloat(inputConfig.columns)
    }

    const group = document.createElement("div");
    group.classList.add("schema", ...inputConfig.customClasses ?? []);

    // Label element
    const lbl = document.createElement("label");
    lbl.innerText = groupConfig.localize ? game.i18n.localize(this.label) : this.label;
    if ( groupConfig.labelFor ) lbl.setAttribute("for", labelFor);
    if ( groupConfig.units ) lbl.insertAdjacentHTML("beforeend", ` <span class="units">(${game.i18n.localize(units)})</span>`);
    group.prepend(lbl);

    const container = document.createElement("div");
    container.classList.add("schema-inputs");
    container.dataset.field = this.name;
    container.dataset.type = this.constructor.name;
    container.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    container.style.gap = "5px";
    
    for (const [key, field] of Object.entries(this.fields)) {
      const value = inputConfig.value[key];
      if (field.choices) inputConfig.options = Object.entries(field.choices).map(([key, value]) => {
        return {
          ...value,
          value: key,
        };
      });
      else inputConfig.options = undefined;
      const input = field.toFormGroup({ ...groupConfig }, { ...inputConfig, value: value, parentName: field.constructor.name === "SchemaArrayField" ? this.name : undefined });
      input.classList.add("schema-input");
      container.append(input);
    }

    group.append(container);
    
    // Hint element
    if ( this.hint ) {
      const h = document.createElement("p");
      h.className = "hint";
      h.innerText = groupConfig.localize ? game.i18n.localize(this.hint) : this.hint;
      h.style.flex = "1 1"
      group.append(h);
    }

    return group;
  }
}