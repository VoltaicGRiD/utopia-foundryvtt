import { OperationSheet } from "../operation-sheet.mjs";

export class SelectOperationSheet extends OperationSheet {
  constructor(options = {}) {
    super(options);
  }

  static PARTS = {
    ...super.PARTS,
    operation: {
      template: "systems/utopia/templates/activity/operations/select-operation.hbs",
      scrollable: []
    }
  }    
}
  