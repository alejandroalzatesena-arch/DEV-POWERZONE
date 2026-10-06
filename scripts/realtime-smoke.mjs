const base = process.env.API_BASE_URL || 'http://localhost:3000';
const wsBase = base.replace(/^http/, 'ws');
const password = 'PowerZone2024!';

async function request(path, method = 'GET', token, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

async function login(email) {
  return request('/api/auth/login', 'POST', undefined, { email, password });
}

function connect(topic, token) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${wsBase}/api/ws?${topic}`, ['pz', `jwt.${token}`]);
    const timeout = setTimeout(() => reject(new Error(`WebSocket timeout: ${topic}`)), 5000);
    socket.onopen = () => { clearTimeout(timeout); resolve(socket); };
    socket.onerror = () => { clearTimeout(timeout); reject(new Error(`WebSocket error: ${topic}`)); };
  });
}

function nextEvent(socket, expectedEvent) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Event timeout: ${expectedEvent}`)), 5000);
    const handler = message => {
      const event = JSON.parse(message.data);
      if (event.event !== expectedEvent) return;
      clearTimeout(timeout);
      socket.removeEventListener('message', handler);
      resolve(event.data);
    };
    socket.addEventListener('message', handler);
  });
}

async function main() {
  const admin = await login('admin@powerzone.app');
  const client = await login('client@powerzone.app');
  const client2 = await login('client2@powerzone.app');
  const gymId = admin.user.gymId;
  const notifications = await connect('topic=notifications', client.tokens.accessToken);
  const occupancy = await connect(`topic=occupancy&gymId=${encodeURIComponent(gymId)}`, client.tokens.accessToken);
  try {
    const notificationEvent = nextEvent(notifications, 'notification');
    const created = await request('/api/notifications', 'POST', admin.tokens.accessToken,
      { userId: client.user.id, title: 'Prueba de tiempo real', body: 'Evento de integración' });
    const received = await notificationEvent;
    if (received.id !== created.id) throw new Error('La notificación llegó a un usuario incorrecto');
    await request(`/api/notifications/${created.id}`, 'DELETE', client.tokens.accessToken);

    const occupancyEvent = nextEvent(occupancy, 'occupancy');
    await request(`/api/attendance/check-in/${client2.user.id}`, 'POST', admin.tokens.accessToken,
      { method: 'member_card' });
    const value = await occupancyEvent;
    if (typeof value.current !== 'number' || typeof value.isFull !== 'boolean')
      throw new Error('El evento de aforo tiene un formato incorrecto');
    await request(`/api/attendance/check-out/${client2.user.id}`, 'POST', admin.tokens.accessToken,
      { method: 'member_card' });
    console.log(JSON.stringify({ notifications: 'ok', occupancy: 'ok' }));
  } finally {
    notifications.close(); occupancy.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
