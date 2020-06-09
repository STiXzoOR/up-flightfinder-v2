const express = require('express');
const routeAsync = require('../middleware/route-async');
const handleResponseError = require('../middleware/handle-response-error');
const { validate, validateVerbose } = require('../middleware/superstruct');
const mailgun = require('../config/mailgun');
const Newsletter = require('../controllers/newsletter');

const router = express.Router();

router.get('/', (req, res) => {
  return res.render('newsletter');
});

router.all(
  '/subscribe',
  routeAsync(async (req, res, next) => {
    const data = req.method === 'GET' ? req.query : req.body;

    if (req.method === 'GET') {
      const [error] = validateVerbose(
        { email: 'email', firstName: 'string & !isEmpty', lastName: 'string & !isEmpty' },
        data
      );
      if (error) return next(error);
    }

    let response = await Newsletter.exists(data.email);
    if (response.error || response.result)
      return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: '/newsletter' })(
        req,
        res,
        next
      );

    const args = {
      email: data.email,
      firstName: data.firstName || data.email.split('@')[0],
      lastName: data.lastName || '',
      url: req.getUrl(),
    };

    response = await Newsletter.sendVerification(args);
    if (response.error && response.tryCatchError) return next(response.result);

    res.flash(response.error ? 'error' : 'success', response.message);
    return res.redirect('/newsletter');
  })
);

router.get(
  '/verify',
  validate('validateToken'),
  routeAsync(async (req, res, next) => {
    const { token } = req.query;
    let response = await Newsletter.verifyToken(token);

    if (response.error)
      return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: '/newsletter' })(
        req,
        res,
        next
      );

    response = await Newsletter.verify(response.result[0]);
    if (response.error && response.tryCatchError) return next(response.result);

    res.flash(response.error ? 'error' : 'success', response.message);
    return res.redirect('/newsletter');
  })
);

router.get('/unsubscribe', (req, res) => {
  return res.render('newsletter-unsubscribe');
});

router.post(
  '/unsubscribe',
  routeAsync(async (req, res, next) => {
    const { email } = req.body;
    let response = await Newsletter.get(email);
    if (response.error)
      return handleResponseError(response, {
        redirectOnError: true,
        flashMessage: true,
        redirect: '/newsletter/unsubscribe',
      })(req, res, next);

    const member = response.result;
    response = await Newsletter.remove(email);

    if (response.error)
      return handleResponseError(response, {
        redirectOnError: true,
        flashMessage: true,
        redirect: '/newsletter/unsubscribe',
      })(req, res, next);

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
  })
);

module.exports = router;
