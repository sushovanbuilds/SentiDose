'use strict';

const { createHash } = require('node:crypto');

const PAGE_LIMIT = 200;
const DOSE_LIMIT = 500;

/** @param {string} medId @param {string} scheduledFor */
function doseDocumentId(medId, scheduledFor) {
  return createHash('sha256').update(`${medId}\n${scheduledFor}`).digest('hex');
}

/** @param {string} date YYYY-MM-DD */
function weekdayFor(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** @param {object} medicine @param {string} date */
function medicineScheduledOn(medicine, date) {
  return medicine.schedule.kind === 'daily' ||
    (medicine.schedule.kind === 'weekly' && medicine.schedule.weekday === weekdayFor(date));
}

/** @param {Array<object>} logs @param {number} days @param {string} through */
function calculateAdherence(logs, days, through) {
  const [year, month, day] = through.split('-').map(Number);
  const dates = Array.from({ length: days }, (_, index) => {
    const offset = days - index - 1;
    const value = new Date(Date.UTC(year, month - 1, day - offset));
    return value.toISOString().slice(0, 10);
  });
  const daysSummary = dates.map((date) => {
    const recorded = logs.filter((log) => log.scheduledFor.startsWith(date) && log.status !== 'pending');
    const taken = recorded.filter((log) => log.status === 'taken').length;
    return { date, taken, total: recorded.length };
  });
  const taken = daysSummary.reduce((sum, item) => sum + item.taken, 0);
  const total = daysSummary.reduce((sum, item) => sum + item.total, 0);
  return { percent: total ? Math.round((taken / total) * 100) : 0, taken, total, days: daysSummary };
}

/** @param {object} dependencies */
function createRecordsService({ getFirestore, now = () => new Date() }) {
  function collection(spaceId, name) {
    return getFirestore().collection('careSpaces').doc(spaceId).collection(name);
  }

  function notFound(label) {
    const error = new Error(`${label} was not found.`);
    error.status = 404;
    return error;
  }

  async function listMedicines(spaceId) {
    const snapshot = await collection(spaceId, 'medicines').orderBy('createdAt', 'desc').limit(PAGE_LIMIT).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((medicine) => medicine.active !== false);
  }

  async function createMedicine(spaceId, actor, data) {
    const ref = collection(spaceId, 'medicines').doc();
    const timestamp = now();
    const record = {
      ...data,
      active: true,
      createdBy: actor.memberId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await ref.create(record);
    return { id: ref.id, ...record };
  }

  async function updateMedicine(spaceId, medicineId, data) {
    const ref = collection(spaceId, 'medicines').doc(medicineId);
    let updated;
    await getFirestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists || snapshot.get('active') === false) throw notFound('Medicine');
      updated = { ...snapshot.data(), ...data, updatedAt: now() };
      transaction.update(ref, { ...data, updatedAt: updated.updatedAt });
    });
    return { id: ref.id, ...updated };
  }

  async function deleteMedicine(spaceId, medicineId) {
    const ref = collection(spaceId, 'medicines').doc(medicineId);
    await getFirestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists || snapshot.get('active') === false) throw notFound('Medicine');
      transaction.update(ref, { active: false, updatedAt: now() });
    });
  }

  async function listAppointments(spaceId) {
    const snapshot = await collection(spaceId, 'appointments').orderBy('datetime', 'asc').limit(PAGE_LIMIT).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((appointment) => appointment.active !== false);
  }

  async function createAppointment(spaceId, actor, data) {
    const ref = collection(spaceId, 'appointments').doc();
    const timestamp = now();
    const record = {
      ...data,
      specialty: data.specialty || 'Consultation',
      location: data.location || 'To be confirmed',
      notes: data.notes || '',
      accompaniedBy: data.accompaniedBy || actor.name,
      active: true,
      createdBy: actor.memberId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await ref.create(record);
    return { id: ref.id, ...record };
  }

  async function updateAppointment(spaceId, appointmentId, data) {
    const ref = collection(spaceId, 'appointments').doc(appointmentId);
    let updated;
    await getFirestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists || snapshot.get('active') === false) throw notFound('Appointment');
      updated = { ...snapshot.data(), ...data, updatedAt: now() };
      transaction.update(ref, { ...data, updatedAt: updated.updatedAt });
    });
    return { id: ref.id, ...updated };
  }

  async function deleteAppointment(spaceId, appointmentId) {
    const ref = collection(spaceId, 'appointments').doc(appointmentId);
    await getFirestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists || snapshot.get('active') === false) throw notFound('Appointment');
      transaction.update(ref, { active: false, updatedAt: now() });
    });
  }

  async function listDoses(spaceId, date) {
    const medsSnapshot = await collection(spaceId, 'medicines').orderBy('createdAt', 'desc').limit(PAGE_LIMIT).get();
    const medicines = medsSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((medicine) => medicine.active !== false && medicineScheduledOn(medicine, date));
    const logsSnapshot = await collection(spaceId, 'doseLogs')
      .where('scheduledFor', '>=', `${date}T00:00`)
      .where('scheduledFor', '<', `${date}T24:00`)
      .orderBy('scheduledFor', 'asc')
      .limit(DOSE_LIMIT)
      .get();
    const logs = new Map(logsSnapshot.docs.map((doc) => [
      `${doc.get('medId')}\n${doc.get('scheduledFor')}`,
      { id: doc.id, ...doc.data() },
    ]));

    return medicines.flatMap((medicine) => medicine.times.map((time) => {
      const scheduledFor = `${date}T${time}`;
      const log = logs.get(`${medicine.id}\n${scheduledFor}`);
      return log || {
        id: doseDocumentId(medicine.id, scheduledFor),
        medId: medicine.id,
        scheduledFor,
        status: 'pending',
      };
    })).sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  }

  async function recordDose(spaceId, actor, input) {
    const db = getFirestore();
    const medicineRef = collection(spaceId, 'medicines').doc(input.medId);
    const logRef = collection(spaceId, 'doseLogs').doc(doseDocumentId(input.medId, input.scheduledFor));
    let result;
    await db.runTransaction(async (transaction) => {
      const [medicineSnapshot, logSnapshot] = await Promise.all([
        transaction.get(medicineRef),
        transaction.get(logRef),
      ]);
      if (!medicineSnapshot.exists || medicineSnapshot.get('active') === false) throw notFound('Medicine');
      const medicine = medicineSnapshot.data();
      const [date, time] = input.scheduledFor.split('T');
      if (!medicineScheduledOn(medicine, date) || !medicine.times.includes(time)) {
        const error = new Error('That time is not part of this medicine schedule.');
        error.status = 400;
        throw error;
      }
      if (logSnapshot.exists && !['pending', 'missed'].includes(logSnapshot.get('status'))) {
        const error = new Error('This dose has already been recorded.');
        error.status = 409;
        throw error;
      }

      const record = {
        medId: input.medId,
        scheduledFor: input.scheduledFor,
        status: input.status,
        actedAt: now().toISOString(),
        actedBy: actor.memberId,
      };
      if (logSnapshot.exists) transaction.update(logRef, record);
      else transaction.create(logRef, record);
      result = { id: logRef.id, ...record };
    });
    return result;
  }

  async function adherence(spaceId, days, through) {
    const start = new Date(`${through}T12:00:00.000Z`);
    start.setUTCDate(start.getUTCDate() - days + 1);
    const startDate = start.toISOString().slice(0, 10);
    const snapshot = await collection(spaceId, 'doseLogs')
      .where('scheduledFor', '>=', `${startDate}T00:00`)
      .where('scheduledFor', '<', `${through}T24:00`)
      .orderBy('scheduledFor', 'asc')
      .limit(DOSE_LIMIT)
      .get();
    return calculateAdherence(snapshot.docs.map((doc) => doc.data()), days, through);
  }

  return {
    listMedicines,
    createMedicine,
    updateMedicine,
    deleteMedicine,
    listAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    listDoses,
    recordDose,
    adherence,
  };
}

module.exports = {
  createRecordsService,
  doseDocumentId,
  medicineScheduledOn,
  calculateAdherence,
  PAGE_LIMIT,
  DOSE_LIMIT,
};
