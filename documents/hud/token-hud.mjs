/**
 * Extend the basic Token HUD with additional controls for Utopia.
 * {@link CONFIG.Token.hudClass}
 * @extends {TokenHUD}
 */
export class UtopiaTokenHUD extends TokenHUD {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "token-hud",
      template: "systems/utopia/templates/hud/token-hud.hbs",
      classes: ["utopia", "placeable-hud"]
    });
  }

  get document() {
    return this.object?.document;
  }

  /** @inheritDoc */
  getData(options={}) {
    let data = super.getData(options);

    data = foundry.utils.mergeObject(data, {
      shpBarData: this.document.getBarAttribute("hitpoints.surface", {alternative: "hitpoints.surface"}),
      dhpBarData: this.document.getBarAttribute("hitpoints.deep", {alternative: "hitpoints.deep"}),
      staminaBarData: this.document.getBarAttribute("stamina", {alternative: "stamina"}),
    })

    console.log(data);

    data.statusEffects = this._getStatusEffectChoices();
    return data;
  }

  /** @override */
  activateListeners(html) {
    console.log(this);
    console.log(this.object);
    console.log(this.document);

    super.activateListeners(html);

    // Attribute Bars
    html.find(".attribute input")
      .click(super._onAttributeClick)
      .keydown(super._onAttributeKeydown.bind(this))
      .focusout(this._onAttributeUpdate.bind(this));

    // html[0].addEventListener("blur", element => {
    //   html.find(".attribute input").each(async (i, el) => {
    //     await this._onAttributeUpdate(el);
    //   });
    // });
  }

  /** @override */
  _onAttributeUpdate(event) {
    event.preventDefault();
    if ( !this.object ) return;
    const input = event.currentTarget;
    super._updateAttribute(input.name, event.currentTarget.value.trim());
    super._render(true);
  }
} 