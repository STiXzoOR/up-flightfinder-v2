/* eslint-disable no-underscore-dangle */

let roundTripSelectedDates;
let oneWaySelectedDate;

function formatAirports(airport) {
  if (!airport.id) {
    return airport.text;
  }

  const args = airport.text.split(' ');
  const code = args.pop();
  const name = args.join(' ');
  const $airport = $('<span/>').addClass('flex-center-between').text(name);
  const $code = $('<span/>').addClass('font-size-12 text-muted ml-2').text(code);

  $code.appendTo($airport);

  return $airport;
}

$.fn.headerReveal = function headerReveal() {
  const $w = $(window);
  const $main = $('main');
  const breakpoints = {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
  };

  const self = this;
  this.element = $(this);
  this.scrolled = false;
  this.revealed = false;
  this.breakpoint = breakpoints[$(this).data('breakpoint')];
  this.isAbsolute = $(this)
    .attr('class')
    .match(/header-abs|header-sm-abs|header-md-abs|header-lg-abs|header-xl-abs/);

  return (
    $w.on('scroll', () => {
      if ($w.width() >= self.breakpoint) {
        if ($w.scrollTop() > self.element.outerHeight() && !self.scrolled) {
          self.element.addClass('scrolled');
          self.element.addClass('transition-scroll-none');
          self.element.addClass('header-moved-up');

          if (!self.isAbsolute) {
            $main.css({ 'margin-top': self.outerHeight() });
          }

          self.scrolled = true;
        } else if ($w.scrollTop() <= self.element.outerHeight() && self.scrolled) {
          self.element.removeClass('scrolled');

          if (!self.isAbsolute) {
            $main.css({ 'margin-top': '' });
          }

          if (self.scrollTimeOutId) clearTimeout(self.scrollTimeOutId);

          self.scrollTimeOutId = setTimeout(() => {
            self.element.removeClass('header-moved-up');
          }, 10);

          self.scrolled = false;
        }

        if ($w.scrollTop() > 400 && !self.revealed) {
          self.element.removeClass('transition-scroll-none');

          if (self.transitionTimeoutID) clearTimeout(self.transitionTimeoutID);

          self.element.removeClass('header-moved-up');
          self.revealed = true;
        } else if ($w.scrollTop() <= 400 && self.revealed) {
          self.element.addClass('header-moved-up');

          if (!self.isAbsolute) {
            $main.css({ 'margin-top': self.outerHeight() });
          }

          self.transitionTimeoutID = setTimeout(() => {
            self.element.addClass('transition-scroll-none');
          }, 300);

          self.revealed = false;
        }
      }
    }),
    this
  );
};

$.fn.classCheckList = function classCheckList() {
  return this.on('click', (e) => {
    if ($(e.target).hasClass('selected')) return;

    $(e.currentTarget).find('.selected').removeClass('selected');

    const result = $('#passengerClassResult');
    const resultInput = $('#passengersClassInput');
    const resultInputData = JSON.parse(resultInput.val());
    const [passengersCount] = result.text().split(', ');
    const selectedClass = $(e.target).addClass('selected').text();

    result.text(`${passengersCount}, ${selectedClass}`);
    resultInputData.class = selectedClass;
    resultInput.val(JSON.stringify(resultInputData));
  });
};

$.fn.syncText = function syncText() {
  return this.each(function init() {
    const self = this;
    this.element = $(this);
    this.isInput = $(this).is('input');
    this.targetPlaceholder = $(this).data('sync-placeholder');
    this.evaluateValue = (target, value) => {
      if (target.is('input')) {
        target.val(value);
      } else {
        target.text(value);
      }
    };

    let target = $(this).data('sync-controls');
    let parent = $(this).data('sync-parent');
    parent = ($(`#${parent}`).length && $(`#${parent}`)) || $(`.${parent}`);
    target = (parent.find(`#${target}`).length && parent.find(`#${target}`)) || parent.find(`.${target}`);

    $(this).on('change paste keyup', () => {
      let value = self.targetPlaceholder;

      if (self.isInput && self.element.val()) {
        value = self.element.val();
      } else if (!self.isInput && self.element.text()) {
        value = self.element.text();
      }

      self.evaluateValue(target, value);
    });

    $(this).trigger('change');
  });
};

