/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return loadTemplates({
    'attribute': 
      'systems/utopia/templates/specialty/feature-builder/attribute.hbs',

    'trait': 
      'systems/utopia/templates/actor/partials/trait.hbs',

    'subtrait': 
      'systems/utopia/templates/actor/partials/subtrait.hbs',

    'damage-instance': 
      'systems/utopia/templates/chat/damage-instance.hbs',

    'paper-doll':
      'systems/utopia/templates/specialty/paperdoll-attributes.hbs',

    'actor-paper-doll': 
      'systems/utopia/templates/actor/partials/paperdoll-attributes.hbs',

    'classification':
      'systems/utopia/templates/specialty/feature-builder/classification.hbs',
    
    'standard-attributes': 
      'systems/utopia/templates/specialty/feature-builder/standard-attributes.hbs',

    'actor-header-field':
      'systems/utopia/templates/actor/partials/header-field.hbs',

    'effects': 
      'systems/utopia/templates/effects.hbs'
  });
};

