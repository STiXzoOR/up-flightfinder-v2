/* eslint-disable no-underscore-dangle */
const CT_NAME = 'customTab';
const CT_DATA_KEY = 'CustomTab';
const CT_EVENT_KEY = `.${CT_DATA_KEY}`;
const CT_EVENT_CLICK = `click${CT_EVENT_KEY}`;

class CustomTab {
  constructor(element, options) {
    this.options = options;
    this.element = element;
    this.group = `[data-group="${this.options.targetGroup}"]`;
    this.controller = `[data-controls="${this.options.targetGroup}"]`;
    this.options.classes = {
      active: 'active',
      show: 'show',
      fade: 'fade',
      animation: 'animation',
    };

    this.init();
    this.bindEvents();
  }

  init() {
    $(this.element).attr('data-controls', this.options.targetGroup);
    $(this.options.target).attr('data-group', this.options.targetGroup);

    switch (this.options.animationType) {
      case 'fade':
        $(this.group).addClass(this.options.classes.fade);

        if ($(this.group).hasClass(this.options.classes.active))
          $(`${this.group}.${this.options.classes.active}`).addClass(this.options.classes.show);
        break;

      case 'custom':
        $(this.options.target).addClass(this.options.classes.animation);

        if (this.options.animationExtraClasses) $(this.options.target).addClass(this.options.animationExtraClasses);
        if (this.options.animationDuration)
          $(this.options.target).css({
            animationDuration: `${this.options.animationDuration}ms`,
          });
        break;

      default:
        break;
    }
  }

  bindEvents() {
    const self = this;

    $(this.element).on(CT_EVENT_CLICK, function clicked(event) {
      event.preventDefault();

      if ($(this).hasClass(self.options.classes.active)) return;

      self.show();
    });
  }

  activate() {
    $(this.controller).removeClass(this.options.classes.active);
    $(this.element).addClass(this.options.classes.active);

    $(this.group).removeClass(this.options.classes.active);
    $(this.options.target).addClass(this.options.classes.active);
  }

  show() {
    this.activate();

    switch (this.options.animationType) {
      case 'fade':
        $(this.group).removeClass(this.options.classes.show);

        setTimeout(() => {
          $(this.options.target).addClass(this.options.classes.show);
        }, 50);
        break;

      case 'custom':
        $(this.group)
          .css({
            opacity: 0,
          })
          .removeClass(this.options.animation);

        setTimeout(() => {
          $(this.options.target)
            .css({
              opacity: 1,
            })
            .addClass(this.options.animation);
        }, 50);
        break;

      default:
        break;
    }
  }

  dispose() {
    $(this.element).removeAttr('data-controls');
    $(this.element).removeData(CT_DATA_KEY);
    $(this.element).off(CT_EVENT_CLICK);
    this.element = null;
  }

  static jQueryInterface(action, config) {
    return this.each(function init() {
      const options =
        config && $.isPlainObject(config)
          ? $.extend(true, {}, config, $(this).data())
          : $.extend(true, {}, $(this).data());
      let data = $(this).data(CT_DATA_KEY);

      if (!data) {
        data = new CustomTab(this, options);
        $(this).data(CT_DATA_KEY, data);
      }

      if (typeof action === 'string') {
        if (typeof data[action] === 'undefined') {
          throw new TypeError(`No method named "${action}"`);
        }

        data[action]();
      }
    });
  }
}

if (jQuery) {
  const NO_CONFLICT = $.fn[CT_NAME];
  $.fn[CT_NAME] = CustomTab.jQueryInterface;
  $.fn[CT_NAME].Constructor = CustomTab;
  $.fn[CT_NAME].noConflict = () => {
    $.fn[CT_NAME] = NO_CONFLICT;
    return CustomTab.jQueryInterface;
  };
}