const datePicker = {
  defaultConfig: {
    allowInput: true,
    altInput: true,
    locale: {
      firstDayOfWeek: 1,
      rangeSeparator: ' - ',
    },
    onClose: (selectedDates, dateStr, instance) => {
      if (instance.config.mode === 'range') {
        if (selectedDates.length === 1) {
          instance.setDate([selectedDates[0], selectedDates[0]], true);
        }

        if (selectedDates[0].getTime() === selectedDates[1].getTime()) {
          const selectedDate = instance.formatDate(selectedDates[0], instance.config.altFormat);
          instance._input.value = `${selectedDate} - ${selectedDate}`;
          instance.input.value = `${instance.input.value} - ${instance.input.value}`;
        }
      }
    },
  },

  init(selector, config) {
    if (!$(selector).length) return;

    this.selector = $(selector);
    this.config = config && $.isPlainObject(config) ? $.extend({}, this.defaultConfig, config) : this.defaultConfig;

    this.initDatePicker();
  },

  initDatePicker() {
    const self = this;

    this.selector.each((i, el) => {
      const $this = $(el);
      const config = $.extend({}, self.config);
      const mode = $this.data('mode');
      const container = $this.data('container');
      const allowMonth = $this.data('month-selector-type') === 'dropdown';
      const allowYear = $this.data('year-selector-type') === 'dropdown';
      const preselectedDates = $this.data('preselected-dates');
      const defaultSelected = $this.data('default-selected-dates');
      const today = new Date();

      if (preselectedDates && mode === 'range') {
        const todayPlusDate = new Date();
        todayPlusDate.setDate(todayPlusDate.getDate() + 10);
        config.defaultDate = [today, todayPlusDate];
      } else if (preselectedDates && mode === 'single') {
        config.defaultDate = today;
      } else if (defaultSelected) {
        config.defaultDate = defaultSelected;
      }

      config.appendTo = container ? container[0] : $this.parent()[0];

      const fp = $this.flatpickr(config);

      if (allowMonth) {
        $this.parent().addClass('allow-month-change');
      }

      if (allowYear) {
        $this.parent().addClass('allow-year-change');
      }

      fp._input.onkeydown = () => false;
    });
  },
};

const customSelect = {
  defaultConfig: {
    containerCssClass: ':all:',
    theme: 'bootstrap',
  },

  init(selector, config) {
    if (!$(selector).length) return;

    this.selector = $(selector);
    this.config = config && $.isPlainObject(config) ? $.extend({}, this.defaultConfig, config) : this.defaultConfig;

    this.initCustomSelect();
  },

  initCustomSelect() {
    const that = this;

    this.selector.each(function init(i, el) {
      const self = this;
      const config = $.extend({}, that.config);
      const container = $(el).data('dropdown-parent');
      const formatResult = $(el).data('format-result');
      const formatSelection = $(el).data('format-selection');

      this.element = $(el);
      this.parent = $(el).parent();
      this.dropBelow = true;
      this.isOpened = false;

      config.dropdownParent = container ? container[0] : $(el).parent()[0];
      if (formatResult) config.templateResult = window[formatResult];
      if (formatSelection) config.templateSelection = window[formatSelection];

      $(el).select2(config);

      const select2 = $(el).data('select2');

      this.element.on('select2:open', () => {
        self.parent.addClass('focused');

        if (!select2.options.multiple) {
          select2.dropdown.$search.attr(
            'placeholder',
            select2.options.placeholder !== '' ? select2.options.placeholder : 'Select option...'
          );
        }
        select2.dropdown.$dropdown.hide();
        self.dropBelow = select2.dropdown.$dropdown.hasClass('select2-dropdown--below');

        setTimeout(() => {
          select2.dropdown.$dropdown
            .css('opacity', 0)
            .stop(true, true)
            .fadeIn(300, 'swing', () => {
              if (!select2.options.multiple) {
                select2.dropdown.$search.focus();
              }
            })
            .animate(
              { opacity: 1, top: self.dropBelow ? '0.25rem' : '-0.25rem' },
              { queue: false, duration: 300, easing: 'swing' }
            );
        }, 10);

        self.isOpened = true;
      });

      this.element.on('select2:closing', (e) => {
        if (self.isOpened) {
          e.preventDefault();
          e.stopPropagation();

          select2.dropdown.$dropdown
            .fadeOut(200, 'swing', () => {
              self.element.select2('close');
            })
            .animate(
              { opacity: 0, top: self.dropBelow ? '1.25rem' : '-1.25rem' },
              {
                queue: false,
                duration: 200,
                easing: 'swing',
              }
            );
          self.isOpened = false;
        }
      });

      this.element.on('select2:close', () => {
        setTimeout(() => {
          self.parent.removeClass('focused');
          $(':focus').blur();
        }, 1);
      });
    });
  },
};

