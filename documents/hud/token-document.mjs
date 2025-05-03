export class UtopiaTokenDocument extends TokenDocument {
  /** @inheritdoc */
  _initialize(options = {}) {
    super._initialize(options);
    this.baseActor?._registerDependentToken(this);
  }

  /* -------------------------------------------- */

  /** @override */
  prepareBaseData() {

    // Initialize regions
    if ( this.regions === null ) {
      this.regions = new Set();
      if ( !this.parent ) return;
      for ( const id of this._regions ) {
        const region = this.parent.regions.get(id);
        if ( !region ) continue;
        this.regions.add(region);
        region.tokens.add(this);
      }
    }

    this.name ||= this.actor?.name || "Unknown";
    if ( this.hidden ) this.alpha = Math.min(this.alpha, game.user.isGM ? 0.5 : 0);
    this._prepareDetectionModes();
    this._prepareUtopiaBars();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  prepareEmbeddedDocuments() {
    if ( game._documentsReady && !this.delta ) this.updateSource({ delta: { _id: this.id } });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    if ( this.ring.enabled && !this.ring.subject.texture ) {
      this.ring.subject.texture = this._inferRingSubjectTexture();
    }
  }

  /**
 * Prepare detection modes which are available to the Token.
 * Ensure that every Token has the basic sight detection mode configured.
 * @protected
 */
  _prepareDetectionModes() {
    if ( !this.sight.enabled ) return;
    const lightMode = this.detectionModes.find(m => m.id === "lightPerception");
    if ( !lightMode ) this.detectionModes.push({id: "lightPerception", enabled: true, range: null});
    const basicMode = this.detectionModes.find(m => m.id === "basicSight");
    if ( !basicMode ) this.detectionModes.push({id: "basicSight", enabled: true, range: this.sight.range});
  }

  _prepareUtopiaBars() {
    if (!this.actor) return;
    const actorData = this.actor.system;
    if (!actorData) return;
    this.shpBar = this.getBarAttribute("shp", {alternative: "hitpoints.surface"});
    this.dhpBar = this.getBarAttribute("dhp", {alternative: "hitpoints.deep"});
    this.staminaBar = this.getBarAttribute("stamina", {alternative: "stamina"});
    
    this.turnActionsBar = this.getBarAttribute("actions.turn", {alternative: "turnActions"});
    this.interruptActionsBar = this.getBarAttribute("actions.interrupt", {alternative: "interruptActions"});
  }

  /**
 * A helper method to retrieve the underlying data behind one of the Token's attribute bars
 * @param {string} barName                The named bar to retrieve the attribute for
 * @param {object} [options]
 * @param {string} [options.alternative]  An alternative attribute path to get instead of the default one
 * @returns {object|null}                 The attribute displayed on the Token bar, if any
 */
  getBarAttribute(barName, {alternative}={}) {
    const attribute = alternative || this[barName]?.attribute;
    if ( !attribute || !this.actor ) return null;
    const system = this.actor.system;
    const isSystemDataModel = system instanceof foundry.abstract.DataModel;
    const templateModel = game.model.Actor[this.actor.type];

    // Get the current attribute value
    const data = foundry.utils.getProperty(system, attribute);
    if ( (data === null) || (data === undefined) ) return null;

    // Single values
    if ( Number.isNumeric(data) ) {
      let editable = foundry.utils.hasProperty(templateModel, attribute);
      if ( isSystemDataModel ) {
        const field = system.schema.getField(attribute);
        if ( field ) editable = field instanceof foundry.data.fields.NumberField;
      }
      return {type: "value", attribute, value: Number(data), editable};
    }

    // Attribute objects
    else if ( ("value" in data) && ("max" in data) ) {
      let editable = foundry.utils.hasProperty(templateModel, `${attribute}.value`);
      if ( isSystemDataModel ) {
        const field = system.schema.getField(`${attribute}.value`);
        if ( field ) editable = field instanceof foundry.data.fields.NumberField;
      }
      return {type: "bar", attribute, value: parseInt(data.value || 0), max: parseInt(data.max || 0), editable};
    }

    // Otherwise null
    return null;
  }

  /**
   * Whenever the token's actor delta changes, or the base actor changes, perform associated refreshes.
   * @param {object} [update]                               The update delta.
   * @param {Partial<DatabaseUpdateOperation>} [operation]  The database operation that was performed
   * @protected
   */
  _onRelatedUpdate(update={}, operation={}) {
    // Update tracked Combat resource
    const c = this.combatant;
    if ( c && foundry.utils.hasProperty(update.system || {}, game.combat.settings.resource) ) {
      c.updateResource();
    }
    if ( this.inCombat ) ui.combat.render();

    // Trigger redraws on the token
    if ( this.parent.isView ) {
      if ( this.object?.hasActiveHUD ) canvas.tokens.hud.render();
      this.object?.renderFlags.set({refreshBars: true, redrawEffects: true, refreshActions: true});
      const configs = Object.values(this.apps).filter(app => app instanceof TokenConfig);
      configs.forEach(app => {
        app.preview?.updateSource({delta: this.toObject().delta}, {diff: false, recursive: false});
        app.preview?.object?.renderFlags.set({refreshBars: true, redrawEffects: true, refreshActions: true});
      });
    }
  }
}