'use strict';

const { createHash } = require('node:crypto');
const { FieldPath } = require('@google-cloud/firestore');
const logger = require('../utils/logger');
const { now: currentTime } = require('../../public/js/clock');
const { doseDocumentId, medicineScheduledOn, PAGE_LIMIT } = require('./records');

const EVENT_LEASE_MS = 2 * 60 * 1000;
const APPOINTMENT_LIMIT = 200;
const MEMBER_LIMIT = 500;
const SPACE_PAGE_LIMIT = 50;

/** @param {Date} instant @param {string} timezone */
function formatLocalDateTime(instant, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

/** @param {string} date YYYY-MM-DD */
function previousDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

/** @param {string} localDateTime YYYY-MM-DDTHH:mm */
function localMinuteNumber(localDateTime) {
  const [date, time] = localDateTime.split('T');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day, hour, minute) / 60_000);
}

/** @param {string} value */
function eventDocumentId(value) {
  return createHash('sha256').update(value).digest('hex');
}

/** @param {number} minutesLate @param {boolean} isToday */
function doseReminderActions(minutesLate, isToday) {
  return {
    remindElder: isToday && minutesLate >= 0,
    escalateCaretaker: minutesLate >= 30,
  };
}

/** @param {number} minutesUntil */
function appointmentReminderKinds(minutesUntil) {
  const kinds = [];
  if (minutesUntil > 120 && minutesUntil <= 24 * 60) kinds.push('day_before');
  if (minutesUntil > 0 && minutesUntil <= 120) kinds.push('two_hours');
  return kinds;
}

/** @param {object} event @param {number} currentTime */
function eventCanBeClaimed(event, currentTime) {
  if (event.sentAt) return false;
  const leaseUntil = event.leaseUntil && typeof event.leaseUntil.toMillis === 'function'
    ? event.leaseUntil.toMillis()
    : event.leaseUntil instanceof Date
      ? event.leaseUntil.getTime()
      : 0;
  return !(event.status === 'sending' && leaseUntil > currentTime);
}

