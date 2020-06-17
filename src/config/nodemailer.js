/* eslint-disable no-shadow */
/* eslint-disable no-underscore-dangle */
const appRoot = require('app-root-path');
const nodemailer = require('nodemailer');
const Email = require('email-templates');
const config = require('./dotenv');
const logger = require('./winston');

const options = {
  mailer: {
    views: { root: appRoot.resolve('/dist/templates/emails/nodemailer') },
    message: {
      from: `FlightFinder <${config.nodemailer.auth.user}>`,
    },
  },
  transport: {
    ...config.nodemailer,
    port: 465,
    secure: true,
    logger,
  },
};

class Emailer {
  constructor(options) {
    this.config = options;
    this.nodemailer = nodemailer;
    this.templates = {
      welcome: 'welcome',
      verifyAccount: 'verify-account',
      verifySubscription: 'verify-subscription',
      resetPassword: 'reset-password',
      updatedPassword: 'changed-password',
      unsubscribed: 'unsubscribed',
      bookingConfirmation: 'booking-confirmed',
    };

    this.init();
  }

  init() {
    this.transport = this.nodemailer.createTransport(this.config.transport);

    this.transport.verify((error) => {
      if (error) {
        logger.error(error);
        throw error;
      }
    });

    this.config.mailer.transport = this.transport;
    this.mailer = new Email(this.config.mailer);
  }

  get instance() {
    return this.mailer;
  }

  send(data) {
    return this.mailer.send({
      template: data.template,
      message: {
        to: data.to,
      },
      locals: data.locals,
    });
  }

  sendWelcome(data) {
    const actionURL = `${data.url}/user/sign-in`;

    return this.send({
      to: data.recipient,
      template: this.templates.welcome,
      locals: { email: data.email, firstName: data.firstName, lastName: data.lastName, actionURL },
    });
  }

  sendVerifyAccount(data) {
    const actionURL = `${data.url}/user/account/verify?token=${data.token}`;

    return this.send({
      to: data.recipient,
      email: data.email,
      template: this.templates.verifyAccount,
      locals: { email: data.email, firstName: data.firstName, lastName: data.lastName, actionURL },
    });
  }

  sendResetPassword(data) {
    const actionURL = `${data.url}/user/account/reset-password?token=${data.token}`;

    return this.send({
      to: data.recipient,
      email: data.email,
      template: this.templates.resetPassword,
      locals: { email: data.email, firstName: data.firstName, lastName: data.lastName, actionURL },
    });
  }

  sendChangedPassword(data) {
    const actionURL = `${data.url}/user/sign-in`;

    return this.send({
      to: data.recipient,
      email: data.email,
      template: this.templates.updatedPassword,
      locals: { email: data.email, firstName: data.firstName, lastName: data.lastName, actionURL },
    });
  }

  sendVerifySubscription(data) {
    const actionURL = `${data.url}/newsletter/verify?token=${data.token}`;

    return this.send({
      to: data.recipient,
      email: data.email,
      template: this.templates.verifySubscription,
      locals: { email: data.email, firstName: data.firstName, lastName: data.lastName, actionURL },
    });
  }

  sendUnsubscribed(data) {
    const actionURL = `${data.url}/newsletter/subscribe?email=${data.email}&firstName=${data.firstName}&lastName=${data.lastName}`;

    return this.send({
      to: data.recipient,
      email: data.email,
      template: this.templates.unsubscribed,
      locals: { email: data.email, firstName: data.firstName, lastName: data.lastName, actionURL },
    });
  }

  sendBookingConfirmation(data) {
    const actionURL = `${data.email.url}/booking/manage-booking/bookingID=${data.variables.booking.id}&lastName=${data.email.lastName}`;

    return this.send({
      to: data.email.recipient,
      template: this.templates.bookingConfirmation,
      locals: {
        email: data.email.address,
        firstName: data.email.firstName,
        lastName: data.email.lastName,
        ...data.variables,
        actionURL,
      },
    });
  }
}

module.exports = new Emailer(options);
