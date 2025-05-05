import { OperationSheet } from "../operation-sheet.mjs";

export class CastSpellSheet extends OperationSheet {
  constructor(options = {}) {
    super(options);
  }

  static PARTS = {
    ...super.PARTS,
    operation: {
      template: "systems/utopia/templates/activity/operations/cast-spell.hbs",
      scrollable: ['.effects-list']
    }
  }    
}
  