function displayAdultCount(adults, children, infants) {
  const result = $('#passengerClassResult');
  const resultInput = $('#passengersClassInput');
  const resultInputData = JSON.parse(resultInput.val());
  const selectedClass = resultInputData.class;

  if (adults >= 1 && (infants > 0 || children > 0)) {
    result.text(`${adults + children + infants} Passengers, ${selectedClass}`);
  } else if (adults > 1 && children === 0 && infants === 0) {
    result.text(`${adults} Adults, ${selectedClass}`);
  } else {
    result.text(`${adults} Adult, ${selectedClass}`);
  }

  resultInputData.passengers.adults = adults;

  const passengers = {
    adults: resultInputData.passengers.adults,
    children: resultInputData.passengers.children,
    infants: resultInputData.passengers.infants,
  };

  resultInputData.passengers.total = Object.values(passengers).reduce((a, b) => a + b);
  resultInput.val(JSON.stringify(resultInputData));
}

function displayChildrenCount(adults, children, infants) {
  const result = $('#passengerClassResult');
  const resultInput = $('#passengersClassInput');
  const resultInputData = JSON.parse(resultInput.val());
  const selectedClass = resultInputData.class;

  if (children > 0 || (children === 0 && infants > 0)) {
    result.text(`${children + adults + infants} Passengers, ${selectedClass}`);
  } else if (children === 0 && adults > 1 && infants === 0) {
    result.text(`${adults} Adults, ${selectedClass}`);
  } else {
    result.text(`${adults} Adult, ${selectedClass}`);
  }

  resultInputData.passengers.children = children;

  const passengers = {
    adults: resultInputData.passengers.adults,
    children: resultInputData.passengers.children,
    infants: resultInputData.passengers.infants,
  };

  resultInputData.passengers.total = Object.values(passengers).reduce((a, b) => a + b);
  resultInput.val(JSON.stringify(resultInputData));
}

function displayInfantCount(adults, children, infants) {
  const result = $('#passengerClassResult');
  const resultInput = $('#passengersClassInput');
  const resultInputData = JSON.parse(resultInput.val());
  const selectedClass = resultInputData.class;

  if (infants > 0 || (infants === 0 && children > 0)) {
    result.text(`${infants + adults + children} Passengers, ${selectedClass}`);
  } else if (infants === 0 && adults > 1 && children === 0) {
    result.text(`${adults} Adults, ${selectedClass}`);
  } else {
    result.text(`${adults} Adult, ${selectedClass}`);
  }

  resultInputData.passengers.infants = infants;

  const passengers = {
    adults: resultInputData.passengers.adults,
    children: resultInputData.passengers.children,
    infants: resultInputData.passengers.infants,
  };

  resultInputData.passengers.total = Object.values(passengers).reduce((a, b) => a + b);
  resultInput.val(JSON.stringify(resultInputData));
}

