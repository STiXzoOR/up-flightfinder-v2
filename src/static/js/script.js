/* eslint-disable no-underscore-dangle */

let roundTripSelectedDates;
let oneWaySelectedDate;

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

$.fn.customSelect2 = function customSelect2(options) {
  this.select2(options);

  const self = this;
  this.element = $(this);
  this.parent = this.element.parent();
  this.select = this.element.data('select2');
  this.options = this.select.options;
  this.dropdown = this.select.dropdown;
  this.dropBelow = true;
  this.isOpened = false;

  return (
    this.element.on('select2:open', () => {
      self.parent.addClass('focused');

      if (!self.options.multiple) {
        self.dropdown.$search.attr(
          'placeholder',
          self.options.placeholder !== '' ? self.options.placeholder : 'Select option...'
        );
      }
      self.dropdown.$dropdown.hide();
      self.dropBelow = self.dropdown.$dropdown.hasClass('select2-dropdown--below');

      setTimeout(() => {
        self.dropdown.$dropdown
          .css('opacity', 0)
          .stop(true, true)
          .fadeIn(300, 'swing', () => {
            if (!self.options.multiple) {
              self.dropdown.$search.focus();
            }
          })
          .animate(
            { opacity: 1, top: self.dropBelow ? '0.25rem' : '-0.25rem' },
            { queue: false, duration: 300, easing: 'swing' }
          );
      }, 10);

      self.isOpened = true;
    }),
    this.element.on('select2:closing', (e) => {
      if (self.isOpened) {
        e.preventDefault();
        e.stopPropagation();

        self.dropdown.$dropdown
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
    }),
    this.element.on('select2:close', () => {
      setTimeout(() => {
        self.parent.removeClass('focused');
        $(':focus').blur();
      }, 1);
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

function initCalendars() {
  $('.flatpickr-input').each((i, el) => {
    const $this = $(el);
    const isInline = Boolean($this.data('datepicker-inline'));
    const mode = $this.data('datepicker-mode');
    const minDate = $this.data('datepicker-min-date');
    const maxDate = $this.data('datepicker-max-date');
    const container = $this.data('datepicker-container');
    const displayDateFormat = $this.data('datepicker-display-date-format');
    const sendDateFormat = $this.data('datepicker-send-date-format');
    const preselectedDates = $this.data('datepicker-preselected-dates');

    const today = new Date();
    let defaultDates = null;

    if (preselectedDates && mode === 'range') {
      const todayPlusDate = new Date();
      todayPlusDate.setDate(todayPlusDate.getDate() + 10);
      defaultDates = [today, todayPlusDate];
    } else if (preselectedDates && mode === 'single') {
      defaultDates = today;
    }

    const fp = $this.flatpickr({
      allowInput: true,
      altInput: true,
      inline: isInline,
      defaultDate: defaultDates,
      mode: mode || 'single',
      altFormat: displayDateFormat || 'd M Y',
      dateFormat: sendDateFormat || 'Y-m-d',
      minDate: minDate || 'today',
      maxDate: maxDate || false,
      appendTo: container ? container[0] : $this.parent()[0],
      monthSelectorType: 'static',
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
          }
        }
      },
    });

    fp._input.onkeydown = () => false;
  });
}

function initSelect2() {
  $('.custom-select2 select').each((i, el) => {
    const $this = $(el);
    const container = $this.data('dropdown-parent');

    $this.customSelect2({
      containerCssClass: ':all:',
      dropdownParent: container ? container[0] : $this.parent()[0],
      theme: 'bootstrap',
    });
  });
}

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

  resultInputData.adults = adults;
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

  resultInputData.children = children;
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

  resultInputData.infants = infants;
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

    displayAdultCount(adultCounter.getNumber(), this.getNumber(), infantCounter.getNumber());
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
  const fp = $('#departReturnDatepicker')[0]._flatpickr;
  [oneWaySelectedDate] = fp.selectedDates;

  const departDate = oneWaySelectedDate;
  const arrivalDate =
    departDate.getTime() > roundTripSelectedDates[1].getTime() ? departDate : roundTripSelectedDates[1];

  roundTripSelectedDates = [departDate, arrivalDate];

  fp.set('mode', 'range');
  fp.setDate(roundTripSelectedDates, true);
  fp.close();
});

$('#navOnewayPillTab').on('click', () => {
  const fp = $('#departReturnDatepicker')[0]._flatpickr;
  roundTripSelectedDates = fp.selectedDates;

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
});

$(() => {
  $('.page-header').headerReveal();
  initCalendars();
  initSelect2();
  initCounters();
  $('.class-list').classCheckList();
  setTimeout(() => {
    $('#preloader').fadeOut(500);
  }, 3000);
});
