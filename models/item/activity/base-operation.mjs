export class BaseOperation extends foundry.abstract.DataModel {
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "UTOPIA.Items.Activity.Operations"];

  static defineSchema() {
    const schema = {};
    const fields = foundry.data.fields;

    schema.name = new fields.StringField({ required: true, nullable: false, blank: false, initial: "New Operation" });

    schema.id = new fields.StringField({ required: true, nullable: false, blank: false, initial: foundry.utils.randomID(16) });

    schema.costs = new fields.SchemaField({
      actions: new fields.StringField({ required: true, nullable: false, initial: "0" }),
      actionType: new fields.StringField({ required: true, nullable: false, initial: "turn", choices: { 
        turn: game.i18n.localize("UTOPIA.Items.Activity.ActionType.Turn"),
        interrupt: game.i18n.localize("UTOPIA.Items.Activity.ActionType.Interrupt"),
        current: game.i18n.localize("UTOPIA.Items.Activity.ActionType.Current"),
      } }),
      stamina: new fields.StringField({ required: true, nullable: false, initial: "0" }),
      //shp: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      //dhp: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    })
    
    schema.performance = new fields.SchemaField({
      combatOnly: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      isMyTurn: new fields.BooleanField({ required: true, nullable: false, initial: true }),
      isNotMyTurn: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    })

    schema.executeImmediately = new fields.BooleanField({ required: true, nullable: false, initial: true });
    
    schema.toggleActiveEffects = new fields.SchemaField({
      selectedEffects: new fields.SetField(new fields.StringField({ required: true, nullable: false, initial: "" }), { required: true, nullable: false, initial: [] }),
      notificationMessage: new fields.StringField({ required: true, nullable: false, initial: game.i18n.localize("UTOPIA.Items.Activity.NotificationMessage") }),
      displayNotification: new fields.BooleanField({ required: true, nullable: false, initial: true }),
      displayInChat: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    });

    schema.priority = new fields.NumberField({ required: true, nullable: false, initial: 0 });

    return schema;
  }

  static _toObject() {
    return {
      name: "New Operation",
      id: foundry.utils.randomID(16),
      costs: {
        actions: 0,
        actionType: "turn",
        stamina: 0,
        shp: 0,
        dhp: 0
      },
      performance: {
        combatOnly: false,
        isMyTurn: true,
        isNotMyTurn: true
      },
      executeImmediately: true,
      toggleActiveEffects: {
        selectedEffects: [],
        notificationMessage: game.i18n.localize("UTOPIA.Items.Activity.NotificationMessage"),
        displayNotification: true,
        displayInChat: false
      },
      priority: 0
    };
  }
}