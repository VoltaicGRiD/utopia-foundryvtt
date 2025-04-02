import UtopiaItemBase from "../base-item.mjs";
  
export class GenericItem extends UtopiaItemBase {
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "UTOPIA.Items.Generic"];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.quantity = new fields.NumberField({ required: true, nullable: false, initial: 1 });
    schema.slots = new fields.NumberField({ required: true, nullable: false, initial: 1 });
    schema.value = new fields.NumberField({ required: true, nullable: false, initial: 0 });
    schema.consumeOnUse = new fields.BooleanField({ required: true, initial: true });
    schema.deleteWhenEmpty = new fields.BooleanField({ required: true, initial: false });

    schema.category = new fields.StringField({ required: true, nullable: false, initial: "misc", choices: {
      "misc": "UTOPIA.Items.Generic.Categories.misc",
      "consumable": "UTOPIA.Items.Generic.Categories.consumable",
      "tool": "UTOPIA.Items.Generic.Categories.tool",
      "trinket": "UTOPIA.Items.Generic.Categories.trinket",
      "junk": "UTOPIA.Items.Generic.Categories.junk",
      "ammunition": "UTOPIA.Items.Generic.Categories.ammunition",
      "valuable": "UTOPIA.Items.Generic.Categories.valuable",
    }});

    schema.rarity = new fields.StringField({ required: true, nullable: false, initial: "common", choices: () => {
      const returns = {};
      const allOptions = {
        ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.rarities"))).reduce((acc, [key, value]) => {
          acc[key] = { ...value, group: "UTOPIA.RARITIES.GroupName" };
          return acc;
        }, {}),
      }
      for (const [key, value] of Object.entries(allOptions)) {
        returns[key] = value.label;
      }
      return returns;
    }});

    schema.container = new fields.SchemaField({
      capacity: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      items: new fields.SetField(new fields.DocumentUUIDField({ entityClass: "Item" })),
    });
    
    return schema;
  }

  get headerFields() {
    return [
      ...super.headerFields,
      {
        field: this.schema.fields.quantity,
        stacked: false,
        editable: true,
      },
      {
        field: this.schema.fields.slots,
        stacked: false,
        editable: true,
      },
      {
        field: this.schema.fields.value,
        stacked: false,
        editable: true,
      },
      {
        field: this.schema.fields.category,
        stacked: false,
        editable: true,
      },
      {
        field: this.schema.fields.rarity,
        stacked: false,
        editable: true,
      },
    ]
  }

  get attributeFields() {
    return [
      {
        field: this.schema.fields.consumeOnUse,
        stacked: false,
        editable: true,
      },
      {
        field: this.schema.fields.deleteWhenEmpty,
        stacked: false,
        editable: true,
      },
      {
        field: this.schema.fields.container.fields.capacity,
        stacked: false,
        editable: true,
      },
      {
        field: this.schema.fields.container.fields.items,
        stacked: true,
        editable: false,
      },
    ]
  }

  async use() {
    console.warn("Using item: ", this);
    
    if (this.consumeOnUse) {
      this.parent.update({ "system.quantity": this.quantity - 1 });
    }

    if (this.quantity <= 0 && this.deleteWhenEmpty) {
      this.delete();
    }

    UtopiaChatMessage.create({
      content: this.name,
      speaker: ChatMessage.getSpeaker({ actor: this.parent.actor }),
      flags: {
        utopia: {
          itemId: this.id,
          itemName: this.name,
          itemType: this.type,
          itemAction: "use",
        }
      }
    });
  }
}