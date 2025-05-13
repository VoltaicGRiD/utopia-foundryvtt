const fields = foundry.applications.fields;

const selectInput = fields.createSelectInput({
  options: [
    {
      label: "Block Rating",
      value: "block",
    },
    {
      label: "Dodge Rating",
      value: "dodge",
    },
  ],
});

const validateChoice = (choice) => {
  const effects = actor.effects.filter((e) => {
    e.origin === scope.item.uuid;
  });

  for (const effect of effects) {
    for (const change of effect.changes) {
      if (change.key.includes(choice)) return false;
    }
  }

  return true;
};

const selectGroup = fields.createFormGroup({
  input: selectInput,
  label: "UTOPIA.Macros.FIELDS.select.label",
  hint: "UTOPIA.Macros.FIELDS.select.hint",
  localize: true,
});

const content = `${selectGroup.outerHTML}`;

const callback = async (event, button, dialog) => {
  const value = dialog.querySelector("select").selectedOptions[0].value;
  const actor = actor;

  const effect = await ActiveEffect.create({
    name: "Reflexive",
    origin: scope.item.uuid,
    type: "passive",
    changes: [
      {
        key: `system.${value}.quantity`,
        mode: 2,
        value: 1,
        priority: null,
      },
    ],
  }, { parent: actor });
};

const dialog = await foundry.applications.api.DialogV2.prompt({
  window: { title: game.i18n.localize("UTOPIA.Macros.TITLES.select.label") },
  content: content,
  modal: true,
  ok: {
    label: game.i18n.localize("UTOPIA.Macros.BUTTONS.save.label"),
    icon: "fas fa-floppy-disk",
    callback: (event, button, dialog) => {
      const value = dialog.querySelector("select").selectedOptions[0].value;
      if (validateChoice(value)) callback(event, button, dialog);
    },
  },
});