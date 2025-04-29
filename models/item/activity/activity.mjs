import * as ops from "./_module.mjs";

export class Activity extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "UTOPIA.Items.Activity"];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};

    schema.name = new fields.StringField({ required: true, nullable: false, initial: "" });
    schema.description = new fields.StringField({ required: true, nullable: false, initial: "" });
    schema.origin = new fields.DocumentUUIDField({ required: false, nullable: true, initial: null });

    schema.operations = new fields.ArrayField(new fields.TypedSchemaField({
      ...ops.selectOperation.defineSchema(),
      ...ops.attack.defineSchema(),
      ...ops.selectOption.defineSchema(),
      ...ops.condition.defineSchema(),
      ...ops.castSpell.defineSchema()
    }), { required: true, nullable: false, initial: [] });

    // TODO - Implement the trigger system for activities
    // schema.runOnTrigger = new fields.BooleanField({ required: true, nullable: false, initial: false });
    // schema.trigger = new fields.StringField({ required: true, nullable: false, initial: "onTurnStart", choices: {
    //   "onTurnStart": { label: "UTOPIA.Items.Activity.Trigger.OnTurnStart", value: "onTurnStart" },
    //   "onTurnEnd": { label: "UTOPIA.Items.Activity.Trigger.OnTurnEnd", value: "onTurnEnd" },
    //   "onRoundStart": { label: "UTOPIA.Items.Activity.Trigger.OnRoundStart", value: "onRoundStart" },
    //   "onRoundEnd": { label: "UTOPIA.Items.Activity.Trigger.OnRoundEnd", value: "onRoundEnd" }
    // } });

    return schema;
  }

  get allOperations() {
    return ["selectOperation", "attack", "selectOption", "condition", "castSpell"];
  }

  async newOperation(operation) {
    const id = foundry.utils.randomID(16);

    const newOp = { ...ops[operation].defineSchema(), id: id };

    try {
      await this.parent.update({
        "system.operations": [...this.operations, newOp ]
      });
      return true;
    } catch (error) {
      console.error("Failed to update operations:", error);
      return false;
    }
  }
}