/* eslint-disable vars-on-top */
/* eslint-disable no-var */
/* eslint-disable no-underscore-dangle */
const FH_DATA_KEY = 'FlightFilterHandler';
const FH_EVENT_KEY = `.${FH_DATA_KEY}`;
const FH_EVENT_CLICK = `click${FH_EVENT_KEY}`;
const FH_EVENT_CHANGE = `change${FH_EVENT_KEY}`;

function tsToTime(timestamp, options) {
  return new Date(timestamp).toLocaleTimeString('en-gb', options || {});
}

class FlightFilterHandler {
  constructor(options) {
    this.options = options;
    this.filters = {};
    this.searchParams = new URLSearchParams(window.location.search);
    this.elements = {
      container: '.flights-container',
      resultsTotal: $('#queryResultsTotal'),
      header: $('.page-header'),
      sortBy: $('#sortFlightsBy'),
      stopsItem: $('.filter-stops-item'),
      airlinesItem: $('.filter-airlines-item'),
      priceRange: $('#priceRange').data('ionRangeSlider'),
      departTimeRange: $('#departureTimeRange').data('ionRangeSlider'),
      returnTimeRange: $('#returnTimeRange').data('ionRangeSlider'),
    };
    this.btns = {
      loadMore: $('#loadMoreFlights'),
      clear: { element: $('.btn-clear-filters'), text: $('.btn-clear-filters').find('.text-clear') },
      clearMobile: {
        element: $('.btn-clear-filters-mobile'),
        height: $('.btn-clear-filters-mobile').outerHeight(),
        next: $('.btn-clear-filters-mobile').next(),
      },
    };
    this.defaults = {
      stops: this.getDefaultStops(),
      airlines: this.getDefaultAirlines(),
      priceRange: { from: options.price.min, to: options.price.max },
      departTimeRange: {
        from: tsToTime(options.departTime.min),
        to: tsToTime(options.departTime.max),
      },
    };
    this.isRoundtrip = this.searchParams.get('type') === 'RT';
    this.returnTimeRange = this.isRoundtrip
      ? {
          from: tsToTime(options.returnTime.min),
          to: tsToTime(options.returnTime.max),
        }
      : {};
    this.loadMore = false;
    this.isReset = false;
    this.hasFilter = false;

    this.init();
    this.bindEvents();
  }

  static rangeSliderFilter(self, data, slider) {
    const parsedData = ['departTimeRange', 'returnTimeRange'].includes(slider)
      ? { from: tsToTime(data.from), to: tsToTime(data.to) }
      : { from: data.from, to: data.to };

    self.filters[slider] = parsedData;

    self.filterHandler();
  }

  static checkBoxFilter(event) {
    const { self, type } = event.data;

    if (self.filters[type].length === 1 && [-1, ''].includes(self.filters[type][0])) self.filters[type].pop();

    const $this = $(this);
    const value = type === 'stops' ? parseInt($(this).val(), 10) : $(this).val();

    if ($this.is(':checked')) {
      self.filters[type].push(value);
    } else {
      const index = self.filters[type].indexOf(value);
      if (index > -1) {
        self.filters[type].splice(index, 1);
      }
    }

    if (self.filters[type].length === 0) self.filters[type].push(type === 'stops' ? -1 : '');

    self.filterHandler();
  }

  init() {
    this.filters = {
      orderBy: '',
      skip: 0,
      limit: 5,
      stops: [...this.defaults.stops],
      airlines: [...this.defaults.airlines],
    };
  }

