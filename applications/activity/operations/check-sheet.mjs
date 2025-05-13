import { OperationSheet } from "../operation-sheet.mjs";

export class CheckSheet extends OperationSheet {
  constructor(options = {}) {
    super(options);
  }

  static PARTS = {
    ...super.PARTS,
    operation: {
      template: "systems/utopia/templates/activity/operations/check.hbs",
      scrollable: ['.effects-list']
    }
  }    
}
  