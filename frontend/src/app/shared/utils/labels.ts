// ============================================================
// Etiquetas en español + colores de badges para cada enum
// ============================================================

export const USER_ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'trainer', label: 'Entrenador' },
  { value: 'receptionist', label: 'Recepcionista' },
  { value: 'client', label: 'Cliente' },
] as const;

export const roleLabel = (role?: string | null): string =>
  USER_ROLES.find((r) => r.value === role)?.label ?? role ?? '—';

export const roleColor = (role?: string | null): string => {
  switch (role) {
    case 'admin':
      return 'volt';
    case 'trainer':
      return 'info';
    case 'receptionist':
      return 'orange';
    default:
      return 'muted';
  }
};

export const GENDERS = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
  { value: 'other', label: 'Otro' },
] as const;

export const genderLabel = (g?: string): string => GENDERS.find((x) => x.value === g)?.label ?? '—';

export const FITNESS_GOALS = [
  { value: 'lose_fat', label: 'Perder grasa' },
  { value: 'gain_muscle', label: 'Ganar músculo' },
  { value: 'maintain', label: 'Mantener' },
  { value: 'endurance', label: 'Resistencia' },
  { value: 'general_fitness', label: 'Estado general' },
] as const;

export const fitnessGoalLabel = (g?: string): string =>
  FITNESS_GOALS.find((x) => x.value === g)?.label ?? '—';

export const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentario' },
  { value: 'light', label: 'Ligero' },
  { value: 'moderate', label: 'Moderado' },
  { value: 'active', label: 'Activo' },
  { value: 'very_active', label: 'Muy activo' },
] as const;

export const activityLevelLabel = (a?: string): string =>
  ACTIVITY_LEVELS.find((x) => x.value === a)?.label ?? '—';

export const MEMBERSHIP_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'active', label: 'Activa', color: 'success' },
  { value: 'expired', label: 'Expirada', color: 'danger' },
  { value: 'cancelled', label: 'Cancelada', color: 'muted' },
  { value: 'pending', label: 'Pendiente', color: 'orange' },
];

export const membershipStatus = (s?: string) =>
  MEMBERSHIP_STATUSES.find((x) => x.value === s) ?? {
    value: s ?? '',
    label: s ?? '—',
    color: 'muted',
  };

export const PAYMENT_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'pending', label: 'Pendiente', color: 'orange' },
  { value: 'succeeded', label: 'Pagado', color: 'success' },
  { value: 'failed', label: 'Fallido', color: 'danger' },
  { value: 'refunded', label: 'Reembolsado', color: 'muted' },
  { value: 'cancelled', label: 'Cancelado', color: 'muted' },
];

export const paymentStatus = (s?: string) =>
  PAYMENT_STATUSES.find((x) => x.value === s) ?? {
    value: s ?? '',
    label: s ?? '—',
    color: 'muted',
  };

export const PAYMENT_METHODS: { value: string; label: string; icon: string }[] = [
  { value: 'card', label: 'Tarjeta', icon: 'credit_card' },
  { value: 'cash', label: 'Efectivo', icon: 'payments' },
  { value: 'transfer', label: 'Transferencia', icon: 'account_balance' },
  { value: 'stripe', label: 'Stripe', icon: 'lock' },
];

export const paymentMethodLabel = (m?: string): string =>
  PAYMENT_METHODS.find((x) => x.value === m)?.label ?? '—';

export const ROUTINE_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'draft', label: 'Borrador', color: 'muted' },
  { value: 'active', label: 'Activa', color: 'success' },
  { value: 'archived', label: 'Archivada', color: 'muted' },
];

export const routineStatus = (s?: string) =>
  ROUTINE_STATUSES.find((x) => x.value === s) ?? {
    value: s ?? '',
    label: s ?? '—',
    color: 'muted',
  };

export const ROUTINE_OBJECTIVES = [
  { value: 'strength', label: 'Fuerza' },
  { value: 'hypertrophy', label: 'Hipertrofia' },
  { value: 'weight_loss', label: 'Pérdida de peso' },
  { value: 'endurance', label: 'Resistencia' },
  { value: 'general', label: 'General' },
  { value: 'rehabilitation', label: 'Rehabilitación' },
] as const;

export const routineObjectiveLabel = (o?: string): string =>
  ROUTINE_OBJECTIVES.find((x) => x.value === o)?.label ?? '—';

