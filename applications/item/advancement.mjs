import { DragDropAppV2 } from "../base/drag-drop-enabled-appv2.mjs";
import { DragDropItemV2 } from "../base/drag-drop-enabled-itemv2.mjs";

export class AdvancementSheet extends DragDropAppV2 {
  constructor(options = {}) {
    super(options);
    this.actor = options.actor;
    this.subtraits = Object.values(JSON.parse(game.settings.get("utopia", "advancedSettings.subtraits"))).map((subtrait) => {
      return {
        ...subtrait,
        gifted: this.actor.system.subtraits[subtrait.short].gifted,
        value: this.actor.system.subtraits[subtrait.short].value,
        newValue: this.actor.system.subtraits[subtrait.short].value,
      }
    })
  }

  static DEFAULT_OPTIONS = {
    classes: ["utopia", "advancement-sheet"],
    position: {
      width: 500,
    },
    actions: {
      // next: this._next,
      // previous: this._previous,
      increase: this._increase,
      decrease: this._decrease,
      save: this._save,
      gift: this._gift,
    },
    form: {
      submitOnChange: false,
    },
    tag: "form",
  window: {
      title: "UTOPIA.SheetLabels.Advancement",
    },
  };

  static PARTS = {
    details: {
      template: "systems/utopia/templates/item/special/advancement.hbs",
    },
  };

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["details"];
  }

  async _prepareContext(options) {    
    var context = {
      actor: this.actor,
      subtraits: this.subtraits,
      giftPoints: this.actor.system.giftPoints.available,
      points: this.actor.system.subtraitPoints.available - this.subtraits.reduce((acc, subtrait) => acc + subtrait.newValue - subtrait.value, 0)
    };

    return context;
  }

  async _onRender(context, options) {
    super._onRender(context, options);

    // Find our subtraits and our buttons
  }

  static async _increase(event, target) {
    const points = this.actor.system.subtraitPoints.available - this.subtraits.reduce((acc, subtrait) => acc + subtrait.newValue - subtrait.value, 0);
    if (points <= 0) return;

    const key = target.dataset.key;
    this.subtraits.find((subtrait) => subtrait.short === key).newValue += 1;

    this.render();
  }

  static async _decrease(event, target) {
    const points = this.actor.system.subtraitPoints.available - this.subtraits.reduce((acc, subtrait) => acc + subtrait.newValue - subtrait.value, 0);
    if (points >= this.actor.system.subtraitPoints.available) return;

    const key = target.dataset.key;
    this.subtraits.find((subtrait) => subtrait.short === key).newValue -= 1;

    this.render();
  }

  static async _gift(event, target) {
    const key = target.dataset.key;
    const subtrait = this.subtraits.find((subtrait) => subtrait.short === key);

    if (subtrait.gifted) 
      subtrait.gifted = false;
    else {
      const points = this.actor.system.giftPoints.available - this.subtraits.reduce((acc, subtrait) => acc + (subtrait.gifted ? 1 : 0), 0);
      if (points <= 0) return;
      subtrait.gifted = true;
    }

    this.render();
  }

  static async _save(event, target) {
    for (const subtrait of this.subtraits) {
      await this.actor.update({
        [`system.subtraits.${subtrait.short}.value`]: subtrait.newValue,
        [`system.subtraits.${subtrait.short}.gifted`]: subtrait.gifted,
      });
    }

    this.close();
  }
}