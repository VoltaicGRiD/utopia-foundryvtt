import UtopiaItemBase from "../base-item.mjs";

const fields = foundry.data.fields;

export class Gear extends UtopiaItemBase {
  /** @override */
  static defineSchema() {
    const schema = super.defineSchema();
      
    schema.type = new fields.StringField({ required: true, nullable: false, initial: "weapon", choices: {
      weapon: "UTOPIA.Items.Gear.FIELDS.Type.Weapon",
      shield: "UTOPIA.Items.Gear.FIELDS.Type.Shield",
      armor: "UTOPIA.Items.Gear.FIELDS.Type.Armor",
      consumable: "UTOPIA.Items.Gear.FIELDS.Type.Consumable",
      artifact: "UTOPIA.Items.Gear.FIELDS.Type.Artifact",
    }});

    schema.weaponType = new fields.StringField({ required: false, nullable: true, initial: "fastWeapon", choices: {
      "fastWeapon": "UTOPIA.Items.Gear.FIELDS.WeaponType.Fast",
      "moderateWeapon": "UTOPIA.Items.Gear.FIELDS.WeaponType.Moderate",
      "slowWeapon": "UTOPIA.Items.Gear.FIELDS.WeaponType.Slow",
    }});

    schema.armorType = new fields.StringField({ required: false, nullable: true, initial: "headArmor", choices: {
      "headArmor": "UTOPIA.Items.Gear.FIELDS.ArmorType.Head",
      "neckArmor": "UTOPIA.Items.Gear.FIELDS.ArmorType.Neck",
      "chestArmor": "UTOPIA.Items.Gear.FIELDS.ArmorType.Chest",
      "backArmor": "UTOPIA.Items.Gear.FIELDS.ArmorType.Back",
      "waistArmor": "UTOPIA.Items.Gear.FIELDS.ArmorType.Waist",
      "ringArmor": "UTOPIA.Items.Gear.FIELDS.ArmorType.Ring",
      "handsArmor": "UTOPIA.Items.Gear.FIELDS.ArmorType.Hands",
      "feetArmor": "UTOPIA.Items.Gear.FIELDS.ArmorType.Feet",
    }});

    schema.artifactType = new fields.StringField({ required: false, nullable: true, initial: "handheldArtifact", choices: {
      "handheldArtifact": "UTOPIA.Items.Gear.FIELDS.ArtifactType.Handheld",
      "equippableArtifact": "UTOPIA.Items.Gear.FIELDS.ArtifactType.Equippable",
      "ammunitionArtifact": "UTOPIA.Items.Gear.FIELDS.ArtifactType.Ammunition",
    }});

    schema.value = new fields.NumberField({ required: true, nullable: false, initial: 0 });
    schema.attributes = new fields.ObjectField();

    schema.features = new fields.ArrayField(
      new fields.DocumentUUIDField({ type: "Item" }), 
      { label: "UTOPIA.Gear.Features.label", hint: "UTOPIA.Gear.Features.hint" }
    );

    const components = {};
    Object.entries(CONFIG.UTOPIA.COMPONENTS).forEach(([component, _]) => {
      components[`${component}`] = new fields.SchemaField({});

      Object.entries(CONFIG.UTOPIA.RARITIES).forEach(([rarity, _]) => {
        components[`${component}`].fields[`${rarity}`] = new fields.NumberField({ required: true, nullable: false, initial: 0 });
      });
    });
    console.warn(components);

    schema.prototype = new fields.BooleanField({ required: true, nullable: false, initial: true });
    schema.contributedComponents = new fields.SchemaField({
      ...components,
    })

    return schema;
  }  

  prepareDerivedData() {
    this.cost = {
      silver: this.value,
      utian: this.value * 1000
    }
  }

  
}