/** @param {object} dependencies */
function createReminderService({ getFirestore, sendEmail, now = currentTime }) {
  const firestore = () => getFirestore();

  async function sendOnce({ spaceRef, targetRef, targetField, claimUpdate, kind, key, recipients, subject, text, allowTarget }) {
    const db = firestore();
    const eventRef = spaceRef.collection('reminderEvents').doc(eventDocumentId(key));
    const claimedAt = now();
    let claimed = false;

    await db.runTransaction(async (transaction) => {
      const reads = [transaction.get(eventRef)];
      if (targetRef) reads.push(transaction.get(targetRef));
      const [eventSnapshot, targetSnapshot] = await Promise.all(reads);
      const event = eventSnapshot.exists ? eventSnapshot.data() : {};
      if (!eventCanBeClaimed(event, claimedAt.getTime())) return;
      if (targetRef) {
        if (!targetSnapshot.exists || (allowTarget && !allowTarget(targetSnapshot.data()))) return;
        if (targetField && targetSnapshot.get(targetField)) return;
      }

      transaction.set(eventRef, {
        kind,
        status: 'sending',
        attempts: Number(event.attempts || 0) + 1,
        leaseUntil: new Date(claimedAt.getTime() + EVENT_LEASE_MS),
        updatedAt: claimedAt,
      }, { merge: true });
      if (targetRef && claimUpdate) transaction.update(targetRef, claimUpdate(claimedAt, targetSnapshot.data()));
      claimed = true;
    });

    if (!claimed) return 'skipped';

    try {
      await sendEmail({ to: recipients, subject, text });
    } catch (error) {
      await eventRef.set({ status: 'failed', leaseUntil: null, failedAt: now() }, { merge: true });
      logger.error('reminder_send_failed', { kind, errorName: error && error.name ? error.name : 'Error' });
      return 'failed';
    }

    const sentAt = now();
    await db.runTransaction(async (transaction) => {
      const reads = [transaction.get(eventRef)];
      if (targetRef) reads.push(transaction.get(targetRef));
      const [eventSnapshot, targetSnapshot] = await Promise.all(reads);
      if (eventSnapshot.exists && eventSnapshot.get('sentAt')) return;
      transaction.set(eventRef, { status: 'sent', sentAt, leaseUntil: null, updatedAt: sentAt }, { merge: true });
      if (targetRef && targetSnapshot.exists && targetField) {
        transaction.update(targetRef, { [targetField]: sentAt });
      }
    });
    return 'sent';
  }

  async function ensureDose(spaceRef, medicine, scheduledFor) {
    const ref = spaceRef.collection('doseLogs').doc(doseDocumentId(medicine.id, scheduledFor));
    await firestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (snapshot.exists) return;
      transaction.create(ref, {
        medId: medicine.id,
        scheduledFor,
        status: 'pending',
        createdAt: now(),
      });
    });
    return ref;
  }

  async function sendDoseDue(spaceRef, space, medicine, doseRef, scheduledFor, counts) {
    if (!space.elderEmail) {
      counts.skipped += 1;
      return;
    }
    const result = await sendOnce({
      spaceRef,
      targetRef: doseRef,
      targetField: 'remindedAt',
      kind: 'dose_due',
      key: `dose_due:${doseRef.id}`,
      recipients: [space.elderEmail],
      subject: `Dose reminder: ${medicine.name}`,
      text: `It is time for ${medicine.name} (${medicine.dose}), scheduled for ${scheduledFor.replace('T', ' ')}. Open SentiDose to record this dose.`,
      allowTarget: (dose) => dose.status === 'pending',
    });
    counts[result] += 1;
  }

  async function markMissedAndNotify(spaceRef, space, medicine, doseRef, scheduledFor, primaryCaretaker, counts) {
    if (!primaryCaretaker || !primaryCaretaker.email) {
      // A missing escalation recipient must not prevent the dose from entering
      // the missed state; family escalation depends on this status being saved.
      await firestore().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(doseRef);
        if (!snapshot.exists || !['pending', 'missed'].includes(snapshot.get('status'))) return;
        if (snapshot.get('status') === 'pending') {
          transaction.update(doseRef, { status: 'missed', missedAt: now() });
        }
      });
      counts.skipped += 1;
      return;
    }
    const result = await sendOnce({
      spaceRef,
      targetRef: doseRef,
      targetField: 'escalatedAt',
      claimUpdate: (claimedAt) => ({ status: 'missed', missedAt: claimedAt }),
      kind: 'caretaker_escalation',
      key: `caretaker_escalation:${doseRef.id}`,
      recipients: [primaryCaretaker.email],
      subject: `Missed dose: ${medicine.name}`,
      text: `${space.elderName} has not recorded ${medicine.name} (${medicine.dose}), scheduled for ${scheduledFor.replace('T', ' ')}. Please check in through SentiDose.`,
      allowTarget: (dose) => ['pending', 'missed'].includes(dose.status),
    });
    counts[result] += 1;
  }

  async function processMissedFamily(spaceRef, date, familyEmails, counts) {
    if (familyEmails.length === 0) return;
    const logs = await spaceRef.collection('doseLogs')
      .where('scheduledFor', '>=', `${date}T00:00`)
      .where('scheduledFor', '<', `${date}T24:00`)
      .orderBy('scheduledFor', 'asc')
      .limit(500)
      .get();
    const missed = logs.docs.filter((doc) => doc.get('status') === 'missed');
    if (missed.length < 2) return;

    const result = await sendOnce({
      spaceRef,
      kind: 'family_missed_doses',
      key: `family_missed_doses:${date}`,
      recipients: familyEmails,
      subject: 'Two doses were missed today',
      text: `Two or more doses in the SentiDose care space were not recorded on ${date}. Please check in with the elder and review the dose log.`,
    });
    counts[result] += 1;
  }

  async function processAppointment(spaceRef, space, appointment, recipients, localNow, counts, flag) {
    if (!appointment.datetime || !recipients.length) return;
    const appointmentMinute = localMinuteNumber(appointment.datetime.slice(0, 16));
    const currentMinute = localMinuteNumber(localNow);
    const minutesUntil = appointmentMinute - currentMinute;
    const dueKind = flag === 'remindedDayBefore' ? 'day_before' : 'two_hours';
    if (!appointmentReminderKinds(minutesUntil).includes(dueKind)) return;

    const details = `${appointment.doctor}${appointment.specialty ? ` (${appointment.specialty})` : ''}, scheduled for ${appointment.datetime.replace('T', ' ')}${appointment.location ? ` at ${appointment.location}` : ''}.`;
    const result = await sendOnce({
      spaceRef,
      targetRef: spaceRef.collection('appointments').doc(appointment.id),
      targetField: flag,
      kind: flag === 'remindedDayBefore' ? 'appointment_day_before' : 'appointment_two_hours',
      key: `${flag}:${appointment.id}`,
      recipients,
      subject: flag === 'remindedDayBefore' ? 'Appointment tomorrow' : 'Appointment in two hours',
      text: `SentiDose reminder: ${details}${appointment.notes ? ` Notes: ${appointment.notes}` : ''}`,
      allowTarget: (record) => record.active !== false,
    });
    counts[result] += 1;
  }

  async function processSpace(spaceDoc, instant, counts) {
    const spaceRef = spaceDoc.ref;
    const space = spaceDoc.data();
    let localNow;
    try {
      localNow = formatLocalDateTime(instant, space.timezone);
    } catch {
      counts.skipped += 1;
      logger.warn('reminder_space_timezone_invalid', { spaceId: spaceDoc.id });
      return;
    }
    const today = localNow.slice(0, 10);
    const dates = [previousDate(today), today];
    const db = firestore();
    const [medicineSnapshot, memberSnapshot, appointmentSnapshot] = await Promise.all([
      spaceRef.collection('medicines').where('active', '==', true).limit(PAGE_LIMIT).get(),
      spaceRef.collection('members').limit(MEMBER_LIMIT).get(),
      spaceRef.collection('appointments').where('active', '==', true).limit(APPOINTMENT_LIMIT).get(),
    ]);
    const medicines = medicineSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const members = memberSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const primaryCaretaker = members.find((member) => member.id === space.primaryCaretakerId);
    const familyEmails = members.filter((member) => member.role === 'family' && member.email).map((member) => member.email);
    const appointmentRecipients = [...new Set([space.elderEmail, ...members.map((member) => member.email)].filter(Boolean))];
    const nowMinute = localMinuteNumber(localNow);

    for (const medicine of medicines) {
      for (const date of dates) {
        if (!medicineScheduledOn(medicine, date)) continue;
        for (const time of medicine.times || []) {
          const scheduledFor = `${date}T${time}`;
          const elapsedMinutes = nowMinute - localMinuteNumber(scheduledFor);
          if (elapsedMinutes < 0) continue;
          const actions = doseReminderActions(elapsedMinutes, date === today);
          const doseRef = await ensureDose(spaceRef, medicine, scheduledFor);
          if (actions.remindElder) {
            await sendDoseDue(spaceRef, space, medicine, doseRef, scheduledFor, counts);
          }
          if (actions.escalateCaretaker) {
            await markMissedAndNotify(spaceRef, space, medicine, doseRef, scheduledFor, primaryCaretaker, counts);
          }
        }
      }
    }

    for (const date of dates) {
      await processMissedFamily(spaceRef, date, familyEmails, counts);
    }

    for (const doc of appointmentSnapshot.docs) {
      const appointment = { id: doc.id, ...doc.data() };
      await processAppointment(spaceRef, space, appointment, appointmentRecipients, localNow, counts, 'remindedDayBefore');
      await processAppointment(spaceRef, space, appointment, appointmentRecipients, localNow, counts, 'remindedTwoHours');
    }
  }

  async function tick() {
    const instant = now();
    const counts = { spaces: 0, sent: 0, skipped: 0, failed: 0 };
    let query = firestore().collection('careSpaces').orderBy(FieldPath.documentId()).limit(SPACE_PAGE_LIMIT);
    while (true) {
      const snapshot = await query.get();
      if (snapshot.empty) break;
      for (const space of snapshot.docs) {
        counts.spaces += 1;
        await processSpace(space, instant, counts);
      }
      if (snapshot.size < SPACE_PAGE_LIMIT) break;
      query = query.startAfter(snapshot.docs[snapshot.docs.length - 1]);
    }
    return counts;
  }

  return { tick };
}

module.exports = {
  createReminderService,
  formatLocalDateTime,
  previousDate,
  localMinuteNumber,
  eventDocumentId,
  doseReminderActions,
  appointmentReminderKinds,
  eventCanBeClaimed,
  EVENT_LEASE_MS,
};