export const EXERCISE_CATEGORIES = [
  { value: 'chest', label: 'Pecho', icon: 'fitness_center' },
  { value: 'back', label: 'Espalda', icon: 'fitness_center' },
  { value: 'legs', label: 'Piernas', icon: 'directions_run' },
  { value: 'shoulders', label: 'Hombros', icon: 'fitness_center' },
  { value: 'arms', label: 'Brazos', icon: 'fitness_center' },
  { value: 'core', label: 'Core / Abdomen', icon: 'accessibility_new' },
  { value: 'cardio', label: 'Cardio', icon: 'directions_run' },
  { value: 'full_body', label: 'Cuerpo completo', icon: 'accessibility_new' },
  { value: 'stretching', label: 'Estiramiento', icon: 'self_improvement' },
] as const;

export const exerciseCategoryLabel = (c?: string): string =>
  EXERCISE_CATEGORIES.find((x) => x.value === c)?.label ?? '—';

export const exerciseCategoryIcon = (c?: string): string =>
  EXERCISE_CATEGORIES.find((x) => x.value === c)?.icon ?? 'fitness_center';

export const CLASS_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'scheduled', label: 'Programada', color: 'info' },
  { value: 'in_progress', label: 'En curso', color: 'volt' },
  { value: 'completed', label: 'Finalizada', color: 'success' },
  { value: 'cancelled', label: 'Cancelada', color: 'danger' },
];

export const classStatus = (s?: string) =>
  CLASS_STATUSES.find((x) => x.value === s) ?? { value: s ?? '', label: s ?? '—', color: 'muted' };

export const BOOKING_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'confirmed', label: 'Confirmada', color: 'success' },
  { value: 'cancelled', label: 'Cancelada', color: 'muted' },
  { value: 'waitlisted', label: 'Lista de espera', color: 'orange' },
  { value: 'attended', label: 'Asistió', color: 'volt' },
  { value: 'no_show', label: 'No asistió', color: 'danger' },
];

export const bookingStatus = (s?: string) =>
  BOOKING_STATUSES.find((x) => x.value === s) ?? {
    value: s ?? '',
    label: s ?? '—',
    color: 'muted',
  };

export const ATTENDANCE_TYPES: { value: string; label: string; color: string }[] = [
  { value: 'check_in', label: 'Check-in', color: 'success' },
  { value: 'check_out', label: 'Check-out', color: 'info' },
  { value: 'class', label: 'Clase', color: 'volt' },
];

export const attendanceType = (s?: string) =>
  ATTENDANCE_TYPES.find((x) => x.value === s) ?? {
    value: s ?? '',
    label: s ?? '—',
    color: 'muted',
  };

export const ATTENDANCE_METHODS = [
  { value: 'member_card', label: 'Tarjeta de socio' },
  { value: 'qr_code', label: 'Código QR' },
  { value: 'manual', label: 'Manual' },
  { value: 'face_id', label: 'Reconocimiento facial' },
] as const;

export const attendanceMethodLabel = (m?: string): string =>
  ATTENDANCE_METHODS.find((x) => x.value === m)?.label ?? '—';

export const INVENTORY_CATEGORIES = [
  { value: 'equipment', label: 'Equipamiento' },
  { value: 'weights', label: 'Pesas' },
  { value: 'machines', label: 'Máquinas' },
  { value: 'supplements', label: 'Suplementos' },
  { value: 'accessories', label: 'Accesorios' },
] as const;

export const inventoryCategoryLabel = (c?: string): string =>
  INVENTORY_CATEGORIES.find((x) => x.value === c)?.label ?? '—';

export const INVENTORY_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'available', label: 'Disponible', color: 'success' },
  { value: 'in_use', label: 'En uso', color: 'info' },
  { value: 'maintenance', label: 'Mantenimiento', color: 'orange' },
  { value: 'out_of_order', label: 'Fuera de servicio', color: 'danger' },
  { value: 'retired', label: 'Retirado', color: 'muted' },
];

export const inventoryStatus = (s?: string) =>
  INVENTORY_STATUSES.find((x) => x.value === s) ?? {
    value: s ?? '',
    label: s ?? '—',
    color: 'muted',
  };

export const INVENTORY_CONDITIONS = [
  { value: 'new', label: 'Nuevo' },
  { value: 'good', label: 'Bueno' },
  { value: 'fair', label: 'Regular' },
  { value: 'poor', label: 'Malo' },
] as const;

export const inventoryConditionLabel = (c?: string): string =>
  INVENTORY_CONDITIONS.find((x) => x.value === c)?.label ?? '—';

export const MAINTENANCE_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'scheduled', label: 'Programado', color: 'info' },
  { value: 'in_progress', label: 'En progreso', color: 'orange' },
  { value: 'completed', label: 'Completado', color: 'success' },
  { value: 'cancelled', label: 'Cancelado', color: 'muted' },
];

export const maintenanceStatus = (s?: string) =>
  MAINTENANCE_STATUSES.find((x) => x.value === s) ?? {
    value: s ?? '',
    label: s ?? '—',
    color: 'muted',
  };

