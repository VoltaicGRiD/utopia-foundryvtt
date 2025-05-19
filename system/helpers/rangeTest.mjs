/**
 * Determine if the target is within range for the item’s attack.
 * @param {Item} item - The item being used for the attack.
 * @returns {Promise<boolean>} Whether the attack can proceed based on range.
 */
export async function rangeTest({item, target, trait = 'dex'}) {
  // Get the user's selected token.
  let userToken = canvas.tokens.controlled[0];
  if (!userToken) {
    // If no token is controlled, get the first owned token.
    userToken = canvas.tokens.owned?.[0] || null;

    if (!userToken) {
      // If no owned token is available, get the first controlled token.
      userToken = canvas.tokens.controlled[0];
    }
  }

  if (!userToken) {
    // If no token is selected or owned, show an error and exit.
    ui.notifications.error("You must select a token to attack.");
    return false;
  }

  // Calculate the user's position.
  let userPosition = userToken.x + userToken.y;

  // Get the target token.
  let targetToken = target;
  if (!targetToken) {
    ui.notifications.error("No target selected.");
    return false;
  }

  // Calculate the target's position.
  let targetPosition = targetToken.x + targetToken.y;

  // Determine the distance between the user and the target.
  let distance = Math.abs(userPosition - targetPosition) / 100;

  let traitCheck;
  let range = item.system.range;

  // Determine the Test Difficulty from the item's parent's `system.rangedTDModifier` attribute.
  let testDifficulty = item.parent.system.rangedTDModifier || 0;
   
  if (item.system.ranged || item.system.range) {
    // If the weapon is ranged.

    if (range.includes('/')) {
      // The range is specified as close/far (e.g., "30/60").

      // Split the range into close and far values.
      let [closeRange, farRange] = [0, 0];

      if (range.close && range.far) {
        closeRange = rangte.close
        farRange = range.far
      }
      else {
        [closeRange, farRange] = range.split('/').map(r => parseInt(r) || 0);
      }

      // If the range is represented as '0/0', treat it as a melee attack,
      // which means the target is always in range.
      if (closeRange === 0 && farRange === 0) {
        return true;
      }

      // Get the roll data for the item.
      let rollData = item.getRollData();

      console.log(distance, range, closeRange, farRange);

      // Determine the appropriate dexterity check based on distance.
      if (distance <= closeRange) {
        // Within close range, use a favorable roll.
        if (item.parent.system.favors?.accuracy) {
          const favorAmount = item.parent.system.favors.accuracy;
          traitCheck = `${4 + favorAmount}d6 + @${trait}.mod`;
        }
        else 
          traitCheck = `4d6 + @${trait}.mod`;
      } else if (distance <= farRange) {
        // Within far range, use a standard roll.
        if (item.parent.system.favors?.accuracy) {
          const favorAmount = item.parent.system.favors.accuracy;
          traitCheck = `${2 + favorAmount}d6 + @${trait}.mod`;
        }
        else
          traitCheck = `2d6 + @${trait}.mod`;
      } else {
        // Beyond far range, the attack cannot proceed.
        ui.notifications.error("Target is out of range.");
        return false;
      }

      // Prepare the roll.
      const speaker = ChatMessage.getSpeaker({ actor: item.parent });
      const rollMode = game.settings.get('core', 'rollMode');
      const label = `[${item.type}] Ranged Check`;

      // Perform the dexterity check roll.
      const roll = new Roll(traitCheck, rollData);
      const chat = await roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });

      // Calculate the total of the roll.
      let sum = chat.rolls.reduce((acc, current) => acc + current.total, 0);

      // We also need to modify the distance based on the TD modifier.
      // If the TD modifier is 0, the distance is unchanged.
      // For each point below 0, the distance is halved.
      // For each point above 0, the distance is doubled.
      for (let i = 0; i < Math.abs(testDifficulty); i++) {
        if (testDifficulty < 0) {
          distance /= 2;
        } else {
          distance *= 2;
        }
      }

      if (sum >= distance) {
        // The attack hits.
        let chatData = {
          user: game.user._id,
          speaker: speaker,
          rollMode: rollMode,
          flavor: label,
          content: "Success! Ranged attack hits.",
        };
        ChatMessage.create(chatData, {});

        return true;
      } else {
        // The attack misses.
        let chatData = {
          user: game.user._id,
          speaker: speaker,
          rollMode: rollMode,
          flavor: label,
          content: "Failure! Ranged attack misses.",
        };
        ChatMessage.create(chatData, {});

        return false;
      }
    } else {
      // If the range is a single value.
      if (distance <= parseInt(range)) {
        // The target is within range.
        return true;
      } else {
        // The target is out of range.
        ui.notifications.error("Target is out of range.");
        return false;
      }
    }
  } else {
    // If the weapon is melee.

    if (distance <= parseInt(range)) {
      // The target is within melee range.
      return true;
    } else {
      // The target is out of melee range.
      ui.notifications.error("Target is out of range.");
      return false;
    }
  }
}

