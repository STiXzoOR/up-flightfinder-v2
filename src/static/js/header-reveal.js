const HR_DATA_KEY = 'HeaderReveal';
const HR_EVENT_KEY = `.${HR_DATA_KEY}`;
const HR_EVENT_SCROLL = `scroll${HR_EVENT_KEY}`;

class HeaderReveal {
  constructor(element, options) {
    this.element = element;
    this.options = {
      ...options,
      breakpoints: {
        xs: 0,
        sm: 576,
        md: 768,
        lg: 992,
        xl: 1200,
      },
      classes: {
        revealed: 'revealed',
        scrolled: 'scrolled',
        transition: 'transition-scroll-none',
        moved: 'header-moved-up',
        kill: 'no-header-reveal',
      },
    };
    this.scrolled = false;
    this.revealed = false;
  }

  update() {
    this.kill();

    if (!$(this.element).hasClass(this.options.classes.kill)) {
      if (window.scrollY > $(this.element).outerHeight() && !this.scrolled) this.initScroll();
      else if (window.scrollY <= $(this.element).outerHeight() && this.scrolled) this.resetScroll();

      if (window.scrollY > this.options.offset && !this.revelead) this.initReveal();
      else if (window.scrollY <= this.options.offset && this.revealed) this.resetReveal();
    }
  }

  initScroll() {
    $(this.element).addClass(this.options.classes.scrolled);
    $(this.element).addClass(this.options.classes.transition);
    $(this.element).addClass(this.options.classes.moved);
    this.setTargetMargin();

    this.scrolled = true;
  }

  resetScroll() {
    $(this.element).removeClass(this.options.classes.scrolled);
    this.removeTargetMargin();

    if (this.scrollTimeOutId) clearTimeout(this.scrollTimeOutId);

    this.scrollTimeOutId = setTimeout(() => {
      $(this.element).removeClass(this.options.classes.moved);
    }, 10);

    this.scrolled = false;
  }

  initReveal() {
    $(this.element).removeClass(this.options.classes.transition);

    if (this.transitionTimeoutID) clearTimeout(this.transitionTimeoutID);

    $(this.element).removeClass(this.options.classes.moved);
    $(this.element).addClass(this.options.classes.revealed);
    this.revealed = true;
  }

  resetReveal() {
    $(this.element).removeClass(this.options.classes.revealed);
    $(this.element).addClass(this.options.classes.moved);
    this.setTargetMargin();

    this.transitionTimeoutID = setTimeout(() => {
      $(this.element).addClass(this.options.classes.transition);
    }, 300);

    this.revealed = false;
  }

  setTargetMargin() {
    if (this.options.position !== 'absolute')
      $(this.options.target).css({ 'margin-top': $(this.element).outerHeight() });
  }

  removeTargetMargin() {
    if (this.options.position !== 'absolute') $(this.options.target).css({ 'margin-top': '' });
  }

  kill() {
    if (window.innerWidth <= this.options.breakpoints[this.options.breakpoint]) {
      $(this.element).addClass(this.options.classes.kill);
      this.removeTargetMargin();
    } else {
      $(this.element).removeClass(this.options.classes.kill);
      if ($(this.element).hasClass('scrolled')) this.setTargetMargin();
    }
  }
}
