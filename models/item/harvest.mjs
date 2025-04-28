import UtopiaItemBase from "../base-item.mjs";
import { UtopiaSchemaField } from "../fields/schema-field.mjs";
import { SchemaArrayField } from "../fields/schema-set-field.mjs";

export class Action extends UtopiaItemBase {

  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "UTOPIA.Items.Harvest"];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    // Creature data:
    // - name: string
    // - always harvestables: object
    // - - component(s): array of components
    // - - quantity: number
    // - test harvestables: object
    // - - testTrait: string (trait used for the test)
    // - - testDifficulty: number (difficulty of the test, default 12)
    // - - component(s): array of components
    // - - quantity: number

    const components = {
      ...Object.entries(JSON.parse(game.settings.get("utopia", "advancedSettings.components"))).reduce((acc, [key, value]) => {
        acc[key] = { ...value, group: "UTOPIA.COMPONENTS.GroupName" };
        return acc;
      }, {}),
    }

    schema.complete = new fields.BooleanField({ required: true, nullable: false, initial: false });
    schema.distributedExperience = new fields.SchemaField({
      perCharacter: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      total: new fields.NumberField({ required: true, nullable: false, initial: 0 })
    });

    schema.creatures = new fields.SchemaArrayField(new fields.SchemaField({
      id: new fields.StringField({ required: true, nullable: false, initial: foundry.utils.randomID(16) }),
      name: new fields.StringField({ required: true, nullable: false, initial: "" }),
      dr: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      token: new fields.FilePathField({ required: false, nullable: true, initial: null }),
      alwaysHarvestables: new fields.SchemaArrayField(new fields.SchemaField({
        id: new fields.StringField({ required: true, nullable: false, initial: foundry.utils.randomID(16) }),
        component: new fields.StringField({ required: true, nullable: false, choices: components }),
        quantity: new fields.StringField({ required: true, nullable: false, initial: "0" }),
        harvested: new fields.SchemaField({
          complete: new fields.BooleanField({ required: true, nullable: false, initial: false }),
          by: new fields.DocumentUUIDField({ required: false, nullable: true, initial: null }),
          earned: new fields.SchemaField({
            component: new fields.StringField({ required: true, nullable: false }),
            quantity: new fields.NumberField({ required: true, nullable: false, initial: 1 })
          }, { required: false, nullable: true, initial: null })
        })
      })),
      testHarvestables: new fields.SchemaArrayField(new fields.SchemaField({
        id: new fields.StringField({ required: true, nullable: false, initial: foundry.utils.randomID(16) }),
        testTrait: new fields.StringField({ required: true, nullable: false, initial: "eng" }),
        testDifficulty: new fields.NumberField({ required: true, nullable: false, initial: 12 }),
        component: new fields.StringField({ required: true, nullable: false, choices: components }),
        quantity: new fields.StringField({ required: true, nullable: false, initial: "0" }),
        harvested: new fields.SchemaField({
          complete: new fields.BooleanField({ required: true, nullable: false, initial: false }),
          by: new fields.DocumentUUIDField({ required: false, nullable: true, initial: null }),
          failed: new fields.SetField(new fields.DocumentUUIDField({ required: false, nullable: true, initial: null }), { initial: [] }),
          earned: new fields.SchemaField({
            component: new fields.StringField({ required: true, nullable: false }),
            quantity: new fields.NumberField({ required: true, nullable: false, initial: 1 })
          }, { required: false, nullable: true, initial: null })
        })
      })),
    }));

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
  }
}