  bindEvents() {
    const self = this;

    this.loadPreloader();

    this.elements.priceRange.update({
      onFinish: (data) => self.constructor.rangeSliderFilter(self, data, 'priceRange'),
    });

    this.elements.departTimeRange.update({
      min: this.options.departTime.min,
      max: this.options.departTime.max,
      from: this.options.departTime.min,
      to: this.options.departTime.max,
      step: 1800000,
      prettify: (timestamp) => tsToTime(timestamp, { hour: '2-digit', minute: '2-digit', hour12: false }),
      onFinish: (data) => self.constructor.rangeSliderFilter(self, data, 'departTimeRange'),
    });

    if (this.isRoundtrip) {
      this.elements.returnTimeRange.update({
        min: this.options.returnTime.min,
        max: this.options.returnTime.max,
        from: this.options.returnTime.min,
        to: this.options.returnTime.max,
        step: 1800000,
        prettify: (timestamp) => tsToTime(timestamp, { hour: '2-digit', minute: '2-digit', hour12: false }),
        onFinish: (data) => self.constructor.rangeSliderFilter(self, data, 'returnTimeRange'),
      });
    }

    $(document).on(FH_EVENT_CLICK, '[class*="btn-clear-filters"]', function clicked() {
      if (self.filters.priceRange) self.elements.priceRange.reset();
      if (self.filters.departTimeRange) self.elements.departTimeRange.reset();
      if (self.filters.returnTimeRange) self.elements.returnTimeRange.reset();

      if (self.elements.stopsItem.length) {
        self.elements.stopsItem.each((i, el) => {
          if (!$(el).is(':disabled')) $(el).prop('checked', true);
        });
      }

      if (self.elements.airlinesItem.length) {
        self.elements.airlinesItem.prop('checked', true);
      }

      if (self.elements.sortBy.length) {
        self.elements.sortBy.find('option:selected').prop('selected', false);
        self.elements.sortBy.first().prop('selected', true).trigger('change.select2');
      }

      $(this).blur();

      self.isReset = true;
      self.init();
      self.filterHandler();
    });

    $(document).on(FH_EVENT_CLICK, '#loadMoreFlights', function clicked() {
      self.filters.skip = parseInt($(this).data('skip'), 10);

      $(this).find('#text').text('Loading...');
      $(this).find('#loader').show();

      self.loadMore = true;
      self.filterHandler();
    });

    this.elements.sortBy.on(FH_EVENT_CHANGE, function sort() {
      self.filters.orderBy = $(this).val();

      self.filterHandler();
    });

    this.elements.stopsItem.on(FH_EVENT_CHANGE, null, { type: 'stops', self: this }, this.constructor.checkBoxFilter);
    this.elements.airlinesItem.on(
      FH_EVENT_CHANGE,
      null,
      { type: 'airlines', self: this },
      this.constructor.checkBoxFilter
    );
  }

  getDefaultStops() {
    return [
      ...this.elements.stopsItem.map(function value() {
        if (!$(this).is(':disabled')) return parseInt($(this).val(), 10);
      }),
    ];
  }

  getDefaultAirlines() {
    return [
      ...this.elements.airlinesItem.map(function value() {
        return $(this).val();
      }),
    ];
  }

  getOffset(element) {
    const headerStyles = getComputedStyle(this.elements.header.get(0));
    const headerPosition = headerStyles.position;
    let offset = element.offset().top;

    if (this.elements.header.length && headerPosition === 'fixed' && parseInt(headerStyles.top, 10) === 0) {
      offset -= this.elements.header.outerHeight() - parseInt(headerStyles.marginTop, 10);
    }

    return offset;
  }

  loadPreloader() {
    const preloader = $('<div/>')
      .attr({ id: 'preLoaderFiltering', 'data-bg': 'white' })
      .addClass('page-preloader page-preloader-image')
      .css({ display: 'none' });

    preloader.insertAfter(this.elements.container);
  }

  scrollToElement(element) {
    const self = this;

    $('html').removeClass('smooth-scroll');

    $('html, body')
      .stop()
      .animate(
        {
          scrollTop: self.getOffset(element) - 30,
        },
        {
          duration: 400,
          complete() {
            $('html, body')
              .stop()
              .animate(
                {
                  scrollTop: self.getOffset(element) - 30,
                },
                {
                  duration: 400,
                  complete() {
                    $('html').addClass('smooth-scroll');
                  },
                }
              );
          },
        }
      );
  }

