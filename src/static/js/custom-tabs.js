/* eslint-disable no-underscore-dangle */
class CustomTabs {
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

    $(this.element).on('click', function clicked(event) {
      event.preventDefault();

      if ($(this).hasClass(self.options.classes.active)) return;

      self.activate();
      self._show();
    });
  }

  activate() {
    $(this.controller).removeClass(this.options.classes.active);
    $(this.element).addClass(this.options.classes.active);
  }

  _show() {
    $(this.group).removeClass(this.options.classes.active);
    $(this.options.target).addClass(this.options.classes.active);

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
}
