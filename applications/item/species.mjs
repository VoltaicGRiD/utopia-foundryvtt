import { DragDropItemV2 } from "../base/drag-drop-enabled-itemv2.mjs"

export class Species extends DragDropItemV2 {
  static MODES = {
    PLAY: 0,
    EDIT: 1,
  }

  _mode = this.constructor.MODES.PLAY;

  static PARTS = {
    header: {
      template: "systems/utopia/templates/item/header.hbs",
      scrollable: ['.item-header']
    },
    tabs: {
      template: "systems/utopia/templates/tabs.hbs",
    },
    attributes: {
      template: "systems/utopia/templates/item/attributes.hbs",
    },
    paperdoll: {
      template: "systems/utopia/templates/item/special/paperdoll.hbs",
    },
    talenttree: {
      template: "systems/utopia/templates/item/special/talent-tree.hbs",
    },
    description: {
      template: "systems/utopia/templates/item/description.hbs",
    },
    effects: {
      template: "systems/utopia/templates/effects.hbs",
    }
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(DragDropItemV2.DEFAULT_OPTIONS, {
    actions: {
      toggleMode: this._toggleMode,
      addBranch: this._addBranch,
      editTalent: this._editTalent,
      deleteTalent: this._deleteTalent,
      togglePaperdoll: this._togglePaperdoll,
    },
    position: {
      width: 1200,
      height: 700,
    }
  });

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["header", "tabs", "attributes", "paperdoll", "talenttree", "description", "effects"];
  }

  async _prepareContext(options) {
    const context = super._prepareContext(options);

    context.tabs = this._getTabs(options.parts);
    context.position = options.position;
    context.isPlay = this._mode === this.constructor.MODES.PLAY,
    context.branches = this.item?.system?.branches ?? []

    try {
      await Promise.all(context.branches.map(async b => {
        if (b.talents.length > 0) {
          await Promise.all(b.talents.map(async t => {
            t.item = await fromUuid(t.uuid) || {};
          }));
        }
      }));
    } catch (error) {
      console.error(error);
    }      
    
    console.log(context);

    return context;
  }

  async _preparePartContext(partId, context) {
    switch (partId) {
      case 'attributes':
      case 'talenttree':
        context.tab = context.tabs[partId];
        break;
      case 'paperdoll':
        context.tab = context.tabs[partId];
        context.paperdoll = this.item.system.getPaperDoll();
        break;
      case 'description':
        context.tab = context.tabs[partId];
        context.enrichedDescription = await TextEditor.enrichHTML(
          this.item.system.description,
          {
            secrets: this.document.isOwner,
            rollData: this.item.getRollData(),
            relativeTo: this.item
          }
        );
        break;
      case 'effects': 
        context.tab = context.tabs[partId];
        break;
      default:
    }
    return context;
  }

  _getTabs(parts) {
    const tabGroup = 'primary';
  
    // Default tab for first time it's rendered this session
    if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = 'attributes';
  
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: '',
        group: tabGroup,
        // Matches tab property to
        id: '',
        // FontAwesome Icon, if you so choose
        icon: '',
        // Run through localization
        label: 'UTOPIA.Items.Tabs.',
      };
  
      switch (partId) {
        case 'header':
        case 'tabs':
          return tabs;
        case 'attributes':
          tab.id = 'attributes';
          tab.label += 'Attributes';
          tab.icon = 'fas fa-fw fa-book';
          break;
        case 'paperdoll': 
          tab.id = 'paperdoll';
          tab.label += 'Paperdoll';
          tab.icon = 'fas fa-fw fa-person';
          break
        case 'description': 
          tab.id = 'description';
          tab.label += 'Description';
          tab.icon = 'fas fa-fw fa-align-left';
          break;
        case 'talenttree':
          tab.id = 'talent-tree';
          tab.label += 'Talent-tree';
          tab.icon = 'fas fa-fw fa-tree';
          break
        case 'effects':
          tab.id = 'effects';
          tab.label += 'Effects';
          tab.icon = 'fas fa-fw fa-bolt';
          break;
        default:
      }
  
