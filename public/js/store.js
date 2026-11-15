/* In-memory cache for records loaded from the authenticated API. */

function emptyStoreState() {
  return {
    space: {},
    viewer: null,
    members: [],
    medicines: [],
    doseLogs: [],
    appointments: [],
    suggestions: [],
    auditLog: [],
  };
}

const store = {
  state: emptyStoreState(),

  reset() {
    this.state = emptyStoreState();
  },

  medicine(id) {
    return this.state.medicines.find((medicine) => medicine.id === id);
  },

  dose(id) {
    return this.state.doseLogs.find((dose) => dose.id === id);
  },

  dosesFor(date) {
    return this.state.doseLogs
      .filter((dose) => dose.scheduledFor.startsWith(date))
      .sort((left, right) => left.scheduledFor.localeCompare(right.scheduledFor));
  },

  actOnDose(id, status) {
    const dose = this.dose(id);
    if (!dose) return null;
    dose.status = status;
    dose.actedAt = SentiDoseClock.now().toTimeString().slice(0, 5);
    return dose;
  },

  adherence(days = 7) {
    const today = SentiDoseClock.now().toISOString().slice(0, 10);
    const dates = Array.from({ length: days }, (_, index) => addDays(today, index - days + 1));
    const summary = dates.map((date) => {
      const doses = this.state.doseLogs.filter((dose) => dose.scheduledFor.startsWith(date) && dose.status !== 'pending');
      return { date, taken: doses.filter((dose) => dose.status === 'taken').length, total: doses.length };
    });
    const taken = summary.reduce((sum, day) => sum + day.taken, 0);
    const total = summary.reduce((sum, day) => sum + day.total, 0);
    return { percent: total ? Math.round((taken / total) * 100) : 0, taken, total, days: summary };
  },

  decide(id, decision) {
    const suggestion = this.state.suggestions.find((item) => item.id === id);
    if (!suggestion) return null;
    suggestion.status = decision === 'approved' ? 'approved' : 'rejected';
    return suggestion;
  },
};

function addDays(iso, delta) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
}
