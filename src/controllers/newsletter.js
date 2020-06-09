const crypto = require('crypto');
const mailgun = require('../config/mailgun');
const Base = require('./base');

class Newsletter extends Base {
  constructor() {
    super();

    this.queries = {
      verification: {
        insert:
          'INSERT INTO newsletter (email, first_name, last_name, token, token_expire) VALUES(:email, :firstName, :lastName, :token, :tokenExpire)',
        update:
          'UPDATE newsletter SET first_name=:firstName, last_name=:lastName, token=:token, token_expire=:tokenExpire WHERE email=:email',
      },
      verify: {
        subscribe: 'UPDATE newsletter SET token=NULL, token_expire=NULL WHERE email=:email',
        token:
          'SELECT email, first_name as firstName, last_name as lastName FROM newsletter WHERE token=:token and token_expire > NOW()',
      },
      update: 'UPDATE newsletter SET first_name=:firstName, last_name=:lastName WHERE email=:email',
      remove: 'DELETE FROM newsletter WHERE email=:email',
    };

    this.messages = {
      generic: 'Something went wrong. Please contact our support team.',
      exists: {
        success: 'The provided email is already subscribed to our newsletter list.',
        error: 'The provided email is not subscribed to our newsletter list.',
      },
      get: {
        sucess: 'Subscriber retrieved',
      },
      verification: {
        success:
          'A mail to verify your subscription was sent to the provided email. The link will expire after 30 minutes.',
      },
      verify: {
        subscribe: {
          success: 'Thank you for subscribing. You will receive the latest news and offers from us.',
        },
        token: {
          error: 'The requested link is invalid or has expired.',
        },
      },
      update: {
        success: 'Your subscription details have been successfully updated.',
      },
      remove: {
        success: 'You have been unsubscribed from our newsletter list.',
      },
    };
  }

  async exists(email = '') {
    const response = {
      status: 404,
      error: true,
      message: 'No results found.',
      result: [],
    };

    await mailgun
      .getMember('newsletter', email)
      .then((member) => {
        response.status = 200;
        response.error = false;
        response.message = this.messages.exists.success;
        response.result = true;
      })
      .catch((error) => {
        if (error.statusCode && error.statusCode === 404) {
          response.error = false;
          response.message = this.messages.exists.error;
          response.result = false;
          return;
        }
        response.tryCatchError = true;
        response.status = error.statusCode || error.status || 500;
        response.result = error;
      });

    return response;
  }

  async get(email = '') {
    const response = await this.exists(email);
    if (response.error || !response.result) return response;

    await mailgun
      .getMember('newsletter', email)
      .then((data) => {
        response.result = data.member;
      })
      .catch((error) => {
        response.error = true;
        response.tryCatchError = true;
        response.status = error.statusCode || error.status || 500;
        response.result = error;
      });

    return response;
  }

  async verify(args = {}) {
    const query = this.queries.verify.subscribe;
    const response = await this.execute(query, { email: args.email }, 'commit');

    if (response.error) {
      if (!response.tryCatchError) response.message = this.messages.generic;
      return response;
    }

    response.message = this.messages.verify.subscribe.success;

    await mailgun.addMember('newsletter', args).catch((error) => {
      response.error = true;
      response.tryCatchError = true;
      response.status = error.statusCode || error.status || 500;
      response.result = error;
    });

    return response;
  }

  async remove(email = '') {
    const query = this.queries.remove;
    const response = await this.execute(query, { email }, 'commit');

    if (response.error) {
      if (!response.tryCatchError) response.message = this.messages.generic;
      return response;
    }

    response.message = this.messages.remove.success;

    await mailgun.removeMember('newsletter', email).catch((error) => {
      response.error = true;
      response.tryCatchError = true;
      response.status = error.statusCode || error.status || 500;
      response.result = error;
    });

    return response;
  }

  async update(args = {}) {
    const query = this.queries.update;
    const response = await this.execute(query, { email: args.email }, 'commit');

    if (response.error) {
      if (!response.tryCatchError) response.message = this.messages.generic;
      return response;
    }

    response.message = this.messages.update.success;
    const member = { email: args.email, info: { name: `${args.firstName} ${args.lastName}`.trim() } };

    await mailgun.updateMember('newsletter', member).catch((error) => {
      response.error = true;
      response.tryCatchError = true;
      response.status = error.statusCode || error.status || 500;
      response.result = error;
    });

    return response;
  }

  async verifyToken(token = '') {
    const query = this.queries.verify.token;
    const response = await this.execute(query, { token }, 'fetchOne');

    if (response.tryCatchError || response.status === 500) return response;

    response.error = response.result.length === 0;
    response.message = response.result.length !== 0 ? response.message : this.messages.verify.token.error;

    return response;
  }

  async sendVerification(args = {}) {
    const fields = {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      token: crypto.randomBytes(40).toString('hex'),
      tokenExpire: new Date(Date.now() + 1800000),
    };

    let needsUpdate = false;
    let query = this.queries.verification.insert;
    let response = await this.execute(query, fields, 'commit');

    if (response.error) {
      if (!response.tryCatchError || (response.tryCatchError && response.result.errno !== 1062)) return response;
      needsUpdate = true;
    }

    if (needsUpdate) {
      query = this.queries.verification.update;
      response = await this.execute(query, fields, 'commit');
      if (response.error) return response;
    }

    const data = {
      url: args.url,
      token: fields.token,
      recipient: `${args.firstName} ${args.lastName} <${args.email}>`,
    };

    await mailgun
      .sendVerifySubscription(data)
      .then((result) => {
        response.message = this.messages.verification.success;
        response.result = result;
      })
      .catch((error) => {
        response.error = true;
        response.tryCatchError = true;
        response.status = error.statusCode || error.status || 500;
        response.result = error;
      });

    return response;
  }
}

module.exports = new Newsletter();
