export class BaseOperation {
  static defineSchema() {
    const schema = {};
    const fields = foundry.data.fields;

    schema.name = new fields.StringField({ required: true, nullable: false, blank: false, initial: this.constructor.name });

    schema.id = new fields.StringField({ required: true, nullable: false, blank: false, initial: foundry.utils.randomID(16) });

    schema.costs = new fields.SchemaField({
      actions: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      actionType: new fields.StringField({ required: true, nullable: false, initial: "turn", choices: { 
        turn: "UTOPIA.Items.Activity.ActionType.Turn",
        interrupt: "UTOPIA.Items.Activity.ActionType.Interrupt",
        current: "UTOPIA.Items.Activity.ActionType.Current",
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

    schema.activateImmediately = new fields.BooleanField({ required: true, nullable: false, initial: true });
    
    schema.toggleActiveEffects = new fields.SchemaField({
      availableEffects: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false, initial: {} })),
      selectedEffects: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false, initial: {} })),
      notificationMessage: new fields.StringField({ required: true, nullable: false, initial: game.i18n.localize("UTOPIA.Items.Activity.NotificationMessage") }),
      displayNotification: new fields.BooleanField({ required: true, nullable: false, initial: true }),
      displayInChat: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    });

    schema.priority = new fields.NumberField({ required: true, nullable: false, initial: 0 });

    return schema;
  }

  static getEffects(activity) {
    const effects = activity.effects || [];
    const activityParent = activity.parent ?? {};
    const parentEffects = activityParent.effects || [];

    if (activity.parent)    

    return [...effects, ...parentEffects].map(effect => {
      return { uuid: effect.uuid, name: effect.name };
    });
  }
}