export async function rangeTest({range, target, trait = 'dex'}) {
  // Get the user's selected token.
  let userToken = canvas.tokens.controlled[0];
  if (!userToken) {
    // If no token is controlled, get the first owned token.
    userToken = canvas.tokens.owned?.[0] || null;

    if (!userToken) {
      // If no owned token is available, get the first controlled token.
      userToken = canvas.tokens.controlled[0];
    }
  }

  if (!userToken) {
    // If no token is selected or owned, show an error and exit.
    ui.notifications.error("You must select a token to attack.");
    return false;
  }

  // Calculate the user's position.
  let userPosition = userToken.x + userToken.y;

  // Get the target token.
  let targetToken = target;
  if (!targetToken) {
    ui.notifications.error("No target selected.");
    return false;
  }

  // Calculate the target's position.
  let targetPosition = targetToken.x + targetToken.y;

  // Determine the distance between the user and the target.
  let distance = Math.abs(userPosition - targetPosition) / 100;

  let traitCheck;

  // Determine the Test Difficulty from the item's parent's `system.rangedTDModifier` attribute.
  let testDifficulty = actor.system.rangedTDModifier || 0;
   
  if (item.system.ranged || item.system.range) {
    // If the weapon is ranged.

    if (range.includes('/')) {
      // The range is specified as close/far (e.g., "30/60").

      // Split the range into close and far values.
      let [closeRange, farRange] = [0, 0];

      if (range.close && range.far) {
        closeRange = rangte.close
        farRange = range.far
      }
      else {
        [closeRange, farRange] = range.split('/').map(r => parseInt(r) || 0);
      }

      // If the range is represented as '0/0', treat it as a melee attack,
      // which means the target is always in range.
      if (closeRange === 0 && farRange === 0) {
        return true;
      }

      // Get the actor associated to the test.
      const actor = userToken.actor;

      // Get the roll data for the item.
      let rollData = actor.getRollData();

      console.log(distance, range, closeRange, farRange);

      // Determine the appropriate dexterity check based on distance.
      if (distance <= closeRange) {
        // Within close range, use a favorable roll.
        if (actor.system.favors?.accuracy) {
          const favorAmount = actor.system.favors.accuracy;
          traitCheck = `${4 + favorAmount}d6 + @${trait}.mod`;
        }
        else 
          traitCheck = `4d6 + @${trait}.mod`;
      } else if (distance <= farRange) {
        // Within far range, use a standard roll.
        if (actor.system.favors?.accuracy) {
          const favorAmount = actor.system.favors.accuracy;
          traitCheck = `${2 + favorAmount}d6 + @${trait}.mod`;
        }
        else
          traitCheck = `2d6 + @${trait}.mod`;
      } else {
        // Beyond far range, the attack cannot proceed.
        ui.notifications.error("Target is out of range.");
        return false;
      }

      // Prepare the roll.
      const speaker = ChatMessage.getSpeaker({ actor: item.parent });
      const rollMode = game.settings.get('core', 'rollMode');
      const label = `[${item.type}] Ranged Check`;

      // Perform the dexterity check roll.
      const roll = new Roll(traitCheck, rollData);
      const chat = await roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });

      // Calculate the total of the roll.
      let sum = chat.rolls.reduce((acc, current) => acc + current.total, 0);

      // We also need to modify the distance based on the TD modifier.
      // If the TD modifier is 0, the distance is unchanged.
      // For each point below 0, the distance is halved.
      // For each point above 0, the distance is doubled.
      for (let i = 0; i < Math.abs(testDifficulty); i++) {
        if (testDifficulty < 0) {
          distance /= 2;
        } else {
          distance *= 2;
        }
      }

      if (sum >= distance) {
        // The attack hits.
        let chatData = {
          user: game.user._id,
          speaker: speaker,
          rollMode: rollMode,
          flavor: label,
          content: "Success! Ranged attack hits.",
        };
        ChatMessage.create(chatData, {});

        return true;
      } else {
        // The attack misses.
        let chatData = {
          user: game.user._id,
          speaker: speaker,
          rollMode: rollMode,
          flavor: label,
          content: "Failure! Ranged attack misses.",
        };
        ChatMessage.create(chatData, {});

        return false;
      }
    } else {
      // If the range is a single value.
      if (distance <= parseInt(range)) {
        // The target is within range.
        return true;
      } else {
        // The target is out of range.
        ui.notifications.error("Target is out of range.");
        return false;
      }
    }
  } else {
    // If the weapon is melee.

    if (distance <= parseInt(range)) {
      // The target is within melee range.
      return true;
    } else {
      // The target is out of melee range.
      ui.notifications.error("Target is out of range.");
      return false;
    }
  }
}