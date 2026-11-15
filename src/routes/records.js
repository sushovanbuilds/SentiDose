'use strict';

const { Router } = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../middleware/error');
const { requireAuth, requireRole } = require('../middleware/auth');

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, 'Expected a real calendar date');
const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const localDateTimeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/)
  .refine((value) => dateSchema.safeParse(value.slice(0, 10)).success, 'Expected a real calendar date');
const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const scheduleSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('daily') }).strict(),
  z.object({ kind: z.literal('weekly'), weekday: z.number().int().min(0).max(6) }).strict(),
]);
const medicineFields = {
  name: z.string().trim().min(2).max(120),
  dose: z.string().trim().min(1).max(80),
  times: z.array(timeSchema).min(1).max(6).refine((times) => new Set(times).size === times.length, 'Dose times must be unique'),
  withFood: z.enum(['before', 'after', 'anytime']),
  stock: z.number().int().min(0).max(9999),
  schedule: scheduleSchema,
  note: z.string().trim().max(500).optional(),
};
const createMedicineSchema = z.object(medicineFields).strict();
const updateMedicineSchema = z.object(medicineFields).partial().strict().refine((value) => Object.keys(value).length > 0);
const createAppointmentSchema = z.object({
  doctor: z.string().trim().min(2).max(120),
  specialty: z.string().trim().max(120).optional(),
  datetime: localDateTimeSchema,
  location: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
  accompaniedBy: z.string().trim().min(2).max(80).optional(),
}).strict();
const updateAppointmentSchema = createAppointmentSchema.partial().strict().refine((value) => Object.keys(value).length > 0);
const doseActionSchema = z.object({
  medId: idSchema,
  scheduledFor: localDateTimeSchema,
  status: z.enum(['taken', 'skipped']),
}).strict();
const suggestionSchema = z.object({
  title: z.string().trim().min(3).max(120),
  details: z.string().trim().min(3).max(1000),
}).strict();
const suggestionDecisionSchema = z.object({ status: z.enum(['approved', 'rejected']) }).strict();
const emptySchema = z.object({}).strict();

function noQuery(request, response, next) {
  if (!emptySchema.safeParse(request.query).success) {
    response.status(400).json({ error: 'This endpoint does not accept query parameters.' });
    return;
  }
  next();
}

function noBody(request, response, next) {
  if (!emptySchema.safeParse(request.body || {}).success) {
    response.status(400).json({ error: 'This endpoint does not accept a request body.' });
    return;
  }
  next();
}

