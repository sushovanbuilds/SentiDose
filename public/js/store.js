/* Demo data and state for the front end.
   Replace fetch calls in api.js with real endpoints in M2+. Nothing here is
   sensitive: demo content only, no real patient data. */

const DEMO_TODAY = '2026-11-19';

const DEMO = {
  space: {
    id: 'dadu-space',
    elderName: 'Subrata Halder',
    elderNickname: 'Dadu',
    timezone: 'Asia/Kolkata',
  },
  viewer: { name: 'Rahul', role: 'caretaker' },
  members: [
    { id: 'm1', name: 'Subrata Halder', role: 'elder' },
    { id: 'm2', name: 'Rahul', role: 'family', relation: 'grandson' },
    { id: 'm3', name: 'Priya', role: 'family', relation: 'daughter' },
    { id: 'm4', name: 'Meena', role: 'caretaker', relation: 'caretaker' },
  ],
  medicines: [
    {
      id: 'metformin',
      name: 'Metformin',
      dose: '500 mg',
      times: ['09:00', '21:00'],
      withFood: 'after',
      stock: 12,
      schedule: { kind: 'daily' },
      note: 'Take after breakfast and dinner',
      voiceFrom: 'Rahul',
      voiceDuration: 14,
      voiceTranscript: 'Dadu, please take your morning Metformin after your warm tea. Love you.',
    },
    {
      id: 'amlodipine',
      name: 'Amlodipine',
      dose: '5 mg',
      times: ['21:00'],
      withFood: 'anytime',
      stock: 4,
      schedule: { kind: 'daily' },
      note: 'Take with a full glass of warm water',
      voiceFrom: 'Priya',
      voiceDuration: 11,
      voiceTranscript: 'Dadu, your evening tablet with water before bed.',
    },
    {
      id: 'telmisartan',
      name: 'Telmisartan',
      dose: '40 mg',
      times: ['08:00'],
      withFood: 'before',
      stock: 24,
      schedule: { kind: 'daily' },
      note: 'Before breakfast, blood pressure care',
      voiceFrom: null,
    },
    {
      id: 'vitamin-d3',
      name: 'Vitamin D3',
      dose: '60,000 IU',
      times: ['14:00'],
      withFood: 'after',
      stock: 8,
      schedule: { kind: 'weekly', weekday: 0 },
      note: 'Take with Sunday midday lunch',
      voiceFrom: null,
    },
  ],
  doseLogs: [
    { id: 'd1', medId: 'telmisartan', scheduledFor: '2026-11-19T08:00', status: 'taken', actedAt: '08:05' },
    { id: 'd2', medId: 'metformin', scheduledFor: '2026-11-19T09:00', status: 'pending' },
    { id: 'd3', medId: 'vitamin-d3', scheduledFor: '2026-11-19T14:00', status: 'pending' },
    { id: 'd4', medId: 'amlodipine', scheduledFor: '2026-11-19T21:00', status: 'pending' },
    { id: 'd5', medId: 'metformin', scheduledFor: '2026-11-19T21:00', status: 'pending' },
    { id: 'd6', medId: 'amlodipine', scheduledFor: '2026-11-18T21:00', status: 'missed' },
    { id: 'd7', medId: 'telmisartan', scheduledFor: '2026-11-18T08:00', status: 'taken', actedAt: '08:10' },
    { id: 'd8', medId: 'metformin', scheduledFor: '2026-11-18T09:00', status: 'taken', actedAt: '09:20' },
    { id: 'd9', medId: 'metformin', scheduledFor: '2026-11-18T21:00', status: 'taken', actedAt: '21:15' },
    { id: 'd10', medId: 'telmisartan', scheduledFor: '2026-11-17T08:00', status: 'taken', actedAt: '08:02' },
    { id: 'd11', medId: 'metformin', scheduledFor: '2026-11-17T09:00', status: 'taken', actedAt: '09:00' },
    { id: 'd12', medId: 'metformin', scheduledFor: '2026-11-17T21:00', status: 'taken', actedAt: '21:30' },
    { id: 'd13', medId: 'amlodipine', scheduledFor: '2026-11-17T21:00', status: 'taken', actedAt: '21:30' },
    { id: 'd14', medId: 'telmisartan', scheduledFor: '2026-11-16T08:00', status: 'taken', actedAt: '08:15' },
    { id: 'd15', medId: 'metformin', scheduledFor: '2026-11-16T09:00', status: 'skipped' },
    { id: 'd16', medId: 'metformin', scheduledFor: '2026-11-16T21:00', status: 'taken', actedAt: '21:05' },
    { id: 'd17', medId: 'amlodipine', scheduledFor: '2026-11-16T21:00', status: 'taken', actedAt: '21:05' },
  ],
  appointments: [
    {
      id: 'a1',
      doctor: 'Dr. Amitava Banerjee',
      specialty: 'Cardiology',
      datetime: '2026-11-19T11:30',
      location: 'City Clinic — Block B, Salt Lake',
      notes: 'Bring previous blood test slip and fasting sugar report.',
      accompaniedBy: 'Rahul',
    },
    {
      id: 'a2',
      doctor: 'Dr. Sharmila Sen',
      specialty: 'Ophthalmology',
      datetime: '2026-11-24T16:00',
      location: 'Vision Care Eye Center, 33 Southern Avenue',
      notes: 'Glaucoma and vision check.',
      accompaniedBy: 'Priya',
    },
  ],
  suggestions: [
    {
      id: 's1',
      type: 'medicine.update',
      status: 'pending',
      proposedBy: 'Rahul',
      proposedAt: '2 hours ago',
      medId: 'metformin',
      title: 'Dose time change',
      before: '9:00 AM',
      after: '8:30 AM',
      reason: 'Doctor mentioned it works best 30 minutes before your morning toast and tea.',
    },
    {
      id: 's2',
      type: 'medicine.create',
      status: 'pending',
      proposedBy: 'Priya',
      proposedAt: 'Yesterday at 5:10 PM',
      title: 'New weekly routine',
      before: null,
      after: 'Vitamin D3 60,000 IU, every Sunday at 2:00 PM',
      reason: 'Dr. Sen recommended keeping bone strength up. Just once a week after Sunday lunch.',
    },
    {
      id: 's3',
      type: 'medicine.update',
      status: 'approved',
      proposedBy: 'Priya',
      proposedAt: 'Yesterday, 4:15 PM',
      title: 'Amlodipine evening dose',
      before: '9:00 PM',
      after: '9:30 PM',
      reason: 'Bedtime moved slightly later.',
    },
  ],
  auditLog: [
    { id: 'l1', actor: 'Subrata Halder', role: 'elder', action: 'Marked Metformin 500 mg as taken', at: 'Today, 8:05 AM' },
    { id: 'l2', actor: 'Rahul', role: 'family', action: 'Suggested a time change for Metformin', at: 'Today, 7:40 AM' },
    { id: 'l3', actor: 'Meena', role: 'caretaker', action: 'Added appointment with Dr. Sharmila Sen', at: 'Yesterday, 6:20 PM' },
    { id: 'l4', actor: 'Subrata Halder', role: 'elder', action: 'Approved Amlodipine dose change to 9:30 PM', at: 'Yesterday, 4:15 PM' },
    { id: 'l5', actor: 'Priya', role: 'family', action: 'Suggested adding Vitamin D3 weekly', at: 'Yesterday, 5:10 PM' },
  ],
};

