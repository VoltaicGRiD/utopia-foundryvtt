import { OperationSheet } from "../operation-sheet.mjs";

export class ConsumptionSheet extends OperationSheet {
  constructor(options = {}) {
    super(options);
  }

  static PARTS = {
    ...super.PARTS,
    operation: {
      template: "systems/utopia/templates/activity/operations/consumption.hbs",
      scrollable: []
    }
  }    
}