/** @param {object} config @param {object} recordsService */
function createRecordsRouter(config, recordsService) {
  const router = Router();
  router.use(['/medicines', '/appointments', '/doses', '/members', '/suggestions'], requireAuth(config.sessionSecret));

  router.get('/members', noQuery, noBody, asyncHandler(async (request, response) => {
    response.json({ members: await recordsService.listMembers(request.auth.spaceId) });
  }));
  router.get('/suggestions', noQuery, noBody, asyncHandler(async (request, response) => {
    response.json({ suggestions: await recordsService.listSuggestions(request.auth.spaceId) });
  }));
  router.post('/suggestions', noQuery, requireRole('family'), asyncHandler(async (request, response) => {
    const input = suggestionSchema.safeParse(request.body);
    if (!input.success) {
      response.status(400).json({ error: 'Enter a short title and explain the change you want to suggest.' });
      return;
    }
    const suggestion = await recordsService.createSuggestion(request.auth.spaceId, request.auth, input.data);
    response.status(201).json({ suggestion });
  }));
  router.patch('/suggestions/:suggestionId', noQuery, requireRole('elder'), asyncHandler(async (request, response) => {
    const id = idSchema.safeParse(request.params.suggestionId);
    const input = suggestionDecisionSchema.safeParse(request.body);
    if (!id.success || !input.success) {
      response.status(400).json({ error: 'Choose an existing suggestion and approve or reject it.' });
      return;
    }
    const suggestion = await recordsService.decideSuggestion(request.auth.spaceId, id.data, input.data.status, request.auth);
    response.json({ suggestion });
  }));

  router.get('/medicines', noQuery, noBody, asyncHandler(async (request, response) => {
    response.json({ medicines: await recordsService.listMedicines(request.auth.spaceId) });
  }));
  router.post('/medicines', noQuery, requireRole('elder', 'caretaker'), asyncHandler(async (request, response) => {
    const input = createMedicineSchema.safeParse(request.body);
    if (!input.success) {
      response.status(400).json({ error: 'Medicine details are invalid. Check the name, dose, times, food instruction, stock, and schedule.' });
      return;
    }
    const medicine = await recordsService.createMedicine(request.auth.spaceId, request.auth, input.data);
    response.status(201).json({ medicine });
  }));
  router.patch('/medicines/:medicineId', noQuery, requireRole('elder', 'caretaker'), asyncHandler(async (request, response) => {
    const id = idSchema.safeParse(request.params.medicineId);
    const input = updateMedicineSchema.safeParse(request.body);
    if (!id.success || !input.success) {
      response.status(400).json({ error: 'Medicine details are invalid.' });
      return;
    }
    response.json({ medicine: await recordsService.updateMedicine(request.auth.spaceId, id.data, input.data) });
  }));
  router.delete('/medicines/:medicineId', noQuery, noBody, requireRole('elder', 'caretaker'), asyncHandler(async (request, response) => {
    const id = idSchema.safeParse(request.params.medicineId);
    if (!id.success) {
      response.status(400).json({ error: 'Medicine ID is invalid.' });
      return;
    }
    await recordsService.deleteMedicine(request.auth.spaceId, id.data);
    response.status(204).end();
  }));

  router.get('/appointments', noQuery, noBody, asyncHandler(async (request, response) => {
    response.json({ appointments: await recordsService.listAppointments(request.auth.spaceId) });
  }));
  router.post('/appointments', noQuery, requireRole('elder', 'caretaker'), asyncHandler(async (request, response) => {
    const input = createAppointmentSchema.safeParse(request.body);
    if (!input.success) {
      response.status(400).json({ error: 'Appointment details are invalid. Check the doctor, date, and time.' });
      return;
    }
    const appointment = await recordsService.createAppointment(request.auth.spaceId, request.auth, input.data);
    response.status(201).json({ appointment });
  }));
  router.patch('/appointments/:appointmentId', noQuery, requireRole('elder', 'caretaker'), asyncHandler(async (request, response) => {
    const id = idSchema.safeParse(request.params.appointmentId);
    const input = updateAppointmentSchema.safeParse(request.body);
    if (!id.success || !input.success) {
      response.status(400).json({ error: 'Appointment details are invalid.' });
      return;
    }
    response.json({ appointment: await recordsService.updateAppointment(request.auth.spaceId, id.data, input.data) });
  }));
  router.delete('/appointments/:appointmentId', noQuery, noBody, requireRole('elder', 'caretaker'), asyncHandler(async (request, response) => {
    const id = idSchema.safeParse(request.params.appointmentId);
    if (!id.success) {
      response.status(400).json({ error: 'Appointment ID is invalid.' });
      return;
    }
    await recordsService.deleteAppointment(request.auth.spaceId, id.data);
    response.status(204).end();
  }));

  router.get('/doses', noBody, asyncHandler(async (request, response) => {
    const query = z.object({ date: dateSchema }).strict().safeParse(request.query);
    if (!query.success) {
      response.status(400).json({ error: 'Enter a valid date as YYYY-MM-DD.' });
      return;
    }
    response.json({ doses: await recordsService.listDoses(request.auth.spaceId, query.data.date) });
  }));
  router.post('/doses', noQuery, requireRole('elder', 'caretaker'), asyncHandler(async (request, response) => {
    const input = doseActionSchema.safeParse(request.body);
    if (!input.success) {
      response.status(400).json({ error: 'Dose action is invalid.' });
      return;
    }
    response.status(201).json({ dose: await recordsService.recordDose(request.auth.spaceId, request.auth, input.data) });
  }));
  router.get('/doses/adherence', noBody, asyncHandler(async (request, response) => {
    const query = z.object({
      days: z.coerce.number().int().min(1).max(30),
      through: dateSchema,
    }).strict().safeParse(request.query);
    if (!query.success) {
      response.status(400).json({ error: 'Enter a day range from 1 to 30 and an end date as YYYY-MM-DD.' });
      return;
    }
    response.json({ adherence: await recordsService.adherence(request.auth.spaceId, query.data.days, query.data.through) });
  }));

  return router;
}

module.exports = { createRecordsRouter };
