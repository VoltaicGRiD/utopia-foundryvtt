import { gatherItems } from "../../system/helpers/gatherItems.mjs";

const { api } = foundry.applications;

/**
 * Represents the talent selection sheet for Utopia.
 * Extends the base Application class provided by Foundry VTT.
 */
export class TalentBrowser extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  actor = {}; // The actor associated with this sheet
  unlockAll = false; // Determines if all talents should be unlocked
  filter = ""; // Filters the talents by name, tree, species, or points
  talents = {};

  constructor(options = {}) {
    super(options);
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['utopia', 'talent-browser'],
    window: {
      resizeable: true,
      title: `Talent Tree`,
    },
    position: {
      width: 800,
      height: 900,
    },
    actions: {
      unlockAll: this._unlockAll,
      tabClick: this._onTabClick,
      talentClick: this._onTalentClick,
    },
    id: "talent-tree-{id}",
  };

  static PARTS = {
    header: {
      template: "systems/utopia/templates/specialty/talent-browser/header.hbs",
    },
    content: {
      template: "systems/utopia/templates/specialty/talent-browser/content.hbs",
      scrollable: [''],
    },
  }

  async handleTalent(talent, tree, branch, t, b, flexibility = {}) {
    const item = await fromUuid(talent.uuid);

    talent.item = item;
    talent.body = !talent.overridden ? item.system.body : talent.body;
    talent.mind = !talent.overridden ? item.system.mind : talent.mind;
    talent.soul = !talent.overridden ? item.system.soul : talent.soul;

    // Available has 3 states:
    // - unlocked: The talent is able to be taken
    // - locked: The talent is locked and cannot be taken
    // - taken: The talent is already taken
    const talentTracker = this.actor.system._talentTracking;
    
    // The actor has talents in this tree
    if (talentTracker.some(tracker => tracker.tree === tree.uuid)) {
    
      // The actor has talents in this tree and branch
      if (talentTracker.some(tracker => tracker.tree === tree.uuid && tracker.branch === b)) {

        var maxTier = 0;
        // Get the hightest tier of talent the actor has in this tree and branch
        for (const tracker of talentTracker.filter(tracker => tracker.tree === tree.uuid && tracker.branch === b)) {
          if (tracker.tier > maxTier) {
            maxTier = tracker.tier;
          }
        }

        if (maxTier >= t) {
          branch.talents[t].available = "taken";
          talent.available = "taken";
        }
        else if (maxTier + 1 === t) {
          branch.talents[t].available = "available";
          talent.available = "available";
        }
        else {
          branch.talents[t].available = "locked";
          talent.available = "locked";
        }
      }

      // The actor has talents in this tree but not this branch
      else {
        // The talent is the first in this branch
        if (t === 0) {
          branch.talents[t].available = "available";
          talent.available = "available";
        }
        // The talent is not the first in this branch
        else {
          branch.talents[t].available = "locked";
          talent.available = "locked";
        }
      }
    }
    
    // The actor does not have talents in this tree
    else {
      // The talent is the first in this branch
      if (t === 0) {
        branch.talents[t].available = "available";
        talent.available = "available";
      }
      // The talent is not the first in this branch
      else {
        branch.talents[t].available = "locked";
        talent.available = "locked";
      }
    }

    if (Object.keys(flexibility).length > 0) {
      if (talent.available !== "taken") {
        branch.talents[t].available = "available";
        talent.available = "available";
      }
    }

    talent.flexibility = flexibility;    

    return talent;
  }

  async _prepareContext(options) {
    if (this.options.actor) {
      this.actor = this.options.actor;
    }

    let actorSpecies = "No Species";
    if (this.actor.type !== "creature") {
      actorSpecies = this.actor.system._speciesData.name;
    }
    
    const trees = await gatherItems({ type: 'talentTree', gatherFolders: false, gatherFromWorld: true, gatherFromActor: false });
    const species = await gatherItems({ type: 'species', gatherFolders: false, gatherFromWorld: true, gatherFromActor: false });
    const allTrees = trees.concat(species);

    const actorTrees = this.options.actor.system.trees;
    const flexibilities = this.actor.system.flexibility;

    for (const tree of allTrees) {
      if (tree.type === "talentTree" || (actorSpecies && tree.type === 'species' && tree.name === actorSpecies) ) {
        for (var b = 0; b < tree.system.branches.length; b++) {
          const branch = tree.system.branches[b];

          for (var t = 0; t < branch.talents.length; t++) {
            const talent = branch.talents[t];
            const response = await this.handleTalent(talent, tree, branch, t, b);
            this.talents[talent.uuid] = response;
          };
        }
      }
      else if (flexibilities.some(flexibility => ["subspecies", "speciesFirst", "speciesSecond", "speciesAll"].includes(flexibility.category) && tree.type === "species")) {
        for (var b = 0; b < tree.system.branches.length; b++) {
          const branch = tree.system.branches[b];

          if (flexibilities.some(flexibility => flexibility.category === "subspecies") && branch.category === "subspecies") {
            var tiers = [];

            for (const flexibility of flexibilities.filter(flexibility => flexibility.category === "subspecies")) {
              tiers.push(flexibility.tier);
            }

            for (var t = 0; t < branch.talents.length; t++) {
              if (!tiers.includes(t)) {
                continue;
              }

              const talent = branch.talents[t];
              const flexibility = flexibilities.find(flexibility => flexibility.category === "subspecies" && flexibility.tier === t);
              const response = await this.handleTalent(talent, tree, branch, t, b, flexibility);

              response.body += flexibility.body;
              response.mind += flexibility.mind;
              response.soul += flexibility.soul;

              this.talents[talent.uuid] = response;
            }
          }
          else if (flexibilities.some(flexibility => flexibility.category === "speciesFirst") && b === 0) {
            var tiers = [];

            for (const flexibility of flexibilities.filter(flexibility => flexibility.category === "speciesFirst")) {
              tiers.push(flexibility.tier);
            }

            for (var t = 0; t < branch.talents.length; t++) {
              if (!tiers.includes(t)) {
                continue;
              }

              const talent = branch.talents[t];
              const flexibility = flexibilities.find(flexibility => flexibility.category === "speciesFirst" && flexibility.tier === t);
              const response = await this.handleTalent(talent, tree, branch, t, b, flexibility);

              response.body += flexibility.body;
              response.mind += flexibility.mind;
              response.soul += flexibility.soul;

              this.talents[talent.uuid] = response;
            }
          }
          else if (flexibilities.some(flexibility => flexibility.category === "speciesSecond") && b === 1) {
            var tiers = [];

            for (const flexibility of flexibilities.filter(flexibility => flexibility.category === "speciesAll")) {
              tiers.push(flexibility.tier);
            }

            for (var t = 0; t < branch.talents.length; t++) {
              if (!tiers.includes(t)) {
                continue;
              }

              const talent = branch.talents[t];
              const flexibility = flexibilities.find(flexibility => flexibility.category === "speciesSecond" && flexibility.tier === t);
              const response = await this.handleTalent(talent, tree, branch, t, b, flexibility);

              response.body += flexibility.body;
              response.mind += flexibility.mind;
              response.soul += flexibility.soul;

              this.talents[talent.uuid] = response;
            }
          }
          else if (flexibilities.some(flexibility => flexibility.category === "speciesAll")) {
            var tiers = [];

            for (const flexibility of flexibilities.filter(flexibility => flexibility.category === "speciesAll")) {
              tiers.push(flexibility.tier);
            }

            for (var t = 0; t < branch.talents.length; t++) {
              if (!tiers.includes(t)) {
                continue;
              }

              const talent = branch.talents[t];
              const flexibility = flexibilities.find(flexibility => flexibility.category === "speciesAll" && flexibility.tier === t);
              const response = await this.handleTalent(talent, tree, branch, t, b, flexibility);

              response.body += flexibility.body;
              response.mind += flexibility.mind;
              response.soul += flexibility.soul;

              this.talents[talent.uuid] = response;
            }
          }
        }
      }
      else {
        allTrees.splice(allTrees.indexOf(tree), 1);
      }
    }

    // Remove all empty branches
    for (const tree of allTrees) {
      tree.system.branches = tree.system.branches.filter(branch => branch.talents.length > 0);
    }

    // If the actor is a creature, remove all species branches
    if (this.actor.type === "creature") {
      allTrees = allTrees.filter(tree => tree.type !== 'species' && tree.type !== 'subspecies');
    }

    // Remove all empty trees
    const filteredTrees = allTrees.filter(tree => tree.system.branches.length > 0);

    // Check if the actor has any flexibility points
    if (this.actor.system.flexibility.length > 0) {
      for (const flexibility of this.actor.system.flexibility) {
        // The tree should be indicated by
        // - subspecies: Add all species trees, but only the subspecies branch
        // - speciesFirst: Add all species trees, but only the first branch
        // - speciesSecond: Add all species trees, but only the second branch
        // - speciesAll: Add all species trees, but all branches
        // - generalPurpose: Add all general purpose trees (not species)

        if (flexibility.category === "subspecies") {

        }
      }
    }

    const context = {
      trees: filteredTrees,
    }

    console.log(this, context);

    this.availableTalents = filteredTrees.reduce((acc, tree) => {
      for (const branch of tree.system.branches) {
        acc.push(...branch.talents);
      }
      return acc;
    }
    , []);

    return context;
  }

  // #searchFilter = new SearchFilter({
  //   inputSelector: 'input[name="filter"]',
  //   contentSelector: '.skill-grid',1
  //   callback: this._filter.bind(this),
  // });

  _onRender(context, options) {
    try {
      // if (options.parts.includes('header')) {
      //   this.element.querySelector('[data-action="unlockAll"]').addEventListener('click', this._unlockAll.bind(this)); 
      //   this.#searchFilter.bind(this.element);
      // };

      this.element.querySelectorAll('.skill').forEach(skill => {
        skill.addEventListener('mouseover', async (event) => {
          const talent = this.talents[event.target.dataset.talent];
          let content = await renderTemplate('systems/utopia/templates/specialty/talent-browser/tooltip.hbs', { 
            talent
          });
          let element = document.createElement('div');
          element.innerHTML = content;
          game.tooltip.activate(event.target, { direction: 'RIGHT', cssClass: "utopia", content: element });
        });
        skill.addEventListener('mouseout', (event) => {
          game.tooltip.deactivate();
        });
      });
    } catch (error) {
      console.error(error);
    }
  }

  static async _onTalentClick(event, target) {
    const talentUuid = target.dataset.talent;
    const treeUuid = target.dataset.tree;
    const branch = target.dataset.branch;
    const tier = target.dataset.tier
    const available = target.dataset.available;
    const talent = this.talents[talentUuid];
    const tree = await fromUuid(treeUuid);

    if (available === "available") {
      new foundry.applications.api.DialogV2({
        window: { title: `Take Talent: ${talent.item.name}` },
        content: `<p>Are you sure you want to take the talent <strong>${talent.item.name}</strong>? It will cost ${talent.item.system.cost} points, of your ${this.actor.system.talentPoints.available} available points.</p>`,
        options: {
          width: 400,
          height: 200,
        },
        buttons: [
          {
            action: "confirm",
            label: `Take ${talent.item.name}`,
            default: true,
            callback: () => "confirm",
          },
          {
            action: "cancel",
            label: "Cancel",
            callback: () => "cancel"
          }
        ],
        submit: async result => {
          if (result === "cancel") {
            return;
          }
          else {
            await this.actor.addTalent(
              talent,
              tree,
              branch,
              tier,
            );
            this.render({ force: true });
          }
        }
      }).render({ force: true });
    }

    this.render();
  }

  static async _unlockAll(event) {
    this.unlockAll = !this.unlockAll;
    this.render();
  }

  /**
   * @param {KeyboardEvent} event   The key-up event from keypboard input
   * @param {string} query          The raw string input to the search field
   * @param {RegExp} rgx            The regular expression to test against
   * @param {HTMLElement} html      The HTML element which should be filtered
   */
  async _filter(event, query, rgx, html) {
    if (!this.rendered) return;
    this.filter = query;
    this.render({ parts: ['content'] });
  }
}