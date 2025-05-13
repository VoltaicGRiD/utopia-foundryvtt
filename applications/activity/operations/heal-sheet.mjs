import { OperationSheet } from "../operation-sheet.mjs";

export class HealSheet extends OperationSheet {
  constructor(options = {}) {
    super(options);
  }

  static PARTS = {
    ...super.PARTS,
    operation: {
      template: "systems/utopia/templates/activity/operations/heal.hbs",
      scrollable: ['.effects-list']
    }
  }    
}
  