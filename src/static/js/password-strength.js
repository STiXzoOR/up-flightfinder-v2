class PasswordStrength {
  constructor(element) {
    this.element = element;
    this.elements = {
      container: '.password-strength',
      verdict: '.password-strength-verdict',
      legend: '.password-strength-legend',
      progress: '.password-strength-progress',
      hints: {
        inRange: '#inRange',
        oneChar: '#oneChar',
        oneNumber: '#oneNumber',
        oneSpecial: '#oneSpecial',
        onlyLatin: '#onlyLatin',
      },
    };
    this.regex = {
      oneChar: /[A-Za-z]/,
      oneNumber: /[0-9]/,
      oneSpecial: /[!^+%/()=?_:`@~|\\}\]\[{$.,*-]/,
      onlyLatin: /^[\x00-\x7F]*$/,
    };
    this.userInputs = ['flightfinder', 'upatras', 'greece', 'cyprus'];
    this.verdicts = ['Very weak', 'Weak', 'Normal', 'Medium', 'Strong', 'Very strong'];
    this.colors = ['transparent', 'danger', 'danger', 'warning', 'warning', 'success'];
    this.scores = [0, 14, 26, 38, 50];

    this.init();
    this.bindEvents();
  }

  init() {
    this.errors = {
      inRange: false,
      hasOneChar: false,
      hasOneNumber: false,
      hasOneSpecial: false,
      hasOnlyLatin: false,
    };
    this.level = 0;
    this.score = 0;
    this.percentage = 0;
  }

  bindEvents() {
    const self = this;

    $(this.element).on('change keyup paste', () => {
      self.evaluatePassword();
    });
  }

  getScore() {
    const score = zxcvbn(this.element.value, this.userInputs).guesses;
    return Math.log(score) * Math.LOG2E;
  }

  getPercantage() {
    const percentage = Math.floor((this.score * 100) / this.scores[4]);
    return percentage > 100 ? 100 : percentage;
  }

  getLevel() {
    let level = 0;

    if (this.score <= this.scores[0]) {
      level = 0;
    } else if (this.score < this.scores[1]) {
      level = 1;
    } else if (this.score < this.scores[2]) {
      level = 2;
    } else if (this.score < this.scores[3]) {
      level = 3;
    } else if (this.score < this.scores[4]) {
      level = 4;
    } else {
      level = 5;
    }

    return level;
  }

  evaluatePassword() {
    const { value } = this.element;

    this.errors.inRange = value.length > 7 && value.length < 31;
    this.errors.hasOneChar = value.match(this.regex.oneChar);
    this.errors.hasOneNumber = value.match(this.regex.oneNumber);
    this.errors.hasOneSpecial = value.match(this.regex.oneSpecial);
    this.errors.hasOnlyLatin = value.match(this.regex.onlyLatin);

    this.score = this.getScore();
    this.percentage = this.getPercantage();
    this.level = this.getLevel();

    this.updateVerdict();
    this.updateProgressBar();
    this.updateLegend();

    if (value.length === 0) {
      this.reset();
    }
  }

  reset() {
    $(this.elements.verdict).text('');
    $(this.elements.verdict).removeClass(`text-${this.colors[this.level]}`);
    $(this.elements.legend)
      .find('li')
      .each(function reset() {
        $(this).removeClass();
      });

    this.init();
  }

  updateVerdict() {
    $.each(this.colors, (i, color) => {
      $(this.elements.verdict).removeClass(`text-${color}`);
    });

    $(this.elements.verdict).text(this.verdicts[this.level]);
    $(this.elements.verdict).addClass(`text-${this.colors[this.level]}`);
  }

  updateLegend() {
    $(this.elements.hints.inRange)
      .removeClass()
      .addClass(this.errors.inRange ? 'is-success' : 'is-invalid');

    $(this.elements.hints.oneChar)
      .removeClass()
      .addClass(this.errors.hasOneChar ? 'is-success' : 'is-invalid');

    $(this.elements.hints.oneNumber)
      .removeClass()
      .addClass(this.errors.hasOneNumber ? 'is-success' : 'is-invalid');

    $(this.elements.hints.oneSpecial)
      .removeClass()
      .addClass(this.errors.hasOneSpecial ? 'is-success' : 'is-invalid');

    $(this.elements.hints.onlyLatin)
      .removeClass()
      .addClass(this.errors.hasOnlyLatin ? 'is-success' : 'is-invalid');
  }

  updateProgressBar() {
    $.each(this.colors, (i, color) => {
      $(this.elements.progress).find('.progress-bar').removeClass(`bg-${color}`);
    });

    $(this.elements.progress)
      .find('.progress-bar')
      .addClass(`bg-${this.colors[this.level]}`)
      .css({ width: `${this.percentage}%` });
  }
}
