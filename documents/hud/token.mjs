export class UtopiaToken extends Token {
  constructor(document) {
    super(document);
  }

  /** @override */
  static RENDER_FLAGS = {
    ...Token.RENDER_FLAGS,
    ...{
      refreshActions: {},
    }
  }

  /**
   * Defines the actions bars to render.
   * @type {PIXI.Container}
   */
  actions;

  /** @override */
  async _draw(options) {
    await super._draw(options);

    this.actions ??= this.addChildAt(this.#drawActions(), 1);
  }

  /** @override */
  _applyRenderFlags(flags) {
    super._applyRenderFlags(flags);

    //if (flags?.utopia?.displayActions) 
      this.drawActions(); 
  }

  #drawActions() {
    const actions = new PIXI.Container();
    actions.turn = actions.addChild(new PIXI.Container());
    actions.interrupt = actions.addChild(new PIXI.Container());
    return actions;
  }

  drawActions() {
    if ( !this.actor || !game.settings.get('utopia', 'displayActionsOnToken')) return;
    ["turn", "interrupt"].forEach((type, index) => {
      const data = this.actor.system[`${type}Actions`];
      const action = this.actions[type];

      this._drawActions(index, action, data);
      action.visible = true;
    });
  }

  _drawActions(index, action, data) {
    // Lets get the setting that dictates whether the actions should
    // be displayed in a semi-circle around the token, or if they
    // should be displayed as vertical or horizontal bars outside
    // the token bounds.

    var displayOption = game.settings.get('utopia', 'displayActionsOption');    
    // Then we override it with the token's settings, if they exist
    if (this.document.getFlag('utopia', 'displayActionsOption') !== undefined) {
      displayOption = this.document.getFlag('utopia', 'displayActionsOption');
    }

    switch (displayOption) {
      case 0: this._drawActionsSemiCircle(index, action, data); break;
      case 1: this._drawActionsVerticalBars(index, action, data); break;
      case 2: this._drawActionsHorizontalBars(index, action, data); break;
    }
  }

  _drawActionsHorizontalBars(index, action, data) {
    // Draw the actions in a horizontal bar below the token
    action.removeChildren();

    // We'll assume these exist or fall back to the token's width/height
    const tokenWidth  = (canvas.dimensions.size * this.document.width);
    const tokenHeight = (canvas.dimensions.size * this.document.height);

    // We'll add a bit of padding to the token's width/height
    const tokenWidthPadding = (canvas.dimensions.size * this.document.width) / 10;
    const tokenHeightPadding = (canvas.dimensions.size * this.document.height) / 10;

    // Each indicator's size
    const size = Math.max(canvas.dimensions.size / game.settings.get("utopia", "displayActionsSize"), 8);

    // We draw turn actions on the top, left to right, right being the end of the chain
    if (index === 0) {
     
      // Where on the token do we anchor the bar?
      const centerX = tokenWidth / 2;
      const centerY = 0;

      // For an even number, half go left, half go right
      // Example: if data.max=6 and data.value=4 => 4 white, 2 gray
      // We'll pad them with (size+4) spacing from center
      const half = Math.floor(data.max / 2); // number on each side

      const step = size; 
      const mid = (data.max - 1) / 2;

      for (let i = 0; i < data.max; i++) {
        const indicator = new PIXI.Graphics();
        const fillColor = (i < data.value) ? 0x99ff99 : 0x444444;
        indicator.lineStyle(2, 0x000000, 1.0);
        indicator.beginFill(fillColor, 1);
        indicator.drawCircle(0, 0, size / 2);
        indicator.endFill();

        // Place them symmetrically around centerX 
        const offsetFactor = i - mid; // could be negative, zero, or positive 
        indicator.x = centerX + (offsetFactor * step); // Y stays the same for them all 
        indicator.y = centerY + tokenHeightPadding;

        action.addChild(indicator);
      }
    }

    // We draw interrupt actions on the bottom, left to right
    else {
      
      // Where on the token do we anchor the bar?
      const centerX = tokenWidth / 2;
      const centerY = tokenHeight;

      // For an even number, half go left, half go right
      // Example: if data.max=6 and data.value=4 => 4 white, 2 gray
      // We'll pad them with (size+4) spacing from center
      const half = Math.floor(data.max / 2); // number on each side

      const step = size; 
      const mid = (data.max - 1) / 2;

      for (let i = 0; i < data.max; i++) {
        const indicator = new PIXI.Graphics();
        const fillColor = (i < data.value) ? 0xff9999 : 0x444444;
        indicator.lineStyle(2, 0x000000, 1.0);
        indicator.beginFill(fillColor, 1);
        indicator.drawCircle(0, 0, size / 2);
        indicator.endFill();

        // Place them symmetrically around centerX 
        const offsetFactor = i - mid; // could be negative, zero, or positive 
        indicator.x = centerX + (offsetFactor * step); // Y stays the same for them all 
        indicator.y = centerY - tokenHeightPadding;

        action.addChild(indicator);
      }
    }

    this.actions.addChild(action);
    return true;
  }

  _drawActionsVerticalBars(index, action, data) {
    // Draw the actions in a vertical bar to the right of the token
    action.removeChildren();

    // We'll assume these exist or fall back to the token's width/height
    const tokenWidth  = (canvas.dimensions.size * this.document.width);
    const tokenHeight = (canvas.dimensions.size * this.document.height);

    // We'll add a bit of padding to the token's width/height
    const tokenWidthPadding = (canvas.dimensions.size * this.document.width) / 10;
    const tokenHeightPadding = (canvas.dimensions.size * this.document.height) / 10;

    // Each indicator's size
    const size = Math.max(canvas.dimensions.size / game.settings.get("utopia", "displayActionsSize"), 8);

    // We draw turn actions on the left, top to bottom, bottom being the top of the
    // chain, and interrupt actions on the right, top to bottom
    if (index === 0) {
      // Where on the token do we anchor the bar?
      const centerX = 0 + tokenWidthPadding;
      const centerY = tokenHeight / 2;

      // For an even number, half go left, half go right
      // Example: if data.max=6 and data.value=4 => 4 white, 2 gray
      // We'll pad them with (size+4) spacing from center
      const half = Math.floor(data.max / 2); // number on each side

      const step = size; 
      const mid = (data.max - 1) / 2;

      for (let i = 0; i < data.max; i++) {
        const indicator = new PIXI.Graphics();
        const fillColor = (i < data.value) ? 0x99ff99 : 0x444444;
        indicator.lineStyle(2, 0x000000, 1.0);
        indicator.beginFill(fillColor, 1);
        indicator.drawCircle(0, 0, size / 2);
        indicator.endFill();

        // Place them symmetrically around centerX 
        const offsetFactor = i - mid; // could be negative, zero, or positive 
        indicator.x = centerX;
        indicator.y = centerY + (offsetFactor * step);

        action.addChild(indicator);
      }
    }

    // We draw interrupt actions on the right, top to bottom
    else {
      // Where on the token do we anchor the bar?
      const centerX = tokenWidth - tokenWidthPadding;
      const centerY = tokenHeight / 2;

      // For an even number, half go left, half go right
      // Example: if data.max=6 and data.value=4 => 4 white, 2 gray
      // We'll pad them with (size+4) spacing from center
      const half = Math.floor(data.max / 2); // number on each side

      const step = size; 
      const mid = (data.max - 1) / 2;

      for (let i = 0; i < data.max; i++) {
        const indicator = new PIXI.Graphics();
        const fillColor = (i < data.value) ? 0xff9999 : 0x444444;
        indicator.lineStyle(2, 0x000000, 1.0);
        indicator.beginFill(fillColor, 1);
        indicator.drawCircle(0, 0, size / 2);
        indicator.endFill();

         // Place them symmetrically around centerX 
         const offsetFactor = i - mid; // could be negative, zero, or positive 
         indicator.x = centerX;
         indicator.y = centerY + (offsetFactor * step);

        action.addChild(indicator);
      }
    }

    this.actions.addChild(action);
    return true;
  }

  _drawActionsSemiCircle(index, action, data) {
    // Draw the actions in a semi-circle around the token
    action.removeChildren();
    
    // We'll assume these exist or fall back to the token's width/height
    const tokenWidth  = (canvas.dimensions.size * this.document.width);
    const tokenHeight = (canvas.dimensions.size * this.document.height);

    // We'll add a bit of padding to the token's width/height
    const tokenWidthPadding = (canvas.dimensions.size * this.document.width) / 10;
    const tokenHeightPadding = (canvas.dimensions.size * this.document.height) / 10;

    // Where on the token do we anchor the arc? e.g. near bottom center
    const centerX = tokenWidth / 2;
    const centerY = tokenHeight / 2; // positions around the bottom

    // Each indicator's radius (circle size)
    const size = Math.max(canvas.dimensions.size / game.settings.get("utopia", "displayActionsSize"), 8) * 
                (this.document.height >= 2 ? 1.6 : 1);

    // If index=0, arrange in a semi-circle from left to right
    if (index === 0) {
      // Radius of the arc, needs to fit within the bounds of the token
      const radius = (tokenWidth / 2) - tokenWidthPadding;
      // We'll sweep half a circle (π radians)
      const angleStep = Math.PI / (data.max - 1);

      // Add an extra -90° rotation offset
      const rotationOffset = -Math.PI / 2;

      for (let i = 0; i < data.max; i++) {
        // Original angle from -90° to +90°
        const baseAngle = -Math.PI / 2 + (angleStep * i);
        // Subtract another 90° to visually rotate the entire arc
        const angle = baseAngle + rotationOffset;

        // White if available; gray if not
        const fillColor = (i < data.value) ? 0x99ff99 : 0x444444;

        const indicator = new PIXI.Graphics();
        indicator.lineStyle(2, 0x000000, 1.0);
        indicator.beginFill(fillColor, 1);
        indicator.drawCircle(0, 0, size / 2);
        indicator.endFill();

        // Place it in a semi-circle around centerX, centerY
        indicator.x = centerX + radius * Math.cos(angle);
        indicator.y = (centerY + radius * Math.sin(angle));

        action.addChild(indicator);
      }
    } 
    
    // If index=1, place them left and right of center at bottom
    else {
      // For an even number, half go left, half go right
      // Example: if data.max=6 and data.value=4 => 4 white, 2 gray
      // We'll pad them with (size+4) spacing from center
      const half = Math.floor(data.max / 2); // number on each side

      const step = size + 8; const mid = (data.max - 1) / 2;

      for (let i = 0; i < data.max; i++) {
        const indicator = new PIXI.Graphics();
        const fillColor = (i < data.value) ? 0xff9999 : 0x444444;
        indicator.lineStyle(2, 0x000000, 1.0);
        indicator.beginFill(fillColor, 1);
        indicator.drawCircle(0, 0, size / 2);
        indicator.endFill();

        // Place them symmetrically around centerX 
        const offsetFactor = i - mid; // could be negative, zero, or positive 
        indicator.x = centerX + (offsetFactor * step); // Y stays the same for them all 
        indicator.y = centerY + (canvas.dimensions.size * this.document.height) / 2 - tokenHeightPadding;

        action.addChild(indicator);
      }
    }

    this.actions.addChild(action);
    return true;
  }
}
