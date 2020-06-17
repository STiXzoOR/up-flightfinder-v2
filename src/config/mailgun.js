/* eslint-disable no-shadow */
/* eslint-disable no-underscore-dangle */
const Mailgun = require('mailgun-js');
const config = require('./dotenv');

const options = {
  ...config.mailgun,
  testMode: false,
};

class MailgunWrapper {
  constructor(options) {
    this.config = options;
    this.config.from = `Flight Finder <${this.config.sender}>`;
    this.mailgun = new Mailgun(options);
    this.templates = {
      welcome: 'welcome',
      verifyAccount: 'confirm_account',
      verifySubscription: 'confirm_subscription',
      resetPassword: 'reset_password',
      updatedPassword: 'updated_password',
      unsubscribed: 'unsubscribed',
      bookingConfirmation: 'booking_confirmed',
    };
  }

  get instance() {
    return this.mailgun;
  }

  _getList(list) {
    return this.mailgun.lists(`${list}@${this.config.domain}`);
  }

  send(data) {
    return this.mailgun.messages().send({
      from: this.config.from,
      to: data.to,
      subject: data.subject,
      template: data.template,
      'h:X-Mailgun-Variables': JSON.stringify(data.variables),
    });
  }

  sendWelcome(data) {
    const actionURL = `${data.url}/user/sign-in`;

    return this.send({
      to: data.recipient,
      subject: 'Welcome on board',
      template: this.templates.welcome,
      variables: { action_url: actionURL },
    });
  }

  sendVerifyAccount(data) {
    const actionURL = `${data.url}/user/account/verify?token=${data.token}`;

    return this.send({
      to: data.recipient,
      subject: 'Verify your account',
      template: this.templates.verifyAccount,
      variables: { action_url: actionURL },
    });
  }

  sendResetPassword(data) {
    const actionURL = `${data.url}/user/account/reset-password?token=${data.token}`;

    return this.send({
      to: data.recipient,
      subject: 'Reset your password',
      template: this.templates.resetPassword,
      variables: { action_url: actionURL },
    });
  }

  sendChangedPassword(data) {
    const actionURL = `${data.url}/user/sign-in`;

    return this.send({
      to: data.recipient,
      subject: 'Your password has been changed',
      template: this.templates.updatedPassword,
      variables: { action_url: actionURL },
    });
  }

  sendVerifySubscription(data) {
    const actionURL = `${data.url}/newsletter/verify?token=${data.token}`;

    return this.send({
      to: data.recipient,
      subject: 'Verify newsletter subscription',
      template: this.templates.verifySubscription,
      variables: { action_url: actionURL },
    });
  }

  sendUnsubscribed(data) {
    const actionURL = `${data.url}/newsletter/subscribe?email=${data.email}&firstName=${data.firstName}&lastName=${data.lastName}`;

    return this.send({
      to: data.recipient,
      subject: 'Unsubscribed from newsletter',
      template: this.templates.unsubscribed,
      variables: { action_url: actionURL },
    });
  }

  sendBookingConfirmation(data) {
    const actionURL = `${data.email.url}/booking/manage-booking/bookingID=${data.variables.booking.id}&lastName=${data.email.lastName}`;

    return this.send({
      to: data.email.recipient,
      subject: `Booking confirmation - ${data.variables.booking.id}`,
      template: this.templates.bookingConfirmation,
      variables: { ...data.variables, action_url: actionURL },
    });
  }

  addMember(list, member) {
    return this._getList(list)
      .members()
      .create({
        subscribed: true,
        address: member.email,
        name: `${member.firstName} ${member.lastName}`.trim(),
      });
  }

  updateMember(list, member) {
    return this._getList(list).members(member.email).update(member.info);
  }

  removeMember(list, member) {
    return this._getList(list).members(member).delete();
  }

  getMember(list, member) {
    return this._getList(list).members(member).info();
  }
}

module.exports = new MailgunWrapper(options);
