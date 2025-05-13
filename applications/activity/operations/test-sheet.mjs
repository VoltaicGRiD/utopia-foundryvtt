import { OperationSheet } from "../operation-sheet.mjs";

export class TestSheet extends OperationSheet {
  constructor(options = {}) {
    super(options);
  }

  static PARTS = {
    ...super.PARTS,
    operation: {
      template: "systems/utopia/templates/activity/operations/test.hbs",
      scrollable: ['.effects-list']
    }
  }    
}
  