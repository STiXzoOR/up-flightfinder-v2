/* eslint-disable max-classes-per-file */
class BSScrollSpy {
  constructor(element, config) {
    this.element = element;
    this.config = config;
    this.items = $();

    this.init();
    this.bindEvents();
  }

  init() {
    const self = this;

    this.element.find('a[href^="#"]').each(function init(i, el) {
      const $this = $(el);

      if (!$this.data('BSScrollSpySection')) {
        $this.data('BSScrollSpySection', new BSScrollSpySection($this, self.config));

        self.items = self.items.add($this);
      }
    });
  }

  bindEvents() {
    const self = this;

    this.element.on('click.BSScrollSpy', 'a[href^="#"]', function click(e) {
      const link = this;
      const target = $(this).data('BSScrollSpySection');

      self.lockHightlight = true;
      if (self.current) self.current.unhighlight();
      link.blur();
      self.current = $(link).data('BSScrollSpySection');
      self.current.highlight();

      target.show(function show() {
        self.lockHightlight = false;
      });

      e.preventDefault();
    });
  }

  highlight() {
    const self = this;
    let current;

    if (!this.items.length || this.lockHightlight) return;

    const scrollTop = $(window).scrollTop();

    if (scrollTop + $(window).height() === $(document).height()) {
      this.current = this.items.last().data('BSScrollSpySection');

      this.unhighlight();
      this.current.highlight();
      this.current.changeHash();

      return;
    }

    this.items.each(function changeState(i, el) {
      const section = $(el).data('BSScrollSpySection');

      if (scrollTop > section.offset + self.config.customOffsetTop) {
        current = section;
      }
    });

    if (current && this.current !== current) {
      this.unhighlight();
      current.highlight();
      if (this.current) current.changeHash();

      this.current = current;
    }
  }

  unhighlight() {
    this.items.each(function unhighlight(i, el) {
      $(el).data('BSScrollSpySection').unhighlight();
    });
  }
}

class BSScrollSpySection {
  constructor(element, config) {
    const self = this;

    this.element = element;
    this.config = config;

    Object.defineProperty(this, 'section', {
      value: $(self.element.attr('href')),
    });

    Object.defineProperty(this, 'offset', {
      get() {
        const header = config.parent;
        const headerStyles = getComputedStyle(header.get(0));
        const headerPosition = headerStyles.position;
        let offset = self.section.offset().top;

        if (header.length && headerPosition === 'fixed' && parseInt(headerStyles.top, 10) === 0) {
          offset -= header.outerHeight() - parseInt(headerStyles.marginTop, 10);
        }

        return offset;
      },
    });
  }

  show(callback) {
    const self = this;

    if (!this.section.length) return;

    this.changeHash();

    $('html').removeClass('smooth-scroll');

    $('html, body')
      .stop()
      .animate(
        {
          scrollTop: self.offset + self.config.customOffsetTop,
        },
        {
          duration: self.config.duration,
          complete() {
            $('html, body')
              .stop()
              .animate(
                {
                  scrollTop: self.offset + self.config.customOffsetTop,
                },
                {
                  duration: self.config.duration,
                  complete() {
                    $('html').addClass('smooth-scroll');
                    if ($.isFunction(callback)) callback();
                  },
                }
              );
          },
        }
      );
  }

  changeHash() {
    this.section.attr('id', '');
    window.location.hash = this.element.attr('href');
    this.section.attr('id', this.element.attr('href').slice(1));
  }

  highlight() {
    this.element.addClass(this.config.activeClass);
  }

  unhighlight() {
    this.element.removeClass(this.config.activeClass);
  }
}
