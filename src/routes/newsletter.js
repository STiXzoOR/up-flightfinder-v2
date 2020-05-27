/* eslint-disable vars-on-top */
/* eslint-disable global-require */
/* eslint-disable no-var */
const express = require('express');
const logger = require('../config/winston');
const { validate, validateVerbose } = require('../config/superstruct');
const {
  useMailgun,
  verifyToken,
  sendVerificationLink,
  insertNewsletterSubscriber,
  removeNewsletterSubscriber,
} = require('../config/requests');

if (useMailgun) var mailgun = require('../config/mailgun');

const router = express.Router();

router.get('/', (req, res, next) => {
  return res.render('newsletter');
});

router.all('/subscribe', async (req, res, next) => {
  const data = req.method === 'GET' ? req.query : req.body;
  let subscriberExists = false;

  if (req.method === 'GET') {
    const [error] = validateVerbose(
      { email: 'email', firstName: 'string & !isEmpty', lastName: 'string & !isEmpty' },
      data
    );
    if (error) return next(error);
  }

  await mailgun
    .getMember('newsletter', data.email)
    .then((member) => {
      logger.info(member);
      subscriberExists = true;
    })
    .catch((err) => logger.error(err));

  if (subscriberExists) {
    res.flash('error', 'The provided email is already subscribed to our newsletter list.');
    return res.redirect('/newsletter');
  }

  try {
    const args = {
      email: data.email,
      firstName: data.firstName || data.email.split('@')[0],
      lastName: data.lastName || '',
      url: req.getUrl(),
    };

    const response = await sendVerificationLink({ args, type: 'newsletter' });

    res.flash(response.error ? 'error' : 'success', response.message);
    return res.redirect('/newsletter');
  } catch (err) {
    return next(err);
  }
});

router.get('/verify', validate('validateToken'), async (req, res, next) => {
  const { token } = req.query;

  try {
    let response = await verifyToken({ token, type: 'newsletter' });

    if (response.error) {
      res.flash('error', response.message);
      return res.redirect('/newsletter');
    }

    response = await insertNewsletterSubscriber(response.result[0]);

    res.flash(response.error ? 'error' : 'success', response.message);
    return res.redirect('/newsletter');
  } catch (err) {
    return next(err);
  }
});

router.get('/unsubscribe', (req, res, next) => {
  return res.render('newsletter-unsubscribe');
});

router.post('/unsubscribe', async (req, res, next) => {
  const { email } = req.body;
  let notFound = false;
  let member = {};

  await mailgun
    .getMember('newsletter', email)
    .then((data) => {
      logger.info(data);
      member = data.member;
    })
    .catch((err) => {
      logger.error(err);
      notFound = true;
    });

  if (notFound) {
    res.flash('error', 'The provided email is not subscribed to our newsletter list.');
    return res.redirect('/newsletter/unsubscribe');
  }

  try {
    const response = await removeNewsletterSubscriber(email);

    if (response.error) {
      res.flash('error', response.message);
      return res.redirect('/unsubscribe');
    }

    const name = member.name.split(' ');
    const args = {
      url: req.getUrl(),
      email: member.address,
      firstName: name[0],
      lastName: name.length > 1 ? name.slice(1).join(' ') : '',
      recipient: `${member.name} <${member.address}>`,
    };

    await mailgun.sendUnsubscribed(args);

    res.flash('success', response.message);
    return res.redirect('/newsletter');
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
