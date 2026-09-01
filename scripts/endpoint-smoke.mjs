const BASE = 'http://localhost:3000';
const PASSWORD = 'PowerZone2024!';
const runId = Date.now();
const results = [];

function values(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function idOf(body) {
  return body?.id || body?.paymentId || body?.user?.id || body?.data?.id;
}

async function request(key, path, { method = 'GET', token, body, expected = [200, 201, 204], note = '' } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  let response;
  let payload;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  } catch (error) {
    results.push({ key, method, path, status: 0, ok: false, note, error: String(error) });
    return null;
  }
  const ok = expected.includes(response.status);
  const message = ok ? '' : (payload?.message || payload?.error || String(payload || '')).slice(0, 240);
  results.push({ key, method, path, status: response.status, ok, note, error: message });
  return payload;
}

async function raw(path, options = {}) {
  const before = results.length;
  const data = await request(`AUX ${options.method || 'GET'} ${path}`, path, options);
  results.splice(before, 1);
  return data;
}

async function login(email, cover = false) {
  const fn = cover ? request : raw;
  const data = await fn(
    cover ? 'POST /api/auth/login' : '/api/auth/login',
    ...(cover ? ['/api/auth/login'] : []),
    { method: 'POST', body: { email, password: PASSWORD } },
  );
  if (!data?.tokens?.accessToken) throw new Error(`No se pudo iniciar sesión como ${email}`);
  return data;
}

