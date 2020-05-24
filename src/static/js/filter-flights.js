// TODO: Convert it into a Class Object

const stops = [
  ...$('.filter-stops-item').map(function value() {
    if (!$(this).is(':disabled')) return parseInt($(this).val(), 10);
  }),
];
const airlines = [
  ...$('.filter-airlines-item').map(function value() {
    return $(this).val();
  }),
];
let filters = { orderBy: '', skip: 0, limit: 5, stops: [...stops], airlines: [...airlines] };
const searchParams = new URLSearchParams(window.location.search);

function loadPreloader() {
  const preloader = $('<div/>')
    .attr({ id: 'preLoaderFiltering', 'data-bg': 'white' })
    .addClass('page-preloader page-preloader-image')
    .css({ display: 'none' });

  preloader.insertAfter('.flights-container');
}

function getOffset(element) {
  const header = $('.page-header');
  const headerStyles = getComputedStyle(header.get(0));
  const headerPosition = headerStyles.position;
  let offset = element.offset().top;

  if (header.length && headerPosition === 'fixed' && parseInt(headerStyles.top, 10) === 0) {
    offset -= header.outerHeight() - parseInt(headerStyles.marginTop, 10);
  }

  return offset;
}

function scrollToElement(element) {
  $('html').removeClass('smooth-scroll');

  $('html, body')
    .stop()
    .animate(
      {
        scrollTop: getOffset(element) - 30,
      },
      {
        duration: 400,
        complete() {
          $('html, body')
            .stop()
            .animate(
              {
                scrollTop: getOffset(element) - 30,
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

function checkClearFilter() {
  if (
    filters.priceRange ||
    filters.departTimeRange ||
    filters.returnTimeRange ||
    filters.stops.length !== stops.length ||
    (filters.stops.length === 1 && filters.stops[0] === -1) ||
    filters.airlines.length !== airlines.length
  ) {
    return true;
  }

  return false;
}

function showClearBtn() {
  const btn = $('.btn-clear-filters');
  const btnText = btn.find('.text-clear');
  const btnMobile = $('.btn-clear-filters-mobile');
  const btnMobileOuterHeight = btnMobile.outerHeight();
  const btnMobileNext = btnMobile.next();
  const hasFilter = checkClearFilter();

  btn.toggleClass('disabled', !hasFilter);
  btnMobile.toggleClass('show', hasFilter);
  btnText.find('i').toggle(hasFilter);
  btnText.find('span').text(`${hasFilter ? 'CLEAR ' : ''}FILTERS`);
  btnMobileNext.css({ 'padding-bottom': `${hasFilter ? `${btnMobileOuterHeight}px` : ''}` });
}

function rangeSliderFilter(data, slider) {
  const parsedData = ['departTimeRange', 'returnTimeRange'].includes(slider)
    ? { from: new Date(data.from).toLocaleTimeString('en-gb'), to: new Date(data.to).toLocaleTimeString('en-gb') }
    : { from: data.from, to: data.to };

  filters[slider] = parsedData;

  filterHandler();
}

function checkBoxFilter(event) {
  const type = event.data;
  if (filters[type].length === 1 && [-1, ''].includes(filters[type][0])) filters[type].pop();

  const $this = $(this);
  const value = type === 'stops' ? parseInt($(this).val(), 10) : $(this).val();

  if ($this.is(':checked')) {
    filters[type].push(value);
  } else {
    const index = filters[type].indexOf(value);
    if (index > -1) {
      filters[type].splice(index, 1);
    }
  }

  if (filters[type].length === 0) filters[type].push(type === 'stops' ? -1 : '');

  filterHandler();
}

async function filterHandler({ loadMore = false, isReset = false } = {}) {
  const preloader = $('#preLoaderFiltering');
  const flightsContainer = $('.flights-container');
  const queryResultsTotal = $('#queryResultsTotal');
  const sortFlightsBy = $('#sortFlightsBy');
  const totalFlights = parseInt(queryResultsTotal.text(), 10);

  if (!loadMore && !isReset) {
    filters.limit = filters.skip ? filters.skip + 5 : filters.limit;
    if (totalFlights !== 0 && filters.limit > totalFlights) filters.limit = totalFlights;
    filters.skip = 0;
  } else {
    filters.limit = 5;
  }

  const strFilters = JSON.stringify(filters);

  if (searchParams.has('filters')) {
    searchParams.set('filters', strFilters);
  } else {
    searchParams.append('filters', strFilters);
  }

  const url = `/flight/search-flights?${searchParams.toString()}`;
  const request = {
    method: 'get',
    headers: new Headers({
      'X-Custom-Header': 'FetchMoreFlights',
    }),
  };

  if (!loadMore) {
    preloader.show();

    if (window.matchMedia('(max-width: 991px)').matches) {
      $('#filterList').navdrawer('hide');
      if (queryResultsTotal.length) scrollToElement(queryResultsTotal);
    }
  }

  await fetch(url, request)
    .then((response) => response.json())
    .then(({ flights }) => {
      if (loadMore) {
        loadMore.parent().remove();
        flightsContainer.append(flights.result);
        return;
      }

      flightsContainer.html(flights.result);
      queryResultsTotal.html(flights.total);

      flightsContainer.toggleClass('h-lg-100', flights.isEmpty);
      if (flights.isEmpty) sortFlightsBy.parent().parent().hide();
      if (!flights.isEmpty && sortFlightsBy.parent().parent().is(':hidden')) sortFlightsBy.parent().parent().show();
    })
    .then(() => {
      if (loadMore) {
        const next = $(`#flight-${filters.skip}`);
        scrollToElement(next);
        delete filters.loadMore;
        return;
      }

      preloader.fadeOut();

      showClearBtn();
    })
    .catch((err) => console.log(err));
}

$(() => {
  const sortFlightsBy = $('#sortFlightsBy');
  const stopsFilterItem = $('.filter-stops-item');
  const airlinesFilterItem = $('.filter-airlines-item');
  const priceRange = $('#priceRange').data('ionRangeSlider');
  const departTimeRange = $('#departureTimeRange').data('ionRangeSlider');
  const returnTimeRange = $('#returnTimeRange').data('ionRangeSlider');

  loadPreloader();

  priceRange.update({
    onFinish: (data) => rangeSliderFilter(data, 'priceRange'),
  });

  departTimeRange.update({
    onFinish: (data) => rangeSliderFilter(data, 'departTimeRange'),
  });

  if (returnTimeRange) {
    returnTimeRange.update({
      onFinish: (data) => rangeSliderFilter(data, 'returnTimeRange'),
    });
  }

  $(document).on('click', '[class*="btn-clear-filters"]', function clear() {
    if (filters.priceRange) priceRange.reset();
    if (filters.departTimeRange) departTimeRange.reset();
    if (filters.returnTimeRange) returnTimeRange.reset();

    if (stopsFilterItem.length) {
      stopsFilterItem.each((i, el) => {
        if (!$(el).is(':disabled')) $(el).prop('checked', true);
      });
    }

    if (airlinesFilterItem.length) {
      airlinesFilterItem.prop('checked', true);
    }

    if (sortFlightsBy.length) {
      sortFlightsBy.find('option:selected').prop('selected', false);
      sortFlightsBy.first().prop('selected', true).trigger('change.select2');
    }

    filters = { orderBy: '', skip: 0, limit: 5, stops: [...stops], airlines: [...airlines] };

    $(this).blur().fadeOut();
    filterHandler({ isReset: true });
  });

  $(document).on('click', '#loadMoreFlights', function scroll() {
    filters.skip = parseInt($(this).data('skip'), 10);
    filters.loadMore = true;

    $(this).find('#text').text('Loading...');
    $(this).find('#loader').show();

    filterHandler({ loadMore: $(this) });
  });

  sortFlightsBy.on('change', function sort() {
    filters.orderBy = $(this).val();

    filterHandler();
  });

  stopsFilterItem.on('change', null, 'stops', checkBoxFilter);
  airlinesFilterItem.on('change', null, 'airlines', checkBoxFilter);
});
