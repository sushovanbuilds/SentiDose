'use strict';

const nodemailer = require('nodemailer');

/** @param {object} config @param {typeof nodemailer.createTransport} [createTransport] */
function createMailer(config, createTransport = nodemailer.createTransport) {
  let transport;

  function getTransport() {
    if (transport) return transport;
    if (!config.smtpHost || !config.mailFrom) {
      const error = new Error('Email delivery is not configured. Set SMTP_HOST and MAIL_FROM.');
      error.status = 503;
      throw error;
    }
    if (Boolean(config.smtpUser) !== Boolean(config.smtpPass)) {
      const error = new Error('Email authentication is incomplete. Set both SMTP_USER and SMTP_PASS.');
      error.status = 503;
      throw error;
    }

    transport = createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      ...(config.smtpUser ? { auth: { user: config.smtpUser, pass: config.smtpPass } } : {}),
    });
    return transport;
  }

  /** @param {{to:string|string[], subject:string, text:string}} message */
  async function sendEmail(message) {
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    const uniqueRecipients = [...new Set(recipients.filter(Boolean))];
    if (uniqueRecipients.length === 0) {
      const error = new Error('Email delivery requires at least one recipient.');
      error.status = 400;
      throw error;
    }

    return getTransport().sendMail({
      from: config.mailFrom,
      to: uniqueRecipients.join(', '),
      subject: message.subject,
      text: message.text,
    });
  }

  return { sendEmail };
}

module.exports = { createMailer };
