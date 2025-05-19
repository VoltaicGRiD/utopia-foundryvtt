/**
 * Determine if the target is within range for the item’s attack or a raw range value.
 * @param {Object} options - The options for the range test.
 * @param {Item} [options.item] - The item being used for the attack.
 * @param {string|Object} [options.range] - The range value or object.
 * @param {Token} options.target - The target token.
 * @param {string} [options.trait='dex'] - The trait to use for the check.
 * @returns {Promise<boolean>} Whether the attack can proceed based on range.
 */
export async function rangeTest({ item, range, target, trait = 'dex' }) {
  // Get the user's selected token.
  let userToken = canvas.tokens.controlled[0];
  if (!userToken) {
    userToken = canvas.tokens.owned?.[0] || null;
    if (!userToken) userToken = canvas.tokens.controlled[0];
  }
  if (!userToken) {
    ui.notifications.error("You must select a token to attack.");
    return false;
  }

  // Get the target token.
  let targetToken = target;
  if (!targetToken) {
    ui.notifications.error("No target selected.");
    return false;
  }

  // Calculate positions and distance.
  let userPosition = userToken.x + userToken.y;
  let targetPosition = targetToken.x + targetToken.y;
  let distance = Math.abs(userPosition - targetPosition) / 100;

  // Determine source of range and actor.
  let actor, itemType, favors, testDifficulty, rollData, rangeValue;
  if (item) {
    actor = item.parent;
    itemType = item.type;
    favors = actor?.system?.favors?.accuracy;
    testDifficulty = actor?.system?.rangedTDModifier || 0;
    rollData = item.getRollData();
    rangeValue = item.system.range;
  } else {
    actor = userToken.actor;
    itemType = "Generic";
    favors = actor?.system?.favors?.accuracy;
    testDifficulty = actor?.system?.rangedTDModifier || 0;
    rollData = actor.getRollData();
    rangeValue = range;
  }

  // If range is not set, treat as melee (adjacent).
  if (!rangeValue) rangeValue = 1;

  // Handle close/far range (e.g., "30/60" or {close, far}).
  let closeRange = 0, farRange = 0;
  if (typeof rangeValue === "string" && rangeValue.includes('/')) {
    [closeRange, farRange] = rangeValue.split('/').map(r => parseInt(r) || 0);
  } else if (typeof rangeValue === "object" && rangeValue.close !== undefined && rangeValue.far !== undefined) {
    closeRange = rangeValue.close;
    farRange = rangeValue.far;
  } else {
    closeRange = farRange = parseInt(rangeValue) || 0;
  }

  // If the range is '0/0', treat as melee (always in range).
  if (closeRange === 0 && farRange === 0) return true;

  // Determine if ranged or melee.
  let isRanged = (item?.system?.ranged || item?.system?.range || typeof rangeValue === "string" || typeof rangeValue === "object");

  // If ranged, perform trait check.
  if (isRanged) {
    // Determine the appropriate trait check based on distance.
    let traitCheck;
    if (distance <= closeRange) {
      traitCheck = `${4 + (favors || 0)}d6 + @${trait}.mod`;
    } else if (distance <= farRange) {
      traitCheck = `${2 + (favors || 0)}d6 + @${trait}.mod`;
    } else {
      ui.notifications.error("Target is out of range.");
      return false;
    }

    // Prepare the roll.
    const speaker = ChatMessage.getSpeaker({ actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${itemType}] Ranged Check`;

    // Perform the trait check roll.
    const roll = new Roll(traitCheck, rollData);
    const chat = await roll.toMessage({
      speaker: speaker,
      rollMode: rollMode,
      flavor: label,
    });

    // Calculate the total of the roll.
    let sum = chat.rolls.reduce((acc, current) => acc + current.total, 0);

    // Modify the distance based on the TD modifier.
    for (let i = 0; i < Math.abs(testDifficulty); i++) {
      if (testDifficulty < 0) distance /= 2;
      else distance *= 2;
    }

    if (sum >= distance) {
      ChatMessage.create({
        user: game.user._id,
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: "Success! Ranged attack hits.",
      }, {});
      return true;
    } else {
      ChatMessage.create({
        user: game.user._id,
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: "Failure! Ranged attack misses.",
      }, {});
      return false;
    }
  } else {
    // Melee check: just compare distance to range.
    if (distance <= closeRange) {
      return true;
    } else {
      ui.notifications.error("Target is out of melee range.");
      return false;
    }
  }
}