      // This is what turns on a single tab
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = 'active';
  
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  _onRender(options, context) {
    super._onRender(options, context);
    this.element.querySelectorAll(['.talent', '.empty-talent', '.talent-branch', '.before-talent']).forEach((element) => {
      element.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', JSON.stringify({ type: "reorder", branch: event.target.dataset.branch, index: event.target.dataset.talent, uuid: event.target.dataset.documentUUID }));
      });
      //element.addEventListener('drop', this._onDrop.bind(this));
      element.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.target.classList.add('animate');
      });
      element.addEventListener('dragleave', (event) => {
        event.target.classList.remove('animate');
      });
    });

    this.element.querySelectorAll('select.branch-category').forEach((element) => {
      element.addEventListener('change', async (event) => {
        const branchIndex = parseFloat(event.target.dataset.branch);
        const branches = this.item.system.branches;
        branches[branchIndex].category = event.target.value;
        await this.item.update({ 'system.branches': branches });
      });
    });

    this.element.querySelectorAll('.override').forEach((element) => {
      element.addEventListener('change', async (event) => {
        const branchIndex = parseFloat(event.target.dataset.branch);
        const talentIndex = parseFloat(event.target.dataset.talent);
        const attribute = event.target.dataset.attribute;
        const value = parseFloat(event.target.value);
        const branches = this.item.system.branches;
        branches[branchIndex].talents[talentIndex][attribute] = value;
        await this.item.update({ 'system.branches': branches });
      });
    })
  }

  static async _togglePaperdoll(event, target) {
    const type = target.dataset.type;
    const slot = target.dataset.slot;

    switch (type) {
      case "augmentable": 
        await this.item.update({
          [`system.armors.unaugmentable.${slot}`]: !this.item.system.armors.unaugmentable[slot]
        })
        break;
      case "equippable": 
        await this.item.update({
          [`system.armors.unequippable.${slot}`]: !this.item.system.armors.unequippable[slot]
        });
        break;
      case "specialty":
        await this.item.update({
          [`system.armors.specialty.${slot}`]: !this.item.system.armors.specialty[slot]
        });
        break;
    }
  }

  static async _addBranch(event, target) {
    const branches = this.item.system.branches;
    branches.push({ name: "", talents: [] });
    await this.item.update({ 'system.branches': branches });
  }

  static async _editTalent(event, target) {
    const branches = this.item.system.branches;
    const branchIndex = parseFloat(target.dataset.branch);
    const talentIndex = parseFloat(target.dataset.talent);
    const talents = branches[branchIndex].talents;
    const talent = talents[talentIndex];
    talent.overridden = true;
    branches[branchIndex].talents = talents;
    await this.item.update({ 'system.branches': branches });
  }

  static async _deleteTalent(event, target) { 
    const branches = this.item.system.branches;
    const branchIndex = parseFloat(target.dataset.branch);
    const talentIndex = parseFloat(target.dataset.talent);
    branches[branchIndex].talents.splice(talentIndex, 1);
    await this.item.update({ 'system.branches': branches });
  }

  /**
   * 
   */
  async _onDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.target.classList.add('animate');
  }

  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  async _onDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    console.warn(event);

    const data = TextEditor.getDragEventData(event);
    if (data.type === "reorder") {
      return this._onReorderTalent(event, data);
    }

    const dropped = await Item.fromDropData(data);
    if (dropped.type === "talent") 
      return this._onDropTalent(event, dropped);
    else
      return super._onDrop(event);
  }

  async _onReorderTalent(event, talent) {
    const branches = this.item.system.branches;
    const targetBranch = event.target.closest('.talent-branch');
    const targetBranchIndex = parseFloat(targetBranch.dataset.branch);
    const sourceBranchIndex = parseFloat(talent.branch);

    // If the source and target branches are the same, we're just reordering talents within the same branch
    if (sourceBranchIndex === targetBranchIndex) {
      const talents = branches[targetBranchIndex].talents;
      const talentIndex = parseFloat(talent.index);
      const newTalents = Array.from(talents);
      newTalents.splice(talentIndex, 1);
      newTalents.splice(event.target.dataset.talent, 0, talent.uuid);
      branches[targetBranchIndex].talents = newTalents;
    } else {
      const sourceTalents = branches[sourceBranchIndex].talents;
      const targetTalents = branches[targetBranchIndex].talents;
      const talentIndex = parseFloat(talent.index);
      const newSourceTalents = Array.from(sourceTalents);
      newSourceTalents.splice(talentIndex, 1);
      branches[sourceBranchIndex].talents = newSourceTalents;

      const newTargetTalents = Array.from(targetTalents);
      newTargetTalents.splice(event.target.dataset.talent, 0, talent.uuid);
      branches[targetBranchIndex].talents = newTargetTalents;
    }

    return await this.item.update({ 'system.branches': branches });
  }

  async _onDropTalent(event, talent) {
    event.preventDefault();
    event.stopPropagation();
    const branches = this.item.system.branches;

    let branch = undefined;
    
    if (event.target.classList.contains('empty-talent')) 
      branch = event.target.closest('.talent-branch');
    else 
      branch = event.target;

    const branchIndex = parseFloat(branch.dataset.branch);
    var talents = this.item.system.branches[branchIndex].talents;
    const talentIndex = event.target.dataset.talent;

    // if talentIndex is undefined, it means the talent is being dropped on an empty talent slot, so the end of the Set
    // if it is defined, we insert it before the talentIndex
    const newTalents = talents;
    if (talentIndex !== undefined) {
      const tempArray = Array.from(newTalents);
      tempArray.splice(talentIndex, 0, talent.uuid);
      newTalents.clear();
      tempArray.forEach(t => newTalents.push(t));
    } else {
      newTalents.push({
        uuid: talent.uuid,
        overridden: false,
        body: 0,
        mind: 0,
        soul: 0,
      });
    }
    talents = newTalents;
    branches[branchIndex].talents = talents;

    await this.item.update({
      [`system.branches`]: branches
    });
  }
}