function initCounters() {
  const adultCounter = new QuantityCounter('#adultCounter');
  const childrenCounter = new QuantityCounter('#childrenCounter');
  const infantCounter = new QuantityCounter('#infantCounter');

  adultCounter.setMin(1);
  adultCounter.setMax(9);
  childrenCounter.setMin(0);
  infantCounter.setMin(0);
  infantCounter.setMax(1);

  adultCounter.plus = function () {
    QuantityCounter.prototype.plus.call(this);
    infantCounter.setMax(this.getNumber());
    childrenCounter.setMax(9 - this.getNumber());

    displayAdultCount(this.getNumber(), childrenCounter.getNumber(), infantCounter.getNumber());
  };

  adultCounter.minus = function () {
    QuantityCounter.prototype.minus.call(this);
    infantCounter.setMax(this.getNumber());
    if (infantCounter.getNumber() > this.getNumber()) {
      infantCounter.setNumber(this.getNumber());
      infantCounter.setMax(this.getNumber());
    }
    childrenCounter.setMax(9 - this.getNumber());

    displayAdultCount(this.getNumber(), childrenCounter.getNumber(), infantCounter.getNumber());
  };

  childrenCounter.plus = function () {
    QuantityCounter.prototype.plus.call(this);
    adultCounter.setMax(9 - this.getNumber());

    displayChildrenCount(adultCounter.getNumber(), this.getNumber(), infantCounter.getNumber());
  };

  childrenCounter.minus = function () {
    QuantityCounter.prototype.minus.call(this);
    adultCounter.setMax(9 - this.getNumber());

    displayChildrenCount(adultCounter.getNumber(), this.getNumber(), infantCounter.getNumber());
  };

  infantCounter.plus = function () {
    QuantityCounter.prototype.plus.call(this);

    displayInfantCount(adultCounter.getNumber(), childrenCounter.getNumber(), this.getNumber());
  };

  infantCounter.minus = function () {
    QuantityCounter.prototype.minus.call(this);

    displayInfantCount(adultCounter.getNumber(), childrenCounter.getNumber(), this.getNumber());
  };
}

const rangeSlider = {
  defaultConfig: {
    skin: 'bootstrap',
    prettify_separator: ',',
    onStart: () => {},
    onChange: () => {},
    onFinish: () => {},
    onUpdate: () => {},
  },

  init(selector, config) {
    if (!$(selector).length) return;

    this.selector = $(selector);
    this.config = config && $.isPlainObject(config) ? $.extend({}, this.defaultConfig, config) : this.defaultConfig;

    this.initRangeSlider();
  },

  initRangeSlider() {
    const { config } = this;

    this.selector.each((i, el) => {
      const $this = $(el);
      const type = $this.data('type');
      const minResult = $this.data('result-min');
      const maxResult = $this.data('result-max');
      const hasGrid = Boolean($this.data('grid'));

      $this.ionRangeSlider(config);
      const slider = $(el).data('ionRangeSlider');

      $(el).on('change', () => {
        if (minResult && type === 'single') {
          if ($(minResult).is('input')) {
            $(minResult).val(slider.from);
          } else {
            $(minResult).text(slider.from);
          }
        } else if (minResult || (maxResult && type === 'double')) {
          if ($(minResult).is('input')) {
            $(minResult).val(slider.from);
          } else {
            $(minResult).text(slider.from);
          }

          if ($(minResult).is('input')) {
            $(maxResult).val(slider.to);
          } else {
            $(maxResult).text(slider.to);
          }
        }

        if (hasGrid && type === 'single') {
          $(slider.result.slider)
            .find('.irs-grid-text')
            .each(function setCurrent() {
              const current = $(this);

              if ($(current).text() === slider.from) {
                $(slider.result.slider).find('.irs-grid-text').removeClass('current');
                $(current).addClass('current');
              }
            });
        }
      });

      if (minResult && type === 'single' && $(minResult).is('input')) {
        $(minResult).on('change', function changeVal() {
          slider.update({
            from: $(this).val(),
          });
        });
      } else if (
        minResult ||
        (maxResult && type === 'double' && $(minResult).is('input')) ||
        $(maxResult).is('input')
      ) {
        $(minResult).on('change', function changeVal() {
          slider.update({
            from: $(this).val(),
          });
        });
        $(maxResult).on('change', function changeVal() {
          slider.update({
            to: $(this).val(),
          });
        });
      }
    });
  },
};