export const MEAL_TYPES: { value: string; label: string; icon: string }[] = [
  { value: 'breakfast', label: 'Desayuno', icon: 'wb_sunny' },
  { value: 'lunch', label: 'Almuerzo', icon: 'restaurant' },
  { value: 'dinner', label: 'Cena', icon: 'nightlight' },
  { value: 'snack', label: 'Snack', icon: 'cookie' },
  { value: 'pre_workout', label: 'Pre-entreno', icon: 'bolt' },
  { value: 'post_workout', label: 'Post-entreno', icon: 'fitness_center' },
] as const;

export const mealTypeLabel = (m?: string): string =>
  MEAL_TYPES.find((x) => x.value === m)?.label ?? '—';

export const FOOD_CATEGORIES = [
  { value: 'protein', label: 'Proteínas' },
  { value: 'carbohydrates', label: 'Carbohidratos' },
  { value: 'fats', label: 'Grasas' },
  { value: 'vegetables', label: 'Verduras' },
  { value: 'fruits', label: 'Frutas' },
  { value: 'dairy', label: 'Lácteos' },
  { value: 'supplements', label: 'Suplementos' },
  { value: 'beverages', label: 'Bebidas' },
  { value: 'other', label: 'Otros' },
] as const;

export const foodCategoryLabel = (c?: string): string =>
  FOOD_CATEGORIES.find((x) => x.value === c)?.label ?? '—';

export const NOTIFICATION_TYPES: { value: string; label: string; color: string; icon: string }[] = [
  { value: 'info', label: 'Información', color: 'info', icon: 'info' },
  { value: 'alert', label: 'Alerta', color: 'danger', icon: 'warning' },
  { value: 'promotion', label: 'Promoción', color: 'volt', icon: 'campaign' },
  { value: 'message', label: 'Mensaje', color: 'orange', icon: 'chat' },
  { value: 'membership', label: 'Membresía', color: 'success', icon: 'card_membership' },
  { value: 'payment', label: 'Pago', color: 'success', icon: 'payments' },
  { value: 'schedule', label: 'Agenda', color: 'info', icon: 'event' },
  { value: 'system', label: 'Sistema', color: 'muted', icon: 'settings' },
];

export const notificationType = (t?: string) =>
  NOTIFICATION_TYPES.find((x) => x.value === t) ?? {
    value: t ?? '',
    label: t ?? '—',
    color: 'muted',
    icon: 'info',
  };

export const CAMPAIGN_TYPES: { value: string; label: string; icon: string }[] = [
  { value: 'email', label: 'Email', icon: 'mail' },
  { value: 'sms', label: 'SMS', icon: 'sms' },
  { value: 'push', label: 'Push', icon: 'notifications' },
  { value: 'in_app', label: 'In-app', icon: 'smartphone' },
];

export const campaignTypeLabel = (t?: string): string =>
  CAMPAIGN_TYPES.find((x) => x.value === t)?.label ?? '—';

export const campaignType = (t?: string) =>
  CAMPAIGN_TYPES.find((x) => x.value === t) ?? {
    value: t ?? '',
    label: t ?? '—',
    icon: 'campaign',
  };

export const CAMPAIGN_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'draft', label: 'Borrador', color: 'muted' },
  { value: 'scheduled', label: 'Programada', color: 'info' },
  { value: 'sending', label: 'Enviando', color: 'orange' },
  { value: 'sent', label: 'Enviada', color: 'success' },
  { value: 'cancelled', label: 'Cancelada', color: 'danger' },
];

export const campaignStatus = (s?: string) =>
  CAMPAIGN_STATUSES.find((x) => x.value === s) ?? {
    value: s ?? '',
    label: s ?? '—',
    color: 'muted',
  };

export const DAY_NAMES = [
  '',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

export const formatDate = (d?: string | Date, withTime = false): string => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  const opts: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  };
  return date.toLocaleDateString('es-AR', opts);
};

export const formatDateTime = (d?: string | Date): string => formatDate(d, true);

export const timeOnly = (d?: string | Date): string => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

export const formatMoney = (amount?: number, currency = 'usd'): string => {
  if (amount == null) return '—';
  const sym = currency === 'usd' ? 'US$' : currency === 'ars' ? '$' : `${currency.toUpperCase()} `;
  return `${sym}${Number(amount).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
};

export const initials = (firstName?: string, lastName?: string): string =>
  `${(firstName ?? '?').charAt(0)}${(lastName ?? '').charAt(0)}`.toUpperCase();

export const isValidUUID = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const todayISO = (): string => new Date().toISOString().slice(0, 10);
