/* eslint-disable no-shadow */
/* eslint-disable no-underscore-dangle */
const appRoot = require('app-root-path');
const nodemailer = require('nodemailer');
const Email = require('email-templates');
const config = require('./dotenv');

const options = {
  mailer: {
    views: { root: appRoot.resolve('/dist/templates/emails/nodemailer') },
    message: {
      from: `FlightFinder <${config.nodemailer.auth.user}>`,
    },
    send: config.isDev(),
  },
  transport: {
    ...config.nodemailer,
    port: 587,
    secure: false,
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
    };

    this.init();
  }

  init() {
    this.transport = this.nodemailer.createTransport(this.config.transport);
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
      locals: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        actionUrl: data.actionURL,
      },
    });
  }

  sendWelcome(data) {
    const actionURL = `${data.url}/user/sign-in`;

    return this.send({
      to: data.recipient,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      template: this.templates.welcome,
      actionURL,
    });
  }

  sendVerifyAccount(data) {
    const actionURL = `${data.url}/user/account/verify?token=${data.token}`;

    return this.send({
      to: data.recipient,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      template: this.templates.verifyAccount,
      actionURL,
    });
  }

  sendResetPassword(data) {
    const actionURL = `${data.url}/user/account/reset-password?token=${data.token}`;

    return this.send({
      to: data.recipient,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      template: this.templates.resetPassword,
      actionURL,
    });
  }

  sendChangedPassword(data) {
    const actionURL = `${data.url}/user/sign-in`;

    return this.send({
      to: data.recipient,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      template: this.templates.updatedPassword,
      actionURL,
    });
  }

  sendVerifySubscription(data) {
    const actionURL = `${data.url}/newsletter/verify?token=${data.token}`;

    return this.send({
      to: data.recipient,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      template: this.templates.verifySubscription,
      actionURL,
    });
  }

  sendUnsubscribed(data) {
    const actionURL = `${data.url}/newsletter/subscribe?email=${data.email}&firstName=${data.firstName}&lastName=${data.lastName}`;

    return this.send({
      to: data.recipient,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      template: this.templates.unsubscribed,
      actionURL,
    });
  }
}

module.exports = new Emailer(options);
