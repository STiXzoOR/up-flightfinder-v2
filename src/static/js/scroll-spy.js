/* eslint-disable max-classes-per-file */
const SS_DATA_KEY = 'CustomScrollSpy';
const SS_EVENT_KEY = `.${SS_DATA_KEY}`;
const SS_EVENT_CLICK = `click${SS_EVENT_KEY}`;

const SS_SECTION_DATA_KEY = 'CustomScrollSpySection';
const SS_SECTION_EVENT_KEY = `.${SS_SECTION_DATA_KEY}`;
const SS_SECTION_EVENT_CLICK = `click${SS_SECTION_EVENT_KEY}`;

class CustomScrollSpy {
  constructor(element, options) {
    this.element = element;
    this.options = options;
    this.options.classes = {
      active: 'active',
    };
    this.items = $();

    this.init();
    this.bindEvents();
    this.highlight();
  }

  init() {
    const self = this;

    $(this.element)
      .find('a[href^="#"]')
      .each((i, el) => {
        const $this = $(el);

        if (!$this.data(SS_SECTION_DATA_KEY)) {
          $this.data(SS_SECTION_DATA_KEY, new CustomScrollSpySection(el, self.options));

          self.items = self.items.add($this);
        }
      });
  }

  bindEvents() {
    const self = this;

    $(this.element).on(SS_EVENT_CLICK, 'a[href^="#"]', function click(event) {
      event.preventDefault();

      const link = this;
      const target = $(this).data(SS_SECTION_DATA_KEY);

      self.lockHightlight = true;
      if (self.current) self.current.unhighlight();
      link.blur();
      self.current = $(link).data(SS_SECTION_DATA_KEY);
      self.current.highlight();

      target.show(() => {
        self.lockHightlight = false;
      });
    });
  }

  highlight() {
    const self = this;
    let current;

    if (!this.items.length || this.lockHightlight) return;

    const scrollTop = $(window).scrollTop();

    if (scrollTop + $(window).height() === $(document).height()) {
      this.current = this.items.last().data(SS_SECTION_DATA_KEY);

      this.unhighlight();
      this.current.highlight();
      this.current.changeHash();

      return;
    }

    this.items.each((i, el) => {
      const section = $(el).data(SS_SECTION_DATA_KEY);

      if (scrollTop > section.offset + self.options.customOffsetTop) {
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
    this.items.each((i, el) => {
      $(el).data(SS_SECTION_DATA_KEY).unhighlight();
    });
  }
}

class CustomScrollSpySection {
  constructor(element, options) {
    this.element = element;
    this.options = options;
    this.section = $($(element).attr('href'));
  }

  get offset() {
    const header = this.options.parent;
    const headerStyles = getComputedStyle(header.get(0));
    const headerPosition = headerStyles.position;
    let offset = this.section.offset().top;

    if (header.length && headerPosition === 'fixed' && parseInt(headerStyles.top, 10) === 0) {
      offset -= header.outerHeight() - parseInt(headerStyles.marginTop, 10);
    }

    return offset;
  }

  show(callback) {
    if (!this.section.length) return;

    const self = this;

    this.changeHash();

    $('html').removeClass('smooth-scroll');

    $('html, body')
      .stop()
      .animate(
        {
          scrollTop: self.offset + self.options.customOffsetTop,
        },
        {
          duration: self.options.duration,
          complete() {
            $('html, body')
              .stop()
              .animate(
                {
                  scrollTop: self.offset + self.options.customOffsetTop,
                },
                {
                  duration: self.options.duration,
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
    window.location.hash = $(this.element).attr('href');
    this.section.attr('id', $(this.element).attr('href').slice(1));
  }

  highlight() {
    $(this.element).addClass(this.options.classes.active);
  }

  unhighlight() {
    $(this.element).removeClass(this.options.classes.active);
  }
}