function initCheckedBaggage() {
  const BaggageObj = function BaggageObj(el) {
    this.element = $(el);
    this.baggage = {
      small: {
        element: $(el).find('.small-bag'),
        price: $(el).find('.small-bag').data('price'),
        weight: $(el).find('.small-bag').data('weight'),
        btn: $(el).find('.small-bag').find('.btn-add-bag'),
      },
      large: {
        element: $(el).find('.large-bag'),
        price: $(el).find('.large-bag').data('price'),
        weight: $(el).find('.large-bag').data('weight'),
        btn: $(el).find('.large-bag').find('.btn-add-bag'),
      },
    };
    this.input = $($(el).closest('.baggage-info').find('input[type="hidden"]'));
    this.baggageList = $($(el).closest('.baggage-info').find('.baggage-list'))[0];
    this.summaryTarget = $($(el).closest('.passenger-details-card').data('summary-target'));
    this.type = $(el).data('type');
    this.quantity = 0;
    this.max = 5;
    this.added = false;

    this.bindEvents();
  };

  BaggageObj.prototype = {
    constructor: BaggageObj,

    bindEvents() {
      const self = this;

      this.baggage.small.btn.on('click', () => {
        self.add('small');
      });

      this.baggage.large.btn.on('click', () => {
        self.add('large');
      });
    },

    evaluateButtons() {
      this.baggage.small.btn.prop('disabled', this.quantity === this.max);
      this.baggage.large.btn.prop('disabled', this.quantity === this.max);
    },

    add(bag) {
      const self = this;
      const itemsList = this.summaryTarget.find('.items');
      const passengersPrice = $('#passengersSummary').find('#totalPassengersPrice');
      const totalPrice = $('#totalSummary').find('#totalPrice');
      let item = null;
      let itemNameWrapper = null;
      let itemQuantity = null;
      let itemName = null;
      let itemPrice = null;

      if (this.added || itemsList.find('.checked-bag').length) {
        item = itemsList.find('.checked-bag');
        itemNameWrapper = item.find('.item-name');
        itemQuantity = itemNameWrapper.find('.quantity');
        itemName = itemNameWrapper.children().last();
        itemPrice = item.find('.item-price');
      } else {
        item = $('<li/>').addClass('checked-bag flex-center-between mt-2');
        itemNameWrapper = $('<h6/>').addClass('item-name');
        itemQuantity = $('<span/>').addClass('quantity').text(0);
        itemName = $('<span/>').text('x checked bag');
        itemPrice = $('<span/>').addClass('item-price').text(0);

        itemQuantity.appendTo(itemNameWrapper);
        itemName.appendTo(itemNameWrapper);
        itemNameWrapper.appendTo(item);
        itemPrice.appendTo(item);
        item.appendTo(itemsList);
      }

      const row = this.baggageList.insertRow(-1);
      const cell1 = row.insertCell(-1);
      const cell2 = row.insertCell(-1);
      const cell3 = row.insertCell(-1);
      const cell4 = row.insertCell(-1);

      $(cell1).addClass('font-weight-medium text-left w-sm-25').attr('scope', 'row').text('Checked bag');
      $(cell2).text(`${this.baggage[bag].weight}kg`);
      $(cell3).text(`€${this.baggage[bag].price}`);
      $(cell4).addClass('py-0').attr('align', 'middle');

      const btn = $('<button/>')
        .addClass('btn btn-icon btn-xs btn-remove-bag btn-secondary rounded-circle')
        .attr('type', 'button');
      btn.append($('<i/>').addClass('fas fa-times fa-fw'));
      btn.appendTo(cell4);

      btn.on('click', () => {
        self.remove(row, bag);
      });

      this.added = true;
      this.quantity += 1;
      this.summaryItem = item;
      itemQuantity.text(parseInt(itemQuantity.text(), 10) + 1);
      this.updatePrice(itemPrice, this.baggage[bag].price);
      this.updatePrice(passengersPrice, this.baggage[bag].price);
      this.updatePrice(totalPrice, this.baggage[bag].price);
      this.updateInput(bag, 1);
      this.evaluateButtons();
    },

    remove(row, bag) {
      const itemsList = this.summaryTarget.find('.items');
      const passengersPrice = $('#passengersSummary').find('#totalPassengersPrice');
      const totalPrice = $('#totalSummary').find('#totalPrice');
      const item = itemsList.find('.checked-bag');
      const itemQuantity = item.find('.quantity');
      const itemPrice = item.find('.item-price');

      $(row).remove();

      if (parseInt(itemQuantity.text(), 10) === 1) {
        this.summaryItem.remove();
        this.summaryItem = null;
      } else {
        itemQuantity.text(parseInt(itemQuantity.text(), 10) - 1);
        this.updatePrice(itemPrice, -this.baggage[bag].price);
      }

      this.quantity -= 1;
      if (this.quantity === 0) {
        this.added = false;
      }

      this.updatePrice(passengersPrice, -this.baggage[bag].price);
      this.updatePrice(totalPrice, -this.baggage[bag].price);
      this.updateInput(bag, -1);
      this.evaluateButtons();
    },

    updatePrice(target, price) {
      target.text(`${parseInt(target.text().replace(/,/g, ''), 10) + price}`).trigger('change');
    },

    updateInput(bag, quantity) {
      const inputData = JSON.parse(this.input.val());

      inputData[this.type][bag] += quantity;
      this.input.val(JSON.stringify(inputData));
    },
  };

  $('.add-baggage').each((i, el) => new BaggageObj(el));
}

