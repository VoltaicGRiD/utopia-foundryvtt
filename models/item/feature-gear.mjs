import UtopiaItemBase from "../base-item.mjs";


export class GearFeature extends UtopiaItemBase {

  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.classifications = new fields.ObjectField();

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    
    try { this._prepareTypes(); } catch (err) { console.error(err); }
    try { this._prepareCost(); } catch (err) { console.error(err); }
  }

  _prepareTypes() {
    for (const classification of Object.keys(this.classifications)) {
      if (classification === "shared") continue;

      this.classifications[classification] = foundry.utils.mergeObject( this.classifications[classification], this.classifications["shared"]);
    }
  }

  _prepareCost() {
    this.costs = {};
    for (const classification of Object.keys(this.classifications)) {
      this.costs[classification] = {};

      const costKeys = ["material", "refinement", "power", "costFormula", "componentsPerStack"];
      for (const key of costKeys) {
        this.costs[classification][key] = this.classifications[classification]?.[key] ?? 0;
        delete this.classifications[classification]?.[key];
      }
    }
  }
}