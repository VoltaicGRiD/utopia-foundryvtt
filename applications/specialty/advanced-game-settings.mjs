const { api } = foundry.applications;

/**
 * The advanced settings menu for Utopia.
 */
export class AdvancedSettingsMenu extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  selectedTab = "traits";
  editor = undefined;

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['utopia', 'advanced-settings-menu'],
    window: {
      resizeable: false,
      title: `UTOPIA.Settings.AdvancedSettingsMenu`,
    },
    position: {
      width: 800,
      height: 900,
    },
    actions: {
      subTab: this._tab,
      save: this._save,
    },
  };

  static PARTS = {
    content: {
      template: "systems/utopia/templates/specialty/advanced-game-settings/content.hbs",
    },
  }

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["content"];
  }

  async _prepareContext(options) {
    this.selectedTab = options.tabId ?? this.selectedTab;

    const setting = game.settings.get("utopia", `advancedSettings.${this.selectedTab}`);
    const parsedSetting = JSON.parse(setting);

    const context = {
      settingValue: JSON.stringify(parsedSetting, null, 2),
    }

    console.log(context);

    return context;
  }

  _onRender(options, context) {
    super._onRender(options, context);

    const editArea = this.element.querySelector('textarea[name="editor"]');
    const editor = ace.edit(editArea);
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/javascript");
    editor.setOptions({
      fontSize: "12pt",
      maxLines: 39,
      minLines: 39,
      wrap: true,
      showGutter: true,
      showPrintMargin: false,
      tabSize: 2,
    });

    this.editor = editor;

    //editor.getSession().foldAll(1);
  }

  _getTabs(parts) {
    const tabGroup = 'primary';
  
    // Default tab for first time it's rendered this session
    if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = 'content';
  
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: '',
        group: tabGroup,
        // Matches tab property to
        id: '',
        // FontAwesome Icon, if you so choose
        icon: '',
        // Run through localization
        label: 'UTOPIA.Settings.Tabs.',
      };
  
      switch (partId) {
        case 'tabs':
          return tabs;
        case 'content':
          tab.id = 'content';
          tab.label += 'content';
          tab.icon = 'fas fa-fw fa-cogs';
          break;
        case 'traits':
          tab.id = 'traits';
          tab.label += 'traits';
          tab.group = 'secondary';
          tab.icon = 'fas fa-fw fa-book';
          break;
        case 'subtraits': 
          tab.id = 'subtraits';
          tab.label += 'subtraits';
          tab.group = 'secondary';
          tab.icon = 'fas fa-fw fa-align-left';
          break;
        case 'specialtyChecks':
          tab.id = 'specialtyChecks';
          tab.label += 'specialtyChecks';
          tab.icon = 'fas fa-fw fa-bolt';
          tab.group = 'secondary';
          break;
        case 'damageTypes':
          tab.id = 'damageTypes';
          tab.label += 'damageTypes';
          tab.icon = 'fas fa-fw fa-sword';
          tab.group = 'secondary';
          break;
        case 'artistries':
          tab.id = 'artistries';
          tab.label += 'artistries';
          tab.icon = 'fas fa-fw fa-magic';
          tab.group = 'secondary';
          break;
        case 'rarities':
          tab.id = 'rarities';
          tab.label += 'rarities';
          tab.icon = 'fas fa-fw fa-box-open';
          tab.group = 'secondary';
          break;
        case 'languages':
          tab.id = 'languages';
          tab.label += 'languages';
          tab.icon = 'fas fa-fw fa-globe';
          tab.group = 'secondary';
          break;
        case 'components':
          tab.id = 'components';
          tab.label += 'components';
          tab.icon = 'fas fa-fw fa-box';
          tab.group = 'secondary';
          break;
        default:
      }
  
      // This is what turns on a single tab
      if (this.tabGroups[tabGroup] === partId) tab.cssClass = 'active';
  
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  static async _tab(event, target) {
    const tabId = target.dataset.tab;
    this.render({ tabId, force: true });
  }

  static async _save(event, target) {
    const setting = `advancedSettings.${this.selectedTab}`;
    const value = this.editor.getValue();

    console.log(value);

    game.settings.set("utopia", setting, value);
  }
}