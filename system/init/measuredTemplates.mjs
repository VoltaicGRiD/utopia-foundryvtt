export class UtopiaTemplates extends MeasuredTemplate {
  constructor(...args) {
    super(...args);
    this.handlers = {};
  }

  /**
   * A factory method to create a UTOPIAMeasuredTemplate instance using provided preset
   * @param {string} preset the preset to use.
   * @param {UtopiaItem} [item] the item the preset is attached to.
   * @returns {void}
   */
  static fromPreset(preset, item) {
    const existingPreview = CONFIG.UTOPIA.activeMeasuredTemplatePreview;
    if (existingPreview && !existingPreview._destroyed) {
      existingPreview.destroy({ children: true });
    }
    CONFIG.UTOPIA.activeMeasuredTemplatePreview = this._constructPreset(preset, item);
    if (CONFIG.UTOPIA.activeMeasuredTemplatePreview)
      CONFIG.UTOPIA.activeMeasuredTemplatePreview.drawPreview();
  }

  static _constructPreset(preset, item) {
    // Prepare template data
    const templateBaseData = {
      user: game.user?.id,
      distance: 0,
      direction: 0,
      x: 0,
      y: 0,
      fillColor: game.user?.color,
      flags: item ? { utopia: { origin: item.uuid } } : {}
    };

    const presetPrototype = game.settings.get("utopia", "measuredTemplatePresets").find(
      (c) => c.button.name === preset
    );
    if (!presetPrototype) return null;

    // Set template data based on preset option
    const template = new CONFIG.MeasuredTemplate.documentClass(
      foundry.utils.mergeObject(templateBaseData, presetPrototype.data),
      { parent: canvas.scene ?? undefined }
    );

    // Return the template constructed from the item data
    return new this(template);
  }

  /** Creates a preview of the template */
  drawPreview() {
    const initialLayer = canvas.activeLayer;
    // Draw the template and switch to the template layer
    this.draw();
    this.layer.activate();
    if (this.layer.preview) this.layer.preview.addChild(this);
    // Activate interactivity
    this.activatePreviewListeners(initialLayer);
  }

  /** Activate listeners for the template preview */
  activatePreviewListeners(initialLayer) {
    let moveTime = 0;
    // Update placement (mouse-move)
    this.handlers.mm = (event) => {
      event.stopPropagation();
      const now = Date.now();
      if (now - moveTime <= 20) return;
      const center = event.data.getLocalPosition(this.layer);
      const snapped = canvas.grid.getSnappedPoint(center, {
        mode: CONST.GRID_SNAPPING_MODES.CENTER,
        resolution: 2,
      });
      this.document.updateSource({ x: snapped?.x, y: snapped?.y });
      this.refresh();
      moveTime = now;
    };

    // Cancel the workflow (right-click)
    this.handlers.rc = (event) => {
      this.layer._onDragLeftCancel(event);
      this._removeListenersFromCanvas();
      initialLayer.activate();
    };

    // Confirm the workflow (left-click)
    this.handlers.lc = async (event) => {
      this.handlers.rc(event);
      const dest = canvas.grid.getSnappedPoint(this.document, {
        mode: CONST.GRID_SNAPPING_MODES.CENTER,
        resolution: 2,
      });
      this.document.updateSource(dest);
      const canvasTemplate = await canvas.scene?.createEmbeddedDocuments('MeasuredTemplate', [
        this.document.toObject(),
      ]);
      // const poly = canvas.scene.grid.getCircle({
      //   x: this.document.x,
      //   y: this.document.y,
      // }, this.document.distance);
      // canvas.scene.tokens.forEach((token) => {
      //   if (this._isPointInPolygon({
      //     x: token.x,
      //     y: token.y,
      //   }, poly)) {
      //     console.log(token);
      //     game.user.targets.add(token.object);
      //   }
      // });
      console.log(canvasTemplate);
      console.log(this);
    };

    // Rotate the template by increments (mouse-wheel)
    this.handlers.mw = (event) => {
      if (event.ctrlKey) event.preventDefault(); // Avoid zooming the browser window
      event.stopPropagation();
      const delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
      const snap = event.shiftKey ? delta : 5;
      this.document.updateSource({
        direction: this.document.direction + snap * Math.sign(event.deltaY),
      });
      this.refresh();
    };

    // Activate listeners
    canvas.stage.on('mousemove', this.handlers.mm);
    canvas.stage.on('mousedown', this.handlers.lc);
    canvas.app.view.oncontextmenu = this.handlers.rc;
    canvas.app.view.onwheel = this.handlers.mw;
  }

  destroy(...args) {
    game.settings.set("utopia", "activeMeasuredTemplatePreview", null);
    this._removeListenersFromCanvas();
    return super.destroy(...args);
  }

  /** Remove the mouse listeners from the canvas */
  _removeListenersFromCanvas() {
    canvas.stage.off('mousemove', this.handlers.mm);
    canvas.stage.off('mousedown', this.handlers.lc);
    canvas.app.view.oncontextmenu = null;
    canvas.app.view.onwheel = null;
  }

  /**
   * Check if a point is inside a polygon.
   * @param {object} point - Object with x and y properties.
   * @param {Array} polygon - Array of points with x and y properties in order.
   * @returns {boolean} - True if the point is inside the polygon.
   */
  _isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  _computeShape() {
    const { angle, t } = this.document;
    const { angle: direction, distance } = this.ray;
    if (t === CONST.MEASURED_TEMPLATE_TYPES.CONE)
      return this._getConeShape(direction, angle, distance);
    return super._computeShape();
  }

  _getConeShape(direction, angle, distance) {
    // Special case to handle the base UTOPIA cone rather than a normal cone definition
    if (angle === 0) {
      const coneWidth = 1.5 * (distance / 9);
      const coneLength = distance - coneWidth;
      const da = 3;
      const c = Ray.fromAngle(0, 0, direction, coneLength);
      const angles = Array.from({ length: Math.floor(180 / da) }, (_, a) => (180 / -2) + a * da)
        .concat([180 / 2]);
      // Get the cone shape as a polygon
      const rays = angles.map((a) =>
        Ray.fromAngle(0, 0, direction + Math.toRadians(a), coneWidth)
      );
      const points = rays
        .reduce((arr, r) => arr.concat([c.B.x + r.B.x, c.B.y + r.B.y]), [0, 0])
        .concat([0, 0]);
      return new PIXI.Polygon(points);
    } else {
      // Use default cone shape
      return MeasuredTemplate.getConeShape(direction, angle, distance);
    }
  }

  highlightGrid() {
    if (!this.shape) return;
    const highlightRAW = game.settings.get('utopia', 'highlightTemplate');
    if (!highlightRAW) return super.highlightGrid();
    const color = Number(this.document.fillColor);
    const border = Number(this.document.borderColor);
    const layer = canvas.interface.grid.getHighlightLayer(this.highlightId);
    if (!layer) return;
    layer.clear();
    const shape = this.shape.clone();
    if ('points' in shape) {
      shape.points = shape.points.map((p, i) => (i % 2 ? this.y + p : this.x + p));
    } else {
      shape.x += this.x;
      shape.y += this.y;
    }
    this._highlightGridArea(layer, { color, border, alpha: 0.25, shape });
  }

  /** A re-implementation of BaseGrid#highlightGridPosition() to force gridless behavior */
  _highlightGridArea(layer, options) {
    layer.beginFill(options.color, options.alpha);
    if (options.border) layer.lineStyle(2, options.border, Math.min(options.alpha * 1.5, 1.0));
    layer.drawShape(options.shape).endFill();
  }
}

