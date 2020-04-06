const QuantityCounter = function QuantityCounter(el) {
  this.element = $(el);
  this.$plus = this.element.find("[data-counter-btn-type='plus']");
  this.$minus = this.element.find("[data-counter-btn-type='minus']");
  this.$result = this.element.find('.counter-num');
  this.value = this.$result.text() !== '' ? parseInt(this.$result.text(), 10) : 0;
  this.min = 0;
  this.max = 8;

  this.bindEvents();
};

QuantityCounter.prototype = {
  constructor: QuantityCounter,

  bindEvents() {
    const self = this;

    this.$plus.on('click', () => {
      self.plus();
    });

    this.$minus.on('click', () => {
      self.minus();
    });
  },

  evaluateButtons() {
    this.$minus.toggleClass('disabled', this.value === this.getMin());
    this.$plus.toggleClass('disabled', this.value === this.getMax());
  },

  plus() {
    this.setNumber(this.value < this.getMax() ? this.value + 1 : this.value);
    this.evaluateButtons();
  },

  minus() {
    this.setNumber(this.value > this.getMin() ? this.value - 1 : this.value);
    this.evaluateButtons();
  },

  setNumber(number) {
    this.value = number;
    this.$result.text(this.value);
  },

  getNumber() {
    return this.value;
  },

  setMax(max) {
    this.max = max;
    this.evaluateButtons();
  },

  setMin(min) {
    this.min = min;
    if (this.value < min) {
      this.value = min;
      this.$result.text(this.value);
    }

    this.evaluateButtons();
  },

  getMax() {
    return this.max;
  },

  getMin() {
    return this.min;
  }
};
