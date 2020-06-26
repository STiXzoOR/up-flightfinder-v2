/* eslint-disable no-underscore-dangle */

let roundTripSelectedDates;
let oneWaySelectedDate;

// https://medium.com/simplejs/detect-the-users-device-type-with-a-simple-javascript-check-4fc656b735e1
function isMobile() {
  const agent = navigator.userAgent || navigator.vendor || window.opera;

  return (
    /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
      agent
    ) ||
    /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel(i|m)|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(
      agent.substr(0, 4)
    )
  );
}

function addBtnLoader(btn) {
  const spinner = $('<span/>')
    .attr({ id: 'loader', role: 'status', 'aria-hidden': 'true' })
    .addClass('spinner-border spinner-border-sm mr-2');
  const wrapper = $('<span/>').attr('id', 'text').addClass('align-middle');

  btn.wrapInner(wrapper);
  btn.prepend(spinner);
}

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

function toggleAvatarLoader(action) {
  const loader = $('#avatarLoadingOverlay');
  const parent = loader.parent();

  loader[action]();
  parent.blur().css({ 'pointer-events': `${action === 'show' ? 'none' : ''}` });
}

// TODO: Needs refactoring
function proccessAvatar(el, action) {
  toggleAvatarLoader('show');

  const $this = $(el);
  const isUpload = action === 'upload';
  const elements = {};
  const actions = {
    upload: { method: 'put', url: '/user/edit/avatar/upload' },
    delete: { method: 'delete', url: '/user/edit/avatar/delete' },
  };
  const fetchData = {
    url: actions[action].url,
    args: { method: actions[action].method },
  };
  const limits = {
    mimes: {
      allowed: ['image/jpeg', 'image/pjpeg', 'image/png'],
      message: 'Invalid file type. Only jpg and png image files are allowed.',
    },
    size: {
      allowed: 1024 * 1024,
      message: 'The file is too big. Please upload a file smaller than 1MB.',
    },
  };

  if (isUpload && $this.val() === '') {
    toggleAvatarLoader('hide');
    return;
  }

  if (isUpload && $this[0].files && $this[0].files[0]) {
    const file = $this[0].files[0];

    if (!limits.mimes.allowed.includes(file.type)) {
      alert(limits.mimes.message);
      toggleAvatarLoader('hide');
      return;
    }

    if (file.size > limits.size.allowed) {
      alert(limits.size.message);
      toggleAvatarLoader('hide');
      return;
    }

    const formData = new FormData();

    formData.append($this.attr('name'), file);
    fetchData.args.body = formData;
  }

  [
    {
      target: {
        name: 'image',
        type: 'img',
        id: 'avatarImage',
        size: 'large',
        overlay: 'avatarLoadingOverlay',
        classes: 'avatar-img',
      },
      placeholder: { type: 'span', id: 'avatarImagePlaceholder', classes: 'avatar-initials invisible' },
    },
    {
      target: {
        name: 'icon',
        type: 'img',
        id: 'avatarIcon',
        size: 'small',
        classes: 'd-none d-md-inline-block img-fluid rounded-circle ml-md-2',
      },
      placeholder: {
        type: 'i',
        id: 'avatarIconPlaceholder',
        classes: 'd-none d-md-inline-block fas fa-user-circle font-size-md-30 ml-md-2 invisible',
      },
    },
  ].forEach((element) => {
    const isImage = element.target.name === 'image';
    let data = {
      target: { id: `#${element.target.id}`, type: element.target.type },
      placeholder: { id: `#${element.placeholder.id}`, type: element.placeholder.type },
    };
    const { classes } = isUpload ? element.target : element.placeholder;
    if (!isUpload) [data.target, data.placeholder] = [data.placeholder, data.target];

    let target = $(data.target.id);
    if (!target.length)
      target = $(`<${data.target.type}/>`)
        .attr({ id: data.target.id.slice(1) })
        .addClass(classes);

    const placeholder = $(data.placeholder.id);
    const parent = placeholder.length ? placeholder.parent() : target.parent();

    if (isUpload) target.attr('alt', placeholder.text());
    else if (isImage) target.text(placeholder.attr('alt'));

    data = {
      target,
      placeholder,
      parent,
    };

    if (isUpload) data.size = element.target.size;
    if (element.target.overlay) data.overlay = $(`#${element.target.overlay}`);

    elements[element.target.name] = data;
  });

  fetch(fetchData.url, fetchData.args)
    .then((response) => response.json())
    .then((response) => {
      if (response.error) {
        alert(response.message);
        toggleAvatarLoader('hide');
        return;
      }

      Object.keys(elements).forEach((name) => {
        const isImage = name === 'image';
        elements[name].target.one('load', function loaded() {
          if (elements[name].overlay) elements[name].overlay.hide();
          if (elements[name].placeholder.length) {
            if (isUpload && isImage) {
              const deleteBtn = $('<button/>')
                .attr({ id: 'btnDeleteAvatar', type: 'button' })
                .addClass('btn btn-md btn-icon btn-circle btn-danger ml-3')
                .append($('<i/>').addClass('fas fa-times fa-fw'));

              deleteBtn.on('click', function deleteAvatar() {
                $(this).remove();
                return proccessAvatar(this, 'delete');
              });

              deleteBtn.insertAfter('#btnEditAvatar');
            }
            elements[name].placeholder.remove();
            if (isUpload) elements[name].parent.append($(this));
            else $(this).removeClass('invisible');
          }
          elements[name].parent.css({ 'pointer-events': '' });
        });

        if (isUpload) elements[name].target.attr({ src: response.urls[elements[name].size] });
        else {
          elements[name].parent.append(elements[name].target);
          elements[name].target.trigger('load');
        }
      });
    })
    .catch((error) => {
      toggleAvatarLoader('hide');
      console.log(error);
    });
}

