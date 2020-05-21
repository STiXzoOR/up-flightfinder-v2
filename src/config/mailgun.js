/* eslint-disable no-underscore-dangle */
const Mailgun = require('mailgun-js');

const options = {
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
  host: process.env.MAILGUN_HOST,
  testMode: false,
};

class MailgunWrapper {
  constructor(options) {
    this.mailgun = new Mailgun(options);
    this.domain = options.domain;
    this.from = `Flight Finder <${process.env.MAILGUN_SENDER_EMAIL}>`;
    this.templates = {
      welcome: 'welcome',
      verifyAccount: 'confirm_account',
      verifySubscription: 'confirm_subscription',
      resetPassword: 'reset_password',
      updatedPassword: 'updated_password',
      unsubscribed: 'unsubscribed',
    };
  }

  get instance() {
    return this.mailgun;
  }

  _getList(list) {
    return this.mailgun.lists(`${list}@${this.domain}`);
  }

  send(data) {
    return this.mailgun.messages().send({
      from: this.from,
      to: data.to,
      subject: data.subject,
      template: data.template,
      'h:X-Mailgun-Variables': JSON.stringify({ action_url: data.actionURL }),
    });
  }

  sendWelcome(data) {
    const actionURL = `${data.url}/user/sign-in`;

    return this.send({
      to: data.recipient,
      subject: 'Welcome on board',
      template: this.templates.welcome,
      actionURL,
    });
  }

  sendVerifyAccount(data) {
    const actionURL = `${data.url}/user/account/verify?token=${data.token}`;

    return this.send({
      to: data.recipient,
      subject: 'Verify your account',
      template: this.templates.verifyAccount,
      actionURL,
    });
  }

  sendResetPassword(data) {
    const actionURL = `${data.url}/user/account/reset-password?token=${data.token}`;

    return this.send({
      to: data.recipient,
      subject: 'Reset your password',
      template: this.templates.resetPassword,
      actionURL,
    });
  }

  sendChangedPassword(data) {
    const actionURL = `${data.url}/user/sign-in`;

    return this.send({
      to: data.recipient,
      subject: 'Your password has been changed',
      template: this.templates.updatedPassword,
      actionURL,
    });
  }

  sendVerifySubscription(data) {
    const actionURL = `${data.url}/newsletter/verify?token=${data.token}`;

    return this.send({
      to: data.recipient,
      subject: 'Verify newsletter subscription',
      template: this.templates.verifySubscription,
      actionURL,
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
