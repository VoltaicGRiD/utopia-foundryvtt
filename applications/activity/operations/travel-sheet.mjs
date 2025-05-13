import { OperationSheet } from "../operation-sheet.mjs";

export class TravelSheet extends OperationSheet {
  constructor(options = {}) {
    super(options);
  }

  static PARTS = {
    ...super.PARTS,
    operation: {
      template: "systems/utopia/templates/activity/operations/travel.hbs",
      scrollable: ['.effects-list']
    }
  }    
}
  