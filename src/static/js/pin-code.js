const PC_DATA_KEY = 'PinCode';
const PC_EVENT_KEY = `.${PC_DATA_KEY}`;
const PC_EVENT_KEYDOWN = `keydown${PC_EVENT_KEY}`;
const PC_EVENT_KEYUP = `keyup${PC_EVENT_KEY}`;
const PC_EVENT_FOCUS = `focus${PC_EVENT_KEY}`;
const PC_EVENT_BLUR = `blur${PC_EVENT_KEY}`;

class PinCode {
  constructor(element, options) {
    this.element = element;
    this.options = options;
    this.options.classes = {
      wrapper: 'pin-code-wrapper',
      input: 'form-control pin-code-input',
      active: 'active',
    };

    this.init();
    this.bindEvents();
  }

  init() {
    this.inputs = [];

    for (let i = 0; i < this.options.codeLength; i++) {
      const input = $('<input/>')
        .attr({
          id: `pinCode${i}`,
          type: 'tel',
          maxlength: 1,
          inputmode: 'numeric',
          'x-inputmode': 'numeric',
          autocomplete: 'off',
          autocorrect: 'off',
          autocapitalize: 'off',
          spellcheck: false,
          role: 'presentation',
        })
        .prop({ required: true })
        .addClass(`${this.options.classes.input} ${this.options.extraClasses}`);

      this.inputs.push(input);
    }

    const errorMessage = $('<div/>').addClass('invalid-feedback').text('Verification code is required.');

    $(this.element)
      .addClass(this.options.classes.wrapper)
      .append(...this.inputs);
    $(this.element).parent().append(errorMessage);
    $(this.element).closest('form').attr('autocomplete', 'off');
  }

  bindEvents() {
    const self = this;

    this.inputs.forEach((input) => {
      let hasValue = false;

      input.on(PC_EVENT_KEYDOWN, function keyDown(event) {
        const $this = $(this);

        switch (event.keyCode) {
          case 9:
            break;
          case 8:
            hasValue = $this.val().trim();
            break;
          case 46:
          case 37:
          case 39:
            break;
          default:
            $this.val('');
        }
      });

      input.on(PC_EVENT_KEYUP, function keyUp(event) {
        const $this = $(this);

        switch (event.keyCode) {
          case 9:
            break;
          case 8:
          case 46:
            if (hasValue) break;
            if (self.findPrevious($this)) self.findPrevious($this).select();
            break;
          case 37:
            if (self.findPrevious($this)) self.findPrevious($this).select();
            break;
          case 39:
            if (self.findNext($this)) self.findNext($this).select();
            break;
          default:
            self.jump($this);
        }
      });

      input.on(PC_EVENT_FOCUS, function focus() {
        $(this).select();
        $(this).addClass(self.options.classes.active);
      });

      input.on(PC_EVENT_BLUR, function blur() {
        $(this).removeClass(self.options.classes.active);
      });
    });
  }

  normalizeValue(value) {
    const self = this;
    return value.trim().slice(-1);
  }

  clearCode() {
    this.inputs.forEach((input, index) => {
      if (index === 0) input.focus();
      input.val('');
    });
  }

  getCode() {
    return this.inputs.reduce((acc, input) => {
      acc += input.val() ? input.val().trim() : '';
      return acc;
    }, '');
  }

  findNext(current) {
    if (!current.length || !current.next().length) return false;

    return !current.next().is('input') ? this.findNext(current.next()) : current.next();
  }

  findPrevious(current) {
    if (!current.length || !current.prev().length) return false;

    return !current.prev().is('input') ? this.findPrevious(current.prev()) : current.prev();
  }

  jump(current) {
    if (current.val()) {
      if (current.val().trim().length > 1) {
        current.val(this.normalizeValue(current.val()));

        if (this.findNext(current)) this.findNext(current).select();
        else this.deactivate(current);
      } else if (this.findNext(current)) this.findNext(current).select();
      else this.deactivate(current);
    }
  }

  deactivate(input) {
    input.val(this.normalizeValue(input.val()));
    input.blur();
  }
}
