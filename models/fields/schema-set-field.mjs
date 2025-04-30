export class SchemaArrayField extends foundry.data.fields.ArrayField {
  /** @override */
  _toInput(config, parentName = undefined) {
    console.log(this);

    const e = this.element;

    // Schema Fields
    if ( e instanceof foundry.data.fields.SchemaField ) {
      const container = document.createElement("div");
      container.classList.add("schema-set");

      const inputContainer = document.createElement("div");
      inputContainer.classList.add("schema-set-inputs");
      inputContainer.style.gap = "5px";

      const inputs = [];

      for (const [key, field] of Object.entries(e.fields)) {
        const individualInputContainer = document.createElement("div");
        const lbl = document.createElement("label");
        lbl.innerText = game.i18n.localize(field.label);
        individualInputContainer.prepend(lbl);

        const inputConfig = { ...config };
        if (field.choices) inputConfig.choices = field.choices;
        if (field.options.options) inputConfig.options = Object.values(field.options.options);
        inputConfig.value = config.value.map(v => v[key]);
        const input = field._toInput(inputConfig);
        input.classList.add("schema-set-input");
        input.dataset.field = key;
        input.defaultChecked = false;
        if (input.type === "text") 
          input.setAttribute("value", "");
        if (input.type === "checkbox") 
          input.checked = false;
        input.name = undefined;
        input.style.flex = "1 0 49%";
        individualInputContainer.append(input);

        inputs.push(individualInputContainer);
      }

      inputContainer.append(...inputs);

      const button = document.createElement("button");
      button.textContent = game.i18n.localize("Add");
      button.type = "button";
      button.dataset.action = "schemaSetAdd";
      
      inputContainer.append(button);
      if (config.parentName) inputContainer.dataset.name = `${config.parentName}.${this.name}`;
      else inputContainer.dataset.name = this.name;

      container.append(inputContainer);
      
      const tagContainer = document.createElement("div");
      tagContainer.classList.add(["tags"]);
      tagContainer.style.gap = "5px";

      const tags = [];
      for (const value of config.value) {
        const tag = document.createElement("div");
        tag.dataset.name = this.name;
        tag.classList.add("tag");
        let content = "";
        for (const [key, field] of Object.entries(e.fields)) {
          content += `${value[key]}, `;
        }
        content = content.slice(0, -2);
        tag.textContent = content;

        const tagDelete = document.createElement("a");
        tagDelete.classList.add("fa-fw", "fas", "fa-xmark");
        tagDelete.dataset.action = "schemaSetRemove";
        tagDelete.dataset.value = content;
        
        tag.append(tagDelete);
        tags.push(tag);
      }

      tagContainer.append(...tags);

      container.append(tagContainer);

      return container;
    }

    else {
      return super._toInput(config);
    }
  }
}