const STORAGE_KEY = 'sentidose-demo-v1';

/**
 * Read the working copy, seeding from DEMO on first use.
 * @returns {typeof DEMO} state
 */
function loadState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* sessionStorage may be unavailable; fall through to a fresh copy. */
  }
  return structuredClone(DEMO);
}

/** @param {typeof DEMO} state */
function saveState(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* Ignore quota or privacy-mode errors; the in-memory copy still works. */
  }
}

const store = {
  state: loadState(),

  reset() {
    this.state = structuredClone(DEMO);
    saveState(this.state);
  },

  /** @param {string} id */
  medicine(id) {
    return this.state.medicines.find((m) => m.id === id);
  },

  /** @param {string} id */
  dose(id) {
    return this.state.doseLogs.find((d) => d.id === id);
  },

  /** Doses for a calendar day, sorted by time. @param {string} date */
  dosesFor(date) {
    return this.state.doseLogs
      .filter((d) => d.scheduledFor.startsWith(date))
      .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  },

  /** @param {string} id @param {'taken'|'skipped'} status */
  actOnDose(id, status) {
    const log = this.dose(id);
    if (!log) return null;
    log.status = status;
    log.actedAt = SentiDoseClock.now().toTimeString().slice(0, 5);
    saveState(this.state);
    return log;
  },

  /**
   * Adherence over the trailing window, counting acted doses only.
   * @param {number} days
   * @returns {{percent:number, taken:number, total:number, days:Array<object>}}
   */
  adherence(days = 7) {
    const rows = [];
    let taken = 0;
    let total = 0;

    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const date = addDays(DEMO_TODAY, -offset);
      const doses = this.state.doseLogs.filter(
        (d) => d.scheduledFor.startsWith(date) && d.status !== 'pending'
      );
      const dayTaken = doses.filter((d) => d.status === 'taken').length;
      taken += dayTaken;
      total += doses.length;
      rows.push({ date, taken: dayTaken, total: doses.length });
    }

    return {
      percent: total === 0 ? 0 : Math.round((taken / total) * 100),
      taken,
      total,
      days: rows,
    };
  },

  /** @param {string} id @param {'approved'|'rejected'} decision */
  decide(id, decision) {
    const item = this.state.suggestions.find((s) => s.id === id);
    if (!item) return null;
    item.status = decision === 'approved' ? 'approved' : 'rejected';
    saveState(this.state);
    return item;
  },
};

/**
 * @param {string} iso YYYY-MM-DD
 * @param {number} delta days
 * @returns {string} YYYY-MM-DD
 */
function addDays(iso, delta) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
}