// TODO: reimplement the insurance method
function initInsuranceCard() {
  $('.insurance-card').each(function init() {
    const self = this;

    this.element = $(this);
    this.selected = false;
    this.selectBtn = $(this).find('.btn-select-insurance');
    this.removeBtn = $(this).find('.btn-remove-insurance');
    this.type = $(this).data('type');
    this.price = parseInt($(this).data('price'), 10);
    this.input = $($(this).closest('.insurance-info').find('input[type="hidden"]'));
    this.summaryTarget = $($(this).closest('.passenger-details-card').data('summary-target'));

    this.selectBtn.on('click', function clicked() {
      const active = self.element.closest('.insurance-info').find('.selected');
      if (active.length) {
        active[0].removeBtn.trigger('click');
      }

      $(this).prop('disabled', true);

      const itemsList = self.summaryTarget.find('.items');
      const passengersPrice = $('#passengersSummary').find('#totalPassengersPrice');
      const totalPrice = $('#totalSummary').find('#totalPrice');
      const item = $('<li/>').addClass('insurance flex-center-between mt-2');
      const itemName = $('<h6/>').addClass('item-name').text('insurance');
      const itemPrice = $('<span/>')
        .addClass('item-price')
        .text(`${self.price ? `€${self.price}` : 'free'}`);

      itemName.appendTo(item);
      itemPrice.appendTo(item);
      item.appendTo(itemsList);

      passengersPrice.text(`${parseInt(passengersPrice.text().replace(/,/g, ''), 10) + self.price}`);
      totalPrice.text(`${parseInt(totalPrice.text().replace(/,/g, ''), 10) + self.price}`).trigger('change');

      self.item = item;
      self.input.val(self.type);
      self.element.addClass('selected');

      self.selected = true;
    });

    this.removeBtn.on('click', function clicked() {
      if (!self.selected) return;
      self.selectBtn.prop('disabled', false);

      const passengersPrice = $('#passengersSummary').find('#totalPassengersPrice');
      const totalPrice = $('#totalSummary').find('#totalPrice');

      self.item.remove();
      self.item = null;

      passengersPrice.text(`${parseInt(passengersPrice.text().replace(/,/g, ''), 10) - self.price}`);
      totalPrice.text(`${parseInt(totalPrice.text().replace(/,/g, ''), 10) - self.price}`).trigger('change');

      self.input.val('');
      self.element.removeClass('selected');

      self.selected = false;
    });
  });
}

$('.needs-validation').on('submit', function validateForm(e) {
  if ($(this)[0].checkValidity() === false) {
    e.preventDefault();
    e.stopPropagation();
    $(this).addClass('was-validated');
    return false;
  }
  return true;
});