export function isTokenInTemplate(token, template) {
  try {
    const { getCircle } = game.canvas.scene.grid;
    if (!template) return false;
    const point = token.object?.getCenterPoint() ?? { x: 0, y: 0 };
    const polygon = getCircle({ x: template.x, y: template.y }, template.distance);
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  } catch (error) {
    console.error('Error in isTokenInTemplate:', error);
    return false;
  }
}

export function registerMeasuredTemplates() {
  const TEMPLATE_PRESETS = {
    CONE: 'cone',
    LINE: 'line',
    SBT: 'sbt',
    MBT: 'mbt',
    LBT: 'lbt',
  };

  CONFIG.UTOPIA.measuredTemplatePresets = [
    {
      data: { t: CONST.MEASURED_TEMPLATE_TYPES.CONE, distance: 9 },
      button: {
        name: TEMPLATE_PRESETS.CONE,
        title: 'UTOPIA.Templates.Cone.Long',
        icon: 'fa-solid fa-location-pin fa-rotate-90',
        visible: true,
        button: true,
        onClick: () => {
          UtopiaTemplates.fromPreset(TEMPLATE_PRESETS.CONE);
        },
      },
    },
    {
      data: {
        t: foundry.CONST.MEASURED_TEMPLATE_TYPES.RAY,
        distance: 12,
        width: 1,
      },
      button: {
        name: TEMPLATE_PRESETS.LINE,
        title: 'UTOPIA.Templates.LINE.Long',
        icon: 'fa-solid fa-rectangle-wide',
        visible: true,
        button: true,
        onClick: () => {
          UtopiaTemplates.fromPreset(TEMPLATE_PRESETS.LINE);
        },
      },
    },
    {
      data: { t: CONST.MEASURED_TEMPLATE_TYPES.CIRCLE, distance: 1 },
      button: {
        name: TEMPLATE_PRESETS.SBT,
        title: 'UTOPIA.Templates.Small.Long',
        icon: 'fa-solid fa-circle-1 fa-2xs',
        visible: true,
        button: true,
        onClick: () => {
          UtopiaTemplates.fromPreset(TEMPLATE_PRESETS.SBT);
        },
      },
    },
    {
      data: { t: CONST.MEASURED_TEMPLATE_TYPES.CIRCLE, distance: 2 },
      button: {
        name: TEMPLATE_PRESETS.MBT,
        title: 'UTOPIA.Templates.Medium.Long',
        icon: 'fa-solid fa-circle-2 fa-sm',
        visible: true,
        button: true,
        onClick: () => {
          UtopiaTemplates.fromPreset(TEMPLATE_PRESETS.MBT);
        },
      },
    },
    {
      data: { t: CONST.MEASURED_TEMPLATE_TYPES.CIRCLE, distance: 3 },
      button: {
        name: TEMPLATE_PRESETS.LBT,
        title: 'UTOPIA.Templates.Large.Long',
        icon: 'fa-solid fa-circle-3 fa-lg',
        visible: true,
        button: true,
        onClick: () => {
          UtopiaTemplates.fromPreset(TEMPLATE_PRESETS.LBT);
        },
      },
    },
  ],

  CONFIG.UTOPIA.activeMeasuredTemplatePreview = null;
}