  checkClearFilter() {
    const hasPriceRange =
      this.filters.priceRange &&
      Object.entries(this.filters.priceRange).toString() !== Object.entries(this.defaults.priceRange).toString();
    const hasDepartTimeRange =
      this.filters.departTimeRange &&
      Object.entries(this.filters.departTimeRange).toString() !==
        Object.entries(this.defaults.departTimeRange).toString();

    if (this.isRoundtrip)
      var hasReturnTimeRange =
        this.filters.returnTimeRange &&
        Object.entries(this.filters.returnTimeRange).toString() !==
          Object.entries(this.defaults.returnTimeRange).toString();

    if (
      hasPriceRange ||
      hasDepartTimeRange ||
      hasReturnTimeRange ||
      this.filters.stops.length !== this.defaults.stops.length ||
      (this.filters.stops.length === 1 && this.filters.stops[0] === -1) ||
      this.filters.airlines.length !== this.defaults.airlines.length
    ) {
      this.hasFilter = true;
      return;
    }

    this.hasFilter = false;
  }

  toggleClearBtn() {
    this.checkClearFilter();

    this.btns.clear.element.toggleClass('disabled', !this.hasFilter);
    this.btns.clearMobile.element.toggleClass('show', this.hasFilter);
    this.btns.clear.text.find('i').toggle(this.hasFilter);
    this.btns.clear.text.find('span').text(`${this.hasFilter ? 'CLEAR ' : ''}FILTERS`);
    this.btns.clearMobile.next.css({
      'padding-bottom': `${this.hasFilter ? `${this.btns.clearMobile.height}px` : ''}`,
    });
  }

  async filterHandler() {
    const self = this;

    if (!this.elements.preloader) this.elements.preloader = $('#preLoaderFiltering');
    this.btns.loadMore = $('#loadMoreFlights');

    const flightsContainer = $(this.elements.container);
    const totalFlights = parseInt(this.elements.resultsTotal.text(), 10);

    if (!this.loadMore && !this.isReset) {
      this.filters.limit = this.filters.skip ? this.filters.skip + 5 : this.filters.limit;
      if (totalFlights !== 0 && this.filters.limit > totalFlights) this.filters.limit = totalFlights;
      this.filters.skip = 0;
    } else {
      this.filters.limit = 5;
    }

    const strFilters = JSON.stringify(this.filters);

    if (this.searchParams.has('filters')) {
      this.searchParams.set('filters', strFilters);
    } else {
      this.searchParams.append('filters', strFilters);
    }

    const url = `/flight/search-flights?${this.searchParams.toString()}`;
    const request = {
      method: 'get',
      headers: new Headers({
        'X-Search-Flights': 'FilterAndFetchFlights',
      }),
    };

    if (!this.loadMore) {
      this.elements.preloader.show();

      if (window.matchMedia('(max-width: 991px)').matches) {
        $('#filterList').navdrawer('hide');
        if (this.elements.resultsTotal.length) this.scrollToElement(this.elements.resultsTotal);
      }
    }

    await fetch(url, request)
      .then((response) => response.json())
      .then(({ flights }) => {
        if (self.loadMore) {
          self.btns.loadMore.parent().remove();
          flightsContainer.append(flights.result);
          return;
        }

        flightsContainer.html(flights.result);
        self.elements.resultsTotal.html(flights.total);

        flightsContainer.toggleClass('h-lg-100', flights.isEmpty);
        if (flights.isEmpty) self.elements.sortBy.parent().parent().hide();
        if (!flights.isEmpty && self.elements.sortBy.parent().parent().is(':hidden'))
          self.elements.sortBy.parent().parent().show();
      })
      .then(() => {
        if (self.loadMore) {
          const next = $(`#flight-${self.filters.skip}`);

          self.scrollToElement(next);
          self.loadMore = false;
          return;
        }

        if (self.isReset) self.reset = false;
        self.elements.preloader.fadeOut();
        self.toggleClearBtn();
      })
      .catch(console.error);
  }
}
