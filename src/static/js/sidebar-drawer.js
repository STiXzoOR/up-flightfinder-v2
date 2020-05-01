const SidebarDrawer = function SidebarDrawer(el, config = { breakpoint: '', transitionDuration: '' }) {
  this.config = config;
  this.element = el;
  this.backdrop = null;
  [this.content] = $(el).find('.sidebar-content');
  this.ignoreBackdropClick = false;
  this.isShown = false;
  this.breakpoint = this.config.breakpoint === '' ? '' : `-${this.config.breakpoint}`;
  this.transitionDuration = this.config.transitionDuration === '' ? 300 : this.config.transitionDuration;
};

SidebarDrawer.prototype = {
  constructor: SidebarDrawer,

  reflow(element) {
    return element.offsetHeight;
  },

  show(relatedTarget) {
    const self = this;

    if (this.isTransitioning || this.isShown) {
      return;
    }

    this.isTransitioning = true;

    const showEvent = $.Event('show.bs.navdrawer', {
      relatedTarget,
    });
    $(this.element).trigger(showEvent);

    if (this.isShown || showEvent.isDefaultPrevented()) {
      return;
    }

    this.isShown = true;

    $(this.element).addClass(`sidebar-drawer${this.breakpoint}`);
    $(this.element).on('click.dismiss.bs.navdrawer', '[data-dismiss="sidebar-drawer"]', (event) => self.hide(event));
    $(this.content).on('mousedown.dismiss.bs.navdrawer', () => {
      $(self.element).one('mouseup.dismiss.bs.navdrawer', (event) => {
        if ($(event.target).is(self.element)) {
          self.ignoreBackdropClick = true;
        }
      });
    });

    this.showBackdrop();
    this.showDrawer(relatedTarget);
  },

  hide(event) {
    const self = this;

    if (event) {
      event.preventDefault();
    }

    if (this.isTransitioning || !this.isShown) {
      return;
    }

    const hideEvent = $.Event('hide.bs.navdrawer');
    $(this.element).trigger(hideEvent);

    if (!this.isShown || hideEvent.isDefaultPrevented()) {
      return;
    }

    this.isShown = false;
    this.isTransitioning = true;

    $(document).off('focusin.bs.navdrawer');
    $('body').removeClass(`sidebar-drawer${this.breakpoint}-open`);
    $(this.element).removeClass('show');

    $(this.element).off('click.dismiss.bs.navdrawer');
    $(this.content).off('mousedown.dismiss.bs.navdrawer');

    if (this.transitionTimeoutId) clearTimeout(this.transitionTimeoutId);
    this.transitionTimeoutId = setTimeout(() => self.hideDrawer(), this.transitionDuration);

    this.showBackdrop();
  },

  showDrawer(relatedTarget) {
    const self = this;

    if (!$(this.element).parent() || $(this.element).parent()[0].nodeType !== Node.ELEMENT_NODE) {
      $('body').appendChild(this.element);
    }

    $(this.element).css({ display: 'block' });
    $(this.element).removeAttr('aria-hidden');

    this.reflow(this.element);

    $('body').addClass(`sidebar-drawer${this.breakpoint}-open`);
    $(this.element).addClass('show');

    this.enforceFocus();

    const shownEvent = $.Event('shown.bs.navdrawer', {
      relatedTarget,
    });

    if (this.transitionTimeoutId) clearTimeout(this.transitionTimeoutId);

    this.transitionTimeoutId = setTimeout(() => {
      self.element.focus();
      self.isTransitioning = false;
      $(this.element).trigger(shownEvent);
    }, this.transitionDuration);
  },

  hideDrawer() {
    $(this.element).css({ display: 'none' });
    $(this.element).setAttr('aria-hidden', true);
    this.isTransitioning = false;

    $(this.element).trigger('hidden.bs.navdrawer');
  },

  showBackdrop() {
    const self = this;

    if (this.isShown) {
      this.backdrop = document.createElement('div');

      $(this.backdrop)
        .addClass('sidebar-drawer-backdrop')
        .addClass(`sidebar-drawer${this.breakpoint}-backdrop`)
        .appendTo(document.body);

      $(this.element).on('click.dismiss.bs.navdrawer', (event) => {
        if (self.ignoreBackdropClick) {
          self.ignoreBackdropClick = false;
          return;
        }

        if (event.target !== event.currentTarget) {
          return;
        }

        self.hide();
      });

      this.reflow(this.backdrop);
      $(this.backdrop).addClass('show');
    } else if (!this.isShown && this.backdrop) {
      $(this.backdrop).removeClass('show');
      this.removeBackdrop();
    }
  },

  removeBackdrop() {
    if (this.backdrop) {
      $(this.backdrop).remove();
      this.backdrop = null;
    }
  },

  enforceFocus() {
    const self = this;

    $(document)
      .off('focusin.bs.navdrawer')
      .on('focusin.bs.navdrawer', (event) => {
        if (
          document !== event.target &&
          self.element !== event.target &&
          $(self.element).has(event.target).length === 0
        ) {
          self.element.focus();
        }
      });
  },
};
