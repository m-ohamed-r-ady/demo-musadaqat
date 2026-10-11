'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const app = express();
const port = Number.parseInt(process.env.PORT || '3000', 10);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');
if (process.env.VERCEL) app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
  etag: true
}));

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, message: 'Too many messages were sent from this connection. Please try again later.' }
});

const subjects = new Set(['Request a demo', 'Partnership', 'Support', 'General enquiry']);
const clean = (value, max) => String(value || '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);
const cleanMessage = (value, max) => String(value || '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  .replace(/\r\n?/g, '\n')
  .trim()
  .slice(0, max);
const escapeHtml = (value) => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[character]);
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value) && value.length <= 254;

function getTransporter() {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'CONTACT_TO'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing mail configuration: ${missing.join(', ')}`);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number.parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
}

app.get('/', (request, response) => {
  response.render('index', {
    contactEmail: process.env.CONTACT_DISPLAY_EMAIL || 'hello@musadaqat.sa'
  });
});

app.post('/api/contact', contactLimiter, async (request, response) => {
  const name = clean(request.body.name, 80);
  const email = clean(request.body.email, 254).toLowerCase();
  const organization = clean(request.body.organization, 120);
  const subject = clean(request.body.subject, 40);
  const message = cleanMessage(request.body.message, 3000);
  const website = clean(request.body.website, 200);
  const startedAt = Number(request.body.startedAt);

  if (website) return response.status(200).json({ ok: true, message: 'Thanks. Your message has been received.' });
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 2500) {
    return response.status(400).json({ ok: false, message: 'Please take a moment to review your message and try again.' });
  }

  const errors = {};
  if (name.length < 2) errors.name = 'Enter your full name.';
  if (!validEmail(email)) errors.email = 'Enter a valid email address.';
  if (!subjects.has(subject)) errors.subject = 'Choose a valid enquiry type.';
  if (message.length < 20) errors.message = 'Tell us a little more so we can help.';

  if (Object.keys(errors).length) {
    return response.status(422).json({ ok: false, message: 'Please check the highlighted fields.', errors });
  }

  if (process.env.SMTP_DRY_RUN === 'true') {
    return response.json({ ok: true, message: 'Your message passed validation. Email delivery is disabled in local test mode.' });
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.CONTACT_TO,
      replyTo: { name, address: email },
      subject: `[Musadaqat website] ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\nOrganization: ${organization || 'Not provided'}\nEnquiry: ${subject}\n\n${message}`,
      html: `<h2>New Musadaqat website enquiry</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Organization:</strong> ${escapeHtml(organization || 'Not provided')}</p><p><strong>Enquiry:</strong> ${escapeHtml(subject)}</p><p><strong>Message:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`
    });
    response.json({ ok: true, message: 'Thanks. Your message has been sent successfully.' });
  } catch (error) {
    console.error('Contact delivery failed:', error.code || error.name || 'SMTP_ERROR');
    response.status(502).json({
      ok: false,
      message: 'Your message could not be delivered right now. Please try again shortly or email us directly.'
    });
  }
});

app.use((request, response) => response.status(404).send('Not found'));
app.use((error, request, response, next) => {
  console.error('Unhandled request error:', error.name || 'ERROR');
  response.status(500).json({ ok: false, message: 'Something went wrong. Please try again.' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Musadaqat is running at http://localhost:${port}`);
  });
}

module.exports = app;