$.fn.headerReveal = function headerReveal() {
  const $w = $(window);
  const $main = $('main');
  const breakpoint = $(this).data('breakpoint');
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
  this.breakpoint = breakpoints[breakpoint];
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

$.fn.goUp = function goUp() {
  const $this = $(this);

  this.on('click', () => {
    $('html').scrollTop(0);
  });

  $(window).on('scroll', () => {
    $this.toggleClass('active', window.scrollY > 400);
  });
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
    this.valueType = $(this).data('sync-type');
    this.targetPlaceholder = $(this).data('sync-placeholder');

    this.evaluateValue = (target, value) => {
      const normalizedValue = self.valueType && self.valueType === 'numeric' ? value.replace(/[,.]/g, '') : value;

      if (target.is('input')) {
        target.val(normalizedValue);
      } else {
        target.text(normalizedValue);
      }
    };

    let parent = $(this).data('sync-parent');
    let target = $(this).data('sync-controls');
    parent = $(`#${parent}`).length ? $(`#${parent}`) : $(`.${parent}`);
    target = parent.find(`#${target}`).length ? parent.find(`#${target}`) : parent.find(`.${target}`);

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

$.fn.showHidePassword = function showHidePassword() {
  const $this = $(this);
  const toggler = $('<div/>').attr('id', 'btnShowHidePassword').addClass('btn-password');

  toggler.on('click', function toggle() {
    const active = $(this).hasClass('show');

    $(this).toggleClass('show', !active);
    $this.attr('type', active ? 'password' : 'text');
  });

  $this.after(toggler);
};

const customScrollSpy = {
  defaultConfig: {
    duration: 400,
    customOffsetTop: 0,
    activeClass: 'active',
    parent: '.page-header',
  },

  items: $(),

  init(collection, config) {
    const self = this;

    if (!collection || !collection.length) return;

    collection.each((i, el) => {
      const $this = $(el);
      const itemConfig =
        config && $.isPlainObject(config)
          ? $.extend(true, {}, self.defaultConfig, config, $this.data())
          : $.extend(true, {}, self.defaultConfig, $this.data());
      itemConfig.parent = $(itemConfig.parent);

      if (!$this.data('BSScrollSpy')) {
        $this.data('BSScrollSpy', new BSScrollSpy($this, itemConfig));

        self.items = self.items.add($this);
      }
    });

    $(window)
      .on('scroll.BSScrollSpy', () => {
        self.items.each((i, el) => {
          $(el).data('BSScrollSpy').highlight();
        });
      })
      .trigger('scroll.BSScrollSpy');
  },
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

      $(fp._input).on('focus', function blur() {
        $(this).blur();
      });

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

const passwordStrength = {
  defaultConfig: {},

  init(selector, config) {
    if (!$(selector).length) return;

    this.selector = $(selector);
    this.config =
      config && $.isPlainObject(config)
        ? $.extend(true, {}, this.defaultConfig, config, $(selector).data())
        : $.extend(true, {}, this.defaultConfig, $(selector).data());

    this.selector.each((i, el) => {
      if (!$(el).data('PasswordStrength')) {
        $(el).data('PasswordStrength', new PasswordStrength(el));
      }
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
  if (!$('.counter-controls').length) return;

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
  const Baggage = function Baggage(element) {
    this.element = element;
    this.baggage = {
      small: {
        element: $(element).find('.small-bag'),
        price: $(element).find('.small-bag').data('price'),
        weight: $(element).find('.small-bag').data('weight'),
        btn: $(element).find('.small-bag').find('.btn-add-bag'),
      },
      large: {
        element: $(element).find('.large-bag'),
        price: $(element).find('.large-bag').data('price'),
        weight: $(element).find('.large-bag').data('weight'),
        btn: $(element).find('.large-bag').find('.btn-add-bag'),
      },
    };
    this.input = $(element).closest('.baggage-info').find('input[type="hidden"]');
    [this.baggageList] = $(element).closest('.baggage-info').find('.baggage-list');
    this.summaryTarget = $($(element).closest('.passenger-details-card').data('summary-target'));
    this.itemsList = this.summaryTarget.find('.items');
    this.passengersPrice = $('#passengersSummary').find('#totalPassengersPrice');
    this.totalPrice = $('#totalSummary').find('#totalPrice');
    this.type = $(element).data('type');
    this.routeType = this.type === 'oneway' ? 'Depart' : 'Return';
    this.quantity = 0;
    this.max = 5;
    this.added = false;

    this.bindEvents();
  };

  Baggage.prototype = {
    constructor: Baggage,

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

      let item = null;
      let itemNameWrapper = null;
      let itemQuantity = null;
      let itemName = null;
      let itemPrice = null;

      if (this.added || this.itemsList.find('.checked-bag').length) {
        item = this.itemsList.find('.checked-bag');
        itemNameWrapper = item.find('.item-name');
        itemQuantity = itemNameWrapper.find('.quantity');
        itemName = itemNameWrapper.children().last();
        itemPrice = item.find('.item-price');
      } else {
        const itemPriceWrapper = $('<span/>').addClass('font-size-14').text('€');

        item = $('<li/>').addClass('checked-bag flex-center-between mt-2');
        itemNameWrapper = $('<h6/>').addClass('item-name');
        itemQuantity = $('<span/>').addClass('quantity').text(0);
        itemName = $('<span/>').text('x checked bag');
        itemPrice = $('<span/>').addClass('item-price').text(0);

        itemQuantity.appendTo(itemNameWrapper);
        itemName.appendTo(itemNameWrapper);
        itemNameWrapper.appendTo(item);
        itemPrice.appendTo(itemPriceWrapper);
        itemPriceWrapper.appendTo(item);
        item.appendTo(this.itemsList);
      }

      const row = this.baggageList.insertRow(-1);
      const cell1 = row.insertCell(-1);
      const cell2 = row.insertCell(-1);
      const cell3 = row.insertCell(-1);
      const cell4 = row.insertCell(-1);
      const cell5 = row.insertCell(-1);

      $(cell1).addClass('font-weight-medium text-left w-sm-30 w-md-25').attr('scope', 'row').text('Checked bag');
      $(cell2).text(this.routeType);
      $(cell3).text(`${this.baggage[bag].weight}kg`);
      $(cell4).text(`€${this.baggage[bag].price}`);
      $(cell5).addClass('py-0').attr('align', 'middle');

      const btn = $('<button/>')
        .addClass('btn btn-icon btn-xs btn-remove-bag btn-secondary rounded-circle')
        .attr('type', 'button');
      btn.append($('<i/>').addClass('fas fa-times fa-fw'));
      btn.appendTo(cell5);

      btn.on('click', () => {
        self.remove(row, bag);
      });

      this.added = true;
      this.quantity += 1;
      this.summaryItem = item;
      itemQuantity.text(parseInt(itemQuantity.text(), 10) + 1);
      this.updatePrice(itemPrice, this.baggage[bag].price);
      this.updatePrice(this.passengersPrice, this.baggage[bag].price);
      this.updatePrice(this.totalPrice, this.baggage[bag].price);
      this.updateInput(bag, 1);
      this.evaluateButtons();
    },

    remove(row, bag) {
      const item = this.itemsList.find('.checked-bag');
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

      this.updatePrice(this.passengersPrice, -this.baggage[bag].price);
      this.updatePrice(this.totalPrice, -this.baggage[bag].price);
      this.updateInput(bag, -1);
      this.evaluateButtons();
    },

    updatePrice(target, price) {
      target.text((parseInt(target.text().replace(/[,.]/g, ''), 10) + price).toLocaleString()).trigger('change');
    },

    updateInput(bag, quantity) {
      const inputData = JSON.parse(this.input.val());

      inputData[this.type][bag] += quantity;
      this.input.val(JSON.stringify(inputData));
    },
  };

  $('.add-baggage').each((i, el) => {
    if (!$(el).data('Baggage')) $(el).data('Baggage', new Baggage(el));
  });
}

function initInsuranceCard() {
  const Insurance = function Insurance(element) {
    this.element = element;
    this.selected = false;
    this.selectBtn = $(element).find('.btn-select-insurance');
    this.removeBtn = $(element).find('.btn-remove-insurance');
    this.type = $(element).data('type');
    this.price = parseInt($(element).data('price'), 10);
    this.input = $(element).closest('.insurance-info').find('input[type="hidden"]');
    this.summaryTarget = $($(element).closest('.passenger-details-card').data('summary-target'));
    this.itemsList = this.summaryTarget.find('.items');
    this.passengersPrice = $('#passengersSummary').find('#totalPassengersPrice');
    this.totalPrice = $('#totalSummary').find('#totalPrice');

    this.bindEvents();
  };

  Insurance.prototype = {
    constructor: Insurance,

    bindEvents() {
      const self = this;

      this.selectBtn.on('click', () => {
        self.add();
      });

      this.removeBtn.on('click', () => {
        self.remove();
      });
    },

    evaluateButtons() {
      this.selectBtn.prop('disabled', this.selected);
    },

    add() {
      const active = $(this.element).closest('.insurance-info').find('.selected');

      if (active.length) {
        active.data('Insurance').remove();
      }

      this.selected = true;
      $(this.element).addClass('selected');

      const item = $('<li/>').addClass('insurance flex-center-between mt-2');
      const itemName = $('<h6/>').addClass('item-name').text('insurance');
      const itemPrice = $('<span/>')
        .addClass('item-price')
        .text(`${this.price ? `€${this.price}` : 'free'}`);

      itemName.appendTo(item);
      itemPrice.appendTo(item);
      item.appendTo(this.itemsList);

      this.item = item;

      this.updatePrice(this.passengersPrice, this.price);
      this.updatePrice(this.totalPrice, this.price);
      this.updateInput(this.type);
      this.evaluateButtons();
    },

    remove() {
      if (!this.selected) return;

      this.selected = false;
      $(this.element).removeClass('selected');

      this.item.remove();
      this.item = null;

      this.updatePrice(this.passengersPrice, -this.price);
      this.updatePrice(this.totalPrice, -this.price);
      this.updateInput(this.type);
      this.evaluateButtons();
    },

    updatePrice(target, price) {
      target.text((parseInt(target.text().replace(/[,.]/g, ''), 10) + price).toLocaleString()).trigger('change');
    },

    updateInput(type) {
      this.input.val(type);
    },
  };

  $('.insurance-card').each((i, el) => {
    if (!$(el).data('Insurance')) $(el).data('Insurance', new Insurance(el));
  });
}

$('.needs-validation').on('submit', function validateForm(e) {
  if ($(this)[0].checkValidity() === false) {
    e.preventDefault();
    e.stopPropagation();
    $(this).addClass('was-validated');
    return false;
  }

  const submitter = $(this).find(':submit');
  if (submitter.is('[data-toggle="loader"]')) addBtnLoader(submitter);

  return true;
});

$(document).on('click.bs.dropdown.data-api', '.dropdown .keep-open', (e) => {
  e.stopPropagation();
});

$('.dropdown .keep-open').on('click', 'a[data-close="dropdown"]', function close() {
  $(this).closest('.dropdown').find('.dropdown-toggle').dropdown('toggle');
});

$('.uppercase-input').on('keyup paste', function uppercase() {
  $(this).val($(this).val().toUpperCase()).trigger('change');
});

$('#navRoundtripPillTab').on('click', () => {
  const target = '#departReturnDatepicker';
  $('#flightSearchForm').find('input[name="type"]').val('RT');

  let fp = $(target)[0]._flatpickr;
  [oneWaySelectedDate] = fp.selectedDates;

  if (!roundTripSelectedDates) roundTripSelectedDates = [oneWaySelectedDate, oneWaySelectedDate];
  const departDate = oneWaySelectedDate;
  const arrivalDate =
    departDate.getTime() > roundTripSelectedDates[1].getTime() ? departDate : roundTripSelectedDates[1];

  roundTripSelectedDates = [departDate, arrivalDate];

  fp.destroy();

  $(target).attr('data-mode', 'range');
  datePicker.init(target, { disableMobile: true });

  fp = $(target)[0]._flatpickr;
  fp.setDate(roundTripSelectedDates, true);
  fp.close();
});

$('#navOnewayPillTab').on('click', () => {
  const target = '#departReturnDatepicker';
  $('#flightSearchForm').find('input[name="type"]').val('OW');

  let fp = $(target)[0]._flatpickr;
  roundTripSelectedDates = fp.selectedDates;

  $(fp.input).val('');
  $(fp._input).val('');
  fp.destroy();

  $(target).attr('data-mode', 'single');
  datePicker.init(target, isMobile() ? { disableMobile: false } : {});

  fp = $(target)[0]._flatpickr;
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

$('#navPaymentTabs').on('click', 'a[data-toggle="tab"]', (e) => {
  $('#navPaymentTabsContent').find('input[name="paymentType"]').val(e.currentTarget.dataset.type);
});

$('a[data-toggle="tab"][data-type="custom"]').on('click', function clicked(e) {
  e.preventDefault();
  const id = $(this).closest('.tab-pane.active').attr('id');
  const target = $(this).data('target');
  const targetToggler = $(target).find(`a[data-toggle="tab"][data-target="#${id}"]`);

  targetToggler.removeClass('active').attr('aria-selected', false);
  $(this).tab('show');
});

$('#cardYear').on('change', function fixMonth() {
  const value = parseInt($(this).val(), 10);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const disableMonth = value === currentYear;

  if (disableMonth && parseInt($('#cardMonth').val(), 10) < currentMonth) {
    $('#cardMonth').find('option:selected').prop('selected', false);
    $('#cardMonth').find(`option[value="${currentMonth}"]`).prop('selected', true).trigger('change');
  }

  $('#cardMonth option').each((i, el) =>
    $(el).prop('disabled', parseInt($(el).val(), 10) < currentMonth && disableMonth)
  );
});

$('#cardNumber').on('change keyup paste', function format() {
  if (!/^\d+[\d\W\s-]*$/g.test($(this).val())) return;

  const number = $(this).val().replace(/\D+/g, '');
  const groups = number.match(/(\d{1,4})/g);
  const formatted = groups.join('-').slice(0, 19);

  $(this).val(formatted);
});

$('#uploadAvatar').on('change', function uploadAvatar() {
  return proccessAvatar(this, 'upload');
});

$('#btnDeleteAvatar').on('click', function deleteAvatar() {
  $(this).remove();
  return proccessAvatar(this, 'delete');
});

$(() => {
  $('[data-toggle="tooltip"]').tooltip();
  $('[data-toggle="popover"]').popover();
  $('[data-toggle="sync-text"]').syncText();
  $('[data-type="password"]').each((i, el) => $(el).showHidePassword());
  $('.page-header').headerReveal();
  $('.btn-go-up').goUp();
  $('.class-list').classCheckList();
  customScrollSpy.init($('.nav-scroll'));
  passwordStrength.init('[data-toggle="password-strength"]');
  datePicker.init('.flatpickr-input');
  customSelect.init('.select2-input');
  rangeSlider.init('.ion-range-slider-input');
  initCounters();
  initCheckedBaggage();
  initInsuranceCard();

  setTimeout(() => {
    $('#preloader').fadeOut(500);
  }, 2000);
});
