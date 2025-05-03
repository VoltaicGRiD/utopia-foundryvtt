/**
   * Add biography fields to the schema, allowing for structured character background data.
   */
  static getBiography(schema) {
    schema.biographyFieldOptions = new fields.StringField({
      required: true,
      nullable: false,
      choices: {
        "generalKnowledgeDivider": "UTOPIA.Biography.generalKnowledgeDivider",
        "age": "UTOPIA.Biography.age",
        "birthday": "UTOPIA.Biography.birthday",
        "deathday": "UTOPIA.Biography.deathday",
        "height": "UTOPIA.Biography.height",
        "weight": "UTOPIA.Biography.weight",
        "pronouns": "UTOPIA.Biography.pronouns",
        "hairEyesSkin": "UTOPIA.Biography.hairEyesSkin",
        "markings": "UTOPIA.Biography.markings",
        "voice": "UTOPIA.Biography.voice",
        "bodyType": "UTOPIA.Biography.bodyType",
        "ethnicity": "UTOPIA.Biography.ethnicity",
        "nationality": "UTOPIA.Biography.nationality",
        "quirks": "UTOPIA.Biography.quirks",

        "relationshipDivider": "UTOPIA.Biography.relationshipsDivider",
        "enemies": "UTOPIA.Biography.enemies",
        "allies": "UTOPIA.Biography.allies",
        "rivals": "UTOPIA.Biography.rivals",
        "family": "UTOPIA.Biography.family",
        "friends": "UTOPIA.Biography.friends",
        "partners": "UTOPIA.Biography.partners",

        "personalInfoDivider": "UTOPIA.Biography.personalInformationDivider",
        "strength": "UTOPIA.Biography.strength",
        "education": "UTOPIA.Biography.education",
        "upbringing": "UTOPIA.Biography.upbringing",
        "achievements": "UTOPIA.Biography.achievements",
        "coreMemories": "UTOPIA.Biography.coreMemories",
        "phobias": "UTOPIA.Biography.phobias",
        "dreams": "UTOPIA.Biography.dreams",
        "nightmares": "UTOPIA.Biography.nightmares",
        "edicts": "UTOPIA.Biography.edicts",
        "anathema": "UTOPIA.Biography.anathema",
        "ambitions": "UTOPIA.Biography.ambitions",
        "motivations": "UTOPIA.Biography.motivations",
        "personalSecrets": "UTOPIA.Biography.personalSecrets",

        "alignmentDivider": "UTOPIA.Biography.alignmentsDivider",
        "moralAlignment": "UTOPIA.Biography.moralAlignment",
        "philosophicalAlignment": "UTOPIA.Biography.philosophicalAlignment",
        "politicalAlignment": "UTOPIA.Biography.politicalAlignment",

        "publicInfoDivider": "UTOPIA.Biography.publicInformationDivider",
        "occupation": "UTOPIA.Biography.occupation",
        "reputation": "UTOPIA.Biography.reputation",
        "hobbies": "UTOPIA.Biography.hobbies",
        "interests": "UTOPIA.Biography.interests",
      },
      initial: "age"
    });
    schema.biographyFields = new fields.SetField(schema.biographyFieldOptions, {
      required: true,
      nullable: false,
      initial: []
    });
    schema.biography = new fields.SchemaField({
      // General knowledge
      age: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      birthday: new TextareaField({ required: false, nullable: true }),
      deathday: new TextareaField({ required: false, nullable: true }),
      height: new fields.StringField({ required: false, nullable: true }),
      weight: new fields.NumberField({ required: false, nullable: true }),
      pronouns: new fields.StringField({ required: false, nullable: true }),
      hairEyesSkin: new TextareaField({ required: false, nullable: true }),
      bodyType: new TextareaField({ required: false, nullable: true }),
      ethnicity: new fields.StringField({ required: false, nullable: true }),
      nationality: new fields.StringField({ required: false, nullable: true }),
      markings: new TextareaField({ required: false, nullable: true }),
      voice: new TextareaField({ required: false, nullable: true }),
      quirks: new TextareaField({ required: false, nullable: true }),

      // Relationships
      allies: new TextareaField({ required: false, nullable: true }),
      enemies: new TextareaField({ required: false, nullable: true }),
      rivals: new TextareaField({ required: false, nullable: true }),
      family: new TextareaField({ required: false, nullable: true }),
      friends: new TextareaField({ required: false, nullable: true }),
      partners: new TextareaField({ required: false, nullable: true }),

      // Personal Information
      education: new TextareaField({ required: false, nullable: true }),
      upbringing: new TextareaField({ required: false, nullable: true }),
      achievements: new TextareaField({ required: false, nullable: true }),
      coreMemories: new TextareaField({ required: false, nullable: true }),
      phobias: new TextareaField({ required: false, nullable: true }),
      dreams: new TextareaField({ required: false, nullable: true }),
      nightmares: new TextareaField({ required: false, nullable: true }),
      anathema: new TextareaField({ required: false, nullable: true }),
      edicts: new TextareaField({ required: false, nullable: true }),
      ambitions: new TextareaField({ required: false, nullable: true }),
      motivations: new TextareaField({ required: false, nullable: true }),
      personalSecrets: new TextareaField({ required: false, nullable: true }),

      // Alignments
      moralAlignment: new TextareaField({ required: false, nullable: true }),
      philosophicalAlignment: new TextareaField({ required: false, nullable: true }),
      politicalAlignment: new TextareaField({ required: false, nullable: true }),

      // Public Information
      occupation: new TextareaField({ required: false, nullable: true }),
      reputation: new TextareaField({ required: false, nullable: true }),
      hobbies: new TextareaField({ required: false, nullable: true }),
      interests: new TextareaField({ required: false, nullable: true }),
    });    

    return schema;
  }