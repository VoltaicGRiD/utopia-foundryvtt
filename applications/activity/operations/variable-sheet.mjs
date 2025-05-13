import { OperationSheet } from "../operation-sheet.mjs";

export class VariableSheet extends OperationSheet {
  constructor(options = {}) {
    super(options);
  }

  static PARTS = {
    ...super.PARTS,
    operation: {
      template: "systems/utopia/templates/activity/operations/variable.hbs",
      scrollable: ['.effects-list']
    }
  }    
}
  