async function main() {
  const spec = await (await fetch(`${BASE}/api/docs-json`)).json();
  const expectedKeys = [];
  for (const [path, definition] of Object.entries(spec.paths)) {
    for (const method of ['get', 'post', 'patch', 'put', 'delete']) {
      if (definition[method]) expectedKeys.push(`${method.toUpperCase()} ${path}`);
    }
  }

  const admin = await login('admin@powerzone.app', true);
  const superadmin = await login('superadmin@powerzone.app');
  const trainer = await login('trainer@powerzone.app');
  const reception = await login('reception@powerzone.app');
  const client = await login('client@powerzone.app');
  const client2 = await login('client2@powerzone.app');
  const A = admin.tokens.accessToken;
  const S = superadmin.tokens.accessToken;
  const T = trainer.tokens.accessToken;
  const R = reception.tokens.accessToken;
  const C = client.tokens.accessToken;
  const C2 = client2.tokens.accessToken;
  const gymId = admin.user.gymId;

  // Auth: register, refresh, me, change password, logout.
  const registeredEmail = `endpoint.${runId}@example.com`;
  const registered = await request('POST /api/auth/register', '/api/auth/register', {
    method: 'POST', body: { email: registeredEmail, password: PASSWORD, firstName: 'Endpoint', lastName: 'Tester', gymId },
  });
  const registeredId = registered?.user?.id;
  const refreshed = await request('POST /api/auth/refresh', '/api/auth/refresh', {
    method: 'POST', body: { refreshToken: registered?.tokens?.refreshToken },
  });
  let registeredToken = refreshed?.accessToken || registered?.tokens?.accessToken;
  await request('GET /api/auth/me', '/api/auth/me', { token: registeredToken });
  await request('POST /api/auth/change-password', '/api/auth/change-password', {
    method: 'POST', token: registeredToken, body: { currentPassword: PASSWORD, newPassword: 'EndpointPass2026!' },
  });
  const relogin = await raw('/api/auth/login', {
    method: 'POST', body: { email: registeredEmail, password: 'EndpointPass2026!' },
  });
  await request('POST /api/auth/logout', '/api/auth/logout', {
    method: 'POST', token: relogin?.tokens?.accessToken, body: { refreshToken: relogin?.tokens?.refreshToken },
  });
  const registeredSession = await raw('/api/auth/login', {
    method: 'POST', body: { email: registeredEmail, password: 'EndpointPass2026!' },
  });
  registeredToken = registeredSession?.tokens?.accessToken;

  // Gyms.
  const gyms = await request('GET /api/gyms', '/api/gyms', { token: S });
  const tempGym = await request('POST /api/gyms', '/api/gyms', {
    method: 'POST', token: S,
    body: { name: `Endpoint Gym ${runId}`, slug: `endpoint-gym-${runId}`, city: 'Bogotá', maxCapacity: 20, currency: 'cop' },
  });
  const tempGymId = idOf(tempGym);
  await request('GET /api/gyms/{id}', `/api/gyms/${tempGymId}`, { token: S });
  await request('PATCH /api/gyms/{id}', `/api/gyms/${tempGymId}`, {
    method: 'PATCH', token: S, body: { name: `Endpoint Gym Updated ${runId}` },
  });
  await request('DELETE /api/gyms/{id}', `/api/gyms/${tempGymId}`, { method: 'DELETE', token: S });

  // Users and profiles.
  const allUsers = await request('GET /api/users', '/api/users?limit=100', { token: A });
  const users = values(allUsers);
  const trainerId = users.find(u => u.email === 'trainer@powerzone.app')?.id || trainer.user.id;
  const client2Id = users.find(u => u.email === 'client2@powerzone.app')?.id || client2.user.id;
  const tempUser = await request('POST /api/users', '/api/users', {
    method: 'POST', token: A,
    body: { email: `created.${runId}@example.com`, password: 'CreatedPass2026!', firstName: 'Created', lastName: 'User', role: 'trainer', heightCm: 175, weightKg: 75, goal: 'general_fitness', activityLevel: 'moderate' },
  });
  const tempUserId = idOf(tempUser);
  await request('GET /api/users/me/profile', '/api/users/me/profile', { token: C });
  await request('PATCH /api/users/me/profile', '/api/users/me/profile', {
    method: 'PATCH', token: C, body: { weightKg: 78.5, activityLevel: 'active' },
  });
  await request('GET /api/users/{id}', `/api/users/${tempUserId}`, { token: A });
  await request('GET /api/users/{id}/profile', `/api/users/${tempUserId}/profile`, { token: T });
  await request('PATCH /api/users/{id}/profile', `/api/users/${tempUserId}/profile`, {
    method: 'PATCH', token: T, body: { heightCm: 176, weightKg: 76 },
  });
  await request('PATCH /api/users/{id}', `/api/users/${tempUserId}`, {
    method: 'PATCH', token: A, body: { firstName: 'Updated', phone: '+57 300 000 0000' },
  });
  await request('DELETE /api/users/{id}', `/api/users/${tempUserId}`, { method: 'DELETE', token: A });

  // Membership types and memberships.
  const membershipTypes = await request('GET /api/memberships/types', '/api/memberships/types?limit=100', { token: R });
  const seedType = values(membershipTypes)[0];
  const tempType = await request('POST /api/memberships/types', '/api/memberships/types', {
    method: 'POST', token: A,
    body: { name: `Endpoint Type ${runId}`, durationDays: 7, price: 10, currency: 'usd', features: ['test'] },
  });
  const tempTypeId = idOf(tempType);
  await request('PATCH /api/memberships/types/{id}', `/api/memberships/types/${tempTypeId}`, {
    method: 'PATCH', token: A, body: { price: 12 },
  });
  await request('DELETE /api/memberships/types/{id}', `/api/memberships/types/${tempTypeId}`, { method: 'DELETE', token: A });
  const assigned = await request('POST /api/memberships/assign', '/api/memberships/assign', {
    method: 'POST', token: R,
    body: { userId: registeredId, membershipTypeId: seedType?.id, price: 25, autoRenew: true, notes: 'endpoint test' },
  });
  const membershipId = idOf(assigned);
  await request('GET /api/memberships', `/api/memberships?userId=${registeredId}`, { token: A });
  await request('GET /api/memberships/my', '/api/memberships/my', { token: registeredToken });
  await request('PATCH /api/memberships/assign/{id}/renew', `/api/memberships/assign/${membershipId}/renew`, {
    method: 'PATCH', token: R, body: {},
  });
  await request('PATCH /api/memberships/assign/{id}/cancel', `/api/memberships/assign/${membershipId}/cancel`, {
    method: 'PATCH', token: R, body: {},
  });

  // Payments, including mock checkout.
  const manualPayment = await request('POST /api/payments', '/api/payments', {
    method: 'POST', token: R,
    body: { userId: registeredId, membershipTypeId: seedType?.id, amount: 25, currency: 'usd', paymentMethod: 'cash', transactionId: `endpoint-${runId}` },
  });
  await request('GET /api/payments', `/api/payments?userId=${registeredId}`, { token: A });
  await request('GET /api/payments/my', '/api/payments/my', { token: registeredToken });
  const checkout = await request('POST /api/payments/checkout', '/api/payments/checkout', {
    method: 'POST', token: registeredToken, body: { membershipTypeId: seedType?.id },
  });
  await request('POST /api/payments/mock-checkout/{id}/confirm', `/api/payments/mock-checkout/${checkout?.paymentId}/confirm`, {
    method: 'POST', token: registeredToken, body: {},
  });
  await request('GET /api/payments/{id}', `/api/payments/${idOf(manualPayment)}`, { token: A });
  await request('POST /api/payments/webhook/stripe', '/api/payments/webhook/stripe', {
    method: 'POST', body: {}, expected: [500], note: 'Stripe no configurado: fallo esperado' },
  );

  // Exercises and routines.
  const exercise = await request('POST /api/exercises', '/api/exercises', {
    method: 'POST', token: T,
    body: { name: `Endpoint Exercise ${runId}`, description: 'Smoke test', category: 'core', muscleGroup: 'Core', difficulty: 2, instructions: ['Start', 'Finish'] },
  });
  const exerciseId = idOf(exercise);
  await request('GET /api/exercises', '/api/exercises?limit=100', { token: C });
  await request('GET /api/exercises/{id}', `/api/exercises/${exerciseId}`, { token: C });
  await request('PATCH /api/exercises/{id}', `/api/exercises/${exerciseId}`, {
    method: 'PATCH', token: T, body: { difficulty: 3 },
  });
  const routine = await request('POST /api/routines', '/api/routines', {
    method: 'POST', token: T,
    body: { title: `Endpoint Routine ${runId}`, objective: 'general', difficulty: 2, daysPerWeek: 2, durationWeeks: 4,
      exercises: [{ exerciseId, dayOfWeek: 1, order: 1, sets: 3, reps: 10, restSeconds: 45 }] },
  });
  const routineId = idOf(routine);
  await request('POST /api/routines/generate', '/api/routines/generate', {
    method: 'POST', token: T,
    body: { userId: registeredId, objective: 'general', daysPerWeek: 3, difficulty: 2, useAI: false },
  });
  await request('GET /api/routines', '/api/routines?limit=100', { token: T });
  await request('GET /api/routines/mine', '/api/routines/mine', { token: registeredToken });
  await request('GET /api/routines/{id}', `/api/routines/${routineId}`, { token: T });
  await request('PATCH /api/routines/{id}', `/api/routines/${routineId}`, {
    method: 'PATCH', token: T, body: { title: `Endpoint Routine Updated ${runId}`, status: 'active' },
  });
  await request('PATCH /api/routines/{id}/assign', `/api/routines/${routineId}/assign`, {
    method: 'PATCH', token: T, body: { userId: registeredId },
  });
  await request('DELETE /api/routines/{id}', `/api/routines/${routineId}`, { method: 'DELETE', token: A });
  await request('DELETE /api/exercises/{id}', `/api/exercises/${exerciseId}`, { method: 'DELETE', token: A });

  // AI proxy backed by the included FastAPI service.
  await request('GET /api/ai-proxy/health', '/api/ai-proxy/health');
  await request('POST /api/ai-proxy/chat', '/api/ai-proxy/chat', {
    method: 'POST', token: C, body: { sessionId: `endpoint-${runId}`, message: '¿Qué clases hay mañana?', context: { test: true } },
  });
  await request('POST /api/ai-proxy/routines/generate', '/api/ai-proxy/routines/generate', {
    method: 'POST', token: T, body: { userId: registeredId, objective: 'gain_muscle', daysPerWeek: 3, difficulty: 2 },
  });
  await request('POST /api/ai-proxy/recommendations/workout', '/api/ai-proxy/recommendations/workout', {
    method: 'POST', token: T, body: { userId: registeredId, context: { goal: 'general_fitness' } },
  });
  await request('POST /api/ai-proxy/recommendations/nutrition', '/api/ai-proxy/recommendations/nutrition', {
    method: 'POST', token: C, body: { userId: registeredId, context: { goal: 'maintain' } },
  });

  // Classes and bookings.
  const start = new Date(Date.now() + 7 * 86400000);
  const end = new Date(start.getTime() + 3600000);
  const gymClass = await request('POST /api/classes', '/api/classes', {
    method: 'POST', token: T,
    body: { name: `Endpoint Class ${runId}`, category: 'Functional', instructorId: trainerId, capacity: 5, startTime: start.toISOString(), endTime: end.toISOString(), room: 'Test room' },
  });
  const classId = idOf(gymClass);
  await request('GET /api/classes', '/api/classes?limit=100', { token: C });
  await request('GET /api/classes/upcoming', '/api/classes/upcoming', { token: C });
  await request('POST /api/classes/{id}/book', `/api/classes/${classId}/book`, {
    method: 'POST', token: registeredToken, body: { allowWaitlist: true },
  });
  await request('GET /api/classes/bookings/me', '/api/classes/bookings/me', { token: registeredToken });
  await request('GET /api/classes/bookings/{classId}', `/api/classes/bookings/${classId}`, { token: T });
  await request('GET /api/classes/{id}', `/api/classes/${classId}`, { token: C });
  await request('PATCH /api/classes/{id}', `/api/classes/${classId}`, {
    method: 'PATCH', token: T, body: { room: 'Updated test room', capacity: 6 },
  });
  await request('DELETE /api/classes/{id}/book', `/api/classes/${classId}/book`, {
    method: 'DELETE', token: registeredToken,
  });
  await raw(`/api/classes/${classId}/book`, {
    method: 'POST', token: registeredToken, body: { allowWaitlist: true },
  });
  await request('PATCH /api/classes/{id}/attendance', `/api/classes/${classId}/attendance`, {
    method: 'PATCH', token: T, body: { userId: registeredId, attended: true },
  });

  // Attendance.
  await request('POST /api/attendance/check-in/{userId}', `/api/attendance/check-in/${registeredId}`, {
    method: 'POST', token: R, body: { method: 'manual' },
  });
  await request('POST /api/attendance/check-out/{userId}', `/api/attendance/check-out/${registeredId}`, {
    method: 'POST', token: R, body: { method: 'manual' },
  });
  await request('POST /api/attendance/class', '/api/attendance/class', {
    method: 'POST', token: registeredToken, body: { classId, method: 'manual' },
  });
  await request('GET /api/attendance/history', `/api/attendance/history?userId=${registeredId}`, { token: R });
  await request('GET /api/attendance/my', '/api/attendance/my', { token: registeredToken });
  await request('GET /api/attendance/occupancy/{gymId}', `/api/attendance/occupancy/${gymId}`, { token: R });
  await request('DELETE /api/classes/{id}', `/api/classes/${classId}`, { method: 'DELETE', token: A });

  // Inventory and maintenance.
  const item = await request('POST /api/inventory', '/api/inventory', {
    method: 'POST', token: A,
    body: { name: `Endpoint Item ${runId}`, category: 'equipment', quantity: 2, availableQuantity: 2, condition: 'good', status: 'available', replacementCost: 100, location: 'Test' },
  });
  const itemId = idOf(item);
  await request('GET /api/inventory', '/api/inventory?limit=100', { token: R });
  const maintenance = await request('POST /api/inventory/{id}/maintenance', `/api/inventory/${itemId}/maintenance`, {
    method: 'POST', token: A,
    body: { description: 'Endpoint maintenance', scheduledAt: new Date(Date.now() + 86400000).toISOString().slice(0, 10), cost: 20, technician: 'Test Tech' },
  });
  const maintenanceId = idOf(maintenance);
  await request('GET /api/inventory/{id}/maintenance', `/api/inventory/${itemId}/maintenance`, { token: T });
  await request('PATCH /api/inventory/maintenance/{maintenanceId}', `/api/inventory/maintenance/${maintenanceId}`, {
    method: 'PATCH', token: A, body: { status: 'in_progress', technician: 'Updated Tech' },
  });
  await request('DELETE /api/inventory/maintenance/{maintenanceId}', `/api/inventory/maintenance/${maintenanceId}`, { method: 'DELETE', token: A });
  await request('GET /api/inventory/{id}', `/api/inventory/${itemId}`, { token: R });
  await request('PATCH /api/inventory/{id}', `/api/inventory/${itemId}`, {
    method: 'PATCH', token: A, body: { availableQuantity: 1, condition: 'fair' },
  });
  await request('DELETE /api/inventory/{id}', `/api/inventory/${itemId}`, { method: 'DELETE', token: A });

  // Nutrition.
  const food = await request('POST /api/nutrition/foods', '/api/nutrition/foods', {
    method: 'POST', token: T,
    body: { name: `Endpoint Food ${runId}`, category: 'protein', servingSizeG: 100, calories: 120, protein: 20, carbs: 4, fats: 3, fiber: 1 },
  });
  const foodId = idOf(food);
  await request('GET /api/nutrition/foods', '/api/nutrition/foods?limit=100', { token: C });
  await request('PATCH /api/nutrition/foods/{id}', `/api/nutrition/foods/${foodId}`, {
    method: 'PATCH', token: T, body: { calories: 125 },
  });
  const nutritionLog = await request('POST /api/nutrition/logs', '/api/nutrition/logs', {
    method: 'POST', token: registeredToken, body: { foodId, mealType: 'lunch', quantityG: 150 },
  });
  const nutritionLogId = idOf(nutritionLog);
  await request('GET /api/nutrition/logs', '/api/nutrition/logs?limit=100', { token: registeredToken });
  await request('GET /api/nutrition/summary/daily', '/api/nutrition/summary/daily', { token: registeredToken });
  await request('GET /api/nutrition/logs/{id}', `/api/nutrition/logs/${nutritionLogId}`, { token: registeredToken });
  await request('DELETE /api/nutrition/logs/{id}', `/api/nutrition/logs/${nutritionLogId}`, { method: 'DELETE', token: registeredToken });
  await request('DELETE /api/nutrition/foods/{id}', `/api/nutrition/foods/${foodId}`, { method: 'DELETE', token: A });

  // Notifications.
  const notification = await request('POST /api/notifications', '/api/notifications', {
    method: 'POST', token: A,
    body: { userId: registeredId, type: 'info', channel: 'in_app', title: 'Endpoint notification', body: 'Smoke test', data: { runId } },
  });
  const notificationId = idOf(notification);
  await request('POST /api/notifications/message', '/api/notifications/message', {
    method: 'POST', token: registeredToken, body: { userId: client2Id, title: 'Endpoint message', body: 'Smoke test message' },
  });
  await request('GET /api/notifications/mine', '/api/notifications/mine?limit=100', { token: registeredToken });
  await request('GET /api/notifications/unread-count', '/api/notifications/unread-count', { token: registeredToken });
  await request('PATCH /api/notifications/{id}/read', `/api/notifications/${notificationId}/read`, { method: 'PATCH', token: registeredToken, body: {} });
  await request('PATCH /api/notifications/read-all', '/api/notifications/read-all', { method: 'PATCH', token: registeredToken, body: {} });
  await request('DELETE /api/notifications/{id}', `/api/notifications/${notificationId}`, { method: 'DELETE', token: registeredToken });

  // Marketing campaigns.
  const campaign = await request('POST /api/marketing/campaigns', '/api/marketing/campaigns', {
    method: 'POST', token: A,
    body: { name: `Endpoint Campaign ${runId}`, subject: 'Test', content: 'Endpoint smoke test', type: 'in_app', audience: { roles: ['client'] } },
  });
  const campaignId = idOf(campaign);
  await request('GET /api/marketing/campaigns', '/api/marketing/campaigns?limit=100', { token: A });
  await request('GET /api/marketing/campaigns/{id}', `/api/marketing/campaigns/${campaignId}`, { token: A });
  await request('PATCH /api/marketing/campaigns/{id}', `/api/marketing/campaigns/${campaignId}`, {
    method: 'PATCH', token: A, body: { subject: 'Updated test' },
  });
  await request('POST /api/marketing/campaigns/{id}/send', `/api/marketing/campaigns/${campaignId}/send`, {
    method: 'POST', token: A, body: { sendNow: true },
  });
  const cancelCampaign = await raw('/api/marketing/campaigns', {
    method: 'POST', token: A, body: { name: `Cancel Campaign ${runId}`, content: 'Test', type: 'in_app' },
  });
  await request('POST /api/marketing/campaigns/{id}/cancel', `/api/marketing/campaigns/${idOf(cancelCampaign)}/cancel`, {
    method: 'POST', token: A, body: {},
  });
  const deleteCampaign = await raw('/api/marketing/campaigns', {
    method: 'POST', token: A, body: { name: `Delete Campaign ${runId}`, content: 'Test', type: 'in_app' },
  });
  await request('DELETE /api/marketing/campaigns/{id}', `/api/marketing/campaigns/${idOf(deleteCampaign)}`, { method: 'DELETE', token: A });

  // Reports.
  await request('GET /api/reports/financial', '/api/reports/financial', { token: A });
  await request('GET /api/reports/operational', '/api/reports/operational', { token: A });
  await request('GET /api/reports/memberships', '/api/reports/memberships', { token: A });
  await request('GET /api/reports/attendance', '/api/reports/attendance', { token: R });
  await request('GET /api/reports/progress/{userId}', `/api/reports/progress/${registeredId}`, { token: T });

  // Cleanup the registered test user last; its tenant data cascades where configured.
  await raw(`/api/users/${registeredId}`, { method: 'DELETE', token: A });

  const covered = new Set(results.map(r => r.key));
  const missing = expectedKeys.filter(key => !covered.has(key));
  const failed = results.filter(r => !r.ok);
  const passed = results.filter(r => r.ok);
  console.log(JSON.stringify({
    summary: {
      openApiOperations: expectedKeys.length,
      coveredOpenApiOperations: expectedKeys.length - missing.length,
      additionalOperations: 1,
      passed: passed.length,
      failed: failed.length,
      missing: missing.length,
    },
    missing,
    failed,
    results,
  }, null, 2));
  process.exitCode = failed.length || missing.length ? 1 : 0;
}

main().catch(error => {
  console.error(JSON.stringify({ fatal: String(error), stack: error?.stack }, null, 2));
  process.exitCode = 2;
});
