export class BaseOperation extends foundry.abstract.DataModel {
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "UTOPIA.Items.Activity.Operations"];

  static defineSchema() {
    const schema = {};
    const fields = foundry.data.fields;

    schema.name = new fields.StringField({ required: true, nullable: false, blank: false, initial: "New Operation" });

    schema.id = new fields.StringField({ required: true, nullable: false, blank: false, initial: foundry.utils.randomID(16) });

    schema.costs = new fields.SchemaField({
      actions: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      actionType: new fields.StringField({ required: true, nullable: false, initial: "turn", choices: { 
        turn: game.i18n.localize("UTOPIA.Items.Activity.ActionType.Turn"),
        interrupt: game.i18n.localize("UTOPIA.Items.Activity.ActionType.Interrupt"),
        current: game.i18n.localize("UTOPIA.Items.Activity.ActionType.Current"),
      } }),
      stamina: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      shp: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      dhp: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    })
    
    schema.performance = new fields.SchemaField({
      combatOnly: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      isMyTurn: new fields.BooleanField({ required: true, nullable: false, initial: true }),
      isNotMyTurn: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    })

    schema.executeImmediately = new fields.BooleanField({ required: true, nullable: false, initial: true });
    
    schema.toggleActiveEffects = new fields.SchemaField({
      selectedEffects: new fields.SetField(new fields.StringField({ required: true, nullable: false, initial: "", choices: this.getEffects() }), { required: true, nullable: false, initial: [] }),
      notificationMessage: new fields.StringField({ required: true, nullable: false, initial: game.i18n.localize("UTOPIA.Items.Activity.NotificationMessage") }),
      displayNotification: new fields.BooleanField({ required: true, nullable: false, initial: true }),
      displayInChat: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    });

    schema.priority = new fields.NumberField({ required: true, nullable: false, initial: 0 });

    return schema;
  }

  static getEffects() {
    const effects = this.parent?.effects || [];
    const parentEffects = this.parent?.parent?.effects ?? [];

    return [...effects, ...parentEffects].map(effect => {
      return { uuid: effect.uuid, name: effect.name };
    });
  }
}