$(document).on('click.bs.dropdown.data-api', '.dropdown .keep-open', (e) => {
  e.stopPropagation();
});

$('.uppercase-input').on('keyup paste', function uppercase() {
  $(this).val($(this).val().toUpperCase()).trigger('change');
});

$('#navRoundtripPillTab').on('click', () => {
  $('#flightSearchForm').find('input[name="type"]').val('RT');

  let fp = $('#departReturnDatepicker')[0]._flatpickr;
  [oneWaySelectedDate] = fp.selectedDates;

  if (!roundTripSelectedDates) roundTripSelectedDates = [oneWaySelectedDate, oneWaySelectedDate];
  const departDate = oneWaySelectedDate;
  const arrivalDate =
    departDate.getTime() > roundTripSelectedDates[1].getTime() ? departDate : roundTripSelectedDates[1];

  roundTripSelectedDates = [departDate, arrivalDate];

  fp.destroy();
  datePicker.init('#departReturnDatepicker', { disableMobile: 'true' });
  fp = $('#departReturnDatepicker')[0]._flatpickr;

  fp.set('mode', 'range');
  fp.setDate(roundTripSelectedDates, true);
  fp.close();
});

$('#navOnewayPillTab').on('click', () => {
  $('#flightSearchForm').find('input[name="type"]').val('OW');

  let fp = $('#departReturnDatepicker')[0]._flatpickr;
  roundTripSelectedDates = fp.selectedDates;

  $(fp.input).val('');
  $(fp._input).val('');
  fp.destroy();
  datePicker.init('#departReturnDatepicker', fp.isMobile ? { disableMobile: 'false' } : {});
  fp = $('#departReturnDatepicker')[0]._flatpickr;

  fp.set('mode', 'single');
  fp.setDate(roundTripSelectedDates[0], true);
});

$('#fromAirport').on('change', function filter() {
  const value = $(this).val();

  $('#toAirport').find('option:not(:first-child):disabled').prop('disabled', false);
  $('#toAirport').find(`option[value="${value}"]`).prop('disabled', true);
});

$('#toAirport').on('change', function filter() {
  const value = $(this).val();

  $('#fromAirport').find('option:not(:first-child):disabled').prop('disabled', false);
  $('#fromAirport').find(`option[value="${value}"]`).prop('disabled', true);
});

$('.btn-reverse-destinations').on('click', function reverse() {
  const $icon = $(this).children().first();
  const $from = $('select[name="fromAirport"]');
  const $to = $('select[name="toAirport"]');
  const fromVal = $from.val();
  const toVal = $to.val();

  if (fromVal === null && toVal === null) return;

  $icon.removeClass('fa-exchange-alt').addClass('fa-sync fa-spin text-primary');

  if (this.animationTimeoutID) clearTimeout(this.animationTimeoutID);
  this.animationTimeoutID = setTimeout(() => {
    $icon.removeClass('fa-spin fa-sync text-primary').addClass('fa-exchange-alt');
  }, 300);

  $from.find('option:not(:first-child):disabled').prop('disabled', false);
  $to.find('option:not(:first-child):disabled').prop('disabled', false);

  $from.val(toVal).trigger('change');
  $to.val(fromVal).trigger('change');
});

$('#navCreditCardTab').on('click', () => {
  $('#navTabsContent').find('input[name="paymentType"]').val('credit');
});

$('#navPayPalTab').on('click', () => {
  $('#navTabsContent').find('input[name="paymentType"]').val('paypal');
});
});

$(() => {
  $('.page-header').headerReveal();
  datePicker.init('.flatpickr-input');
  customSelect.init('.select2-input');
  rangeSlider.init('.ion-range-slider-input');
  initCounters();
  initCheckedBaggage();
  initInsuranceCard();
  $('.class-list').classCheckList();
  $('[data-toggle="tooltip"]').tooltip();
  $('[data-toggle="popover"]').popover();
  $('[data-toggle="sync-text"]').syncText();

  setTimeout(() => {
    $('#preloader').fadeOut(500);
  }, 3000);
});
