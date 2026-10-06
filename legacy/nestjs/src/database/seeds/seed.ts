import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { Gym } from '../../modules/gyms/entities/gym.entity';
import { User } from '../../modules/users/entities/user.entity';
import { UserProfile } from '../../modules/users/entities/user-profile.entity';
import { MembershipType } from '../../modules/memberships/entities/membership-type.entity';
import { UserMembership } from '../../modules/memberships/entities/user-membership.entity';
import { Payment } from '../../modules/payments/entities/payment.entity';
import { Exercise } from '../../modules/exercises/entities/exercise.entity';
import { Food } from '../../modules/nutrition/entities/food.entity';
import { NutritionLog } from '../../modules/nutrition/entities/nutrition-log.entity';
import { GymClass } from '../../modules/classes/entities/gym-class.entity';
import { ClassBooking } from '../../modules/classes/entities/class-booking.entity';
import { AttendanceRecord } from '../../modules/attendance/entities/attendance.entity';
import { InventoryItem } from '../../modules/inventory/entities/inventory-item.entity';
import {
  ActivityLevel,
  AttendanceMethod,
  AttendanceType,
  BookingStatus,
  ClassStatus,
  ExerciseCategory,
  FitnessGoal,
  FoodCategory,
  InventoryCategory,
  InventoryCondition,
  InventoryStatus,
  MealType,
  MembershipStatus,
  PaymentMethod,
  PaymentStatus,
  UserGender,
  UserRole,
} from '../../common/enums';

const PASSWORD = 'PowerZone2024!';
const BCRYPT_ROUNDS = 10;

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function dateOnly(daysFromNowValue: number): string {
  return daysFromNow(daysFromNowValue).toISOString().slice(0, 10);
}

async function seedGym(): Promise<Gym> {
  const gymRepo = dataSource.getRepository(Gym);
  const existing = await gymRepo.findOne({ where: { slug: 'powerzone-central' } });
  if (existing) {
    console.log(`Gimnasio ya existente: ${existing.name} (${existing.id})`);
    return existing;
  }

  const gym = gymRepo.create({
    name: 'PowerZone Central',
    slug: 'powerzone-central',
    description: 'Gimnasio central de PowerZone con área de pesas, cardio y funcional.',
    address: 'Av. Central 123, Col. Centro',
    city: 'Ciudad de México',
    phone: '+52 55 1234 5678',
    email: 'central@powerzone.app',
    maxCapacity: 150,
    currency: 'usd',
    isActive: true,
    services: ['pesas', 'cardio', 'funcional', 'crossfit', 'nutrición'],
  });
  return gymRepo.save(gym);
}

async function seedUsers(gym: Gym): Promise<Record<string, User>> {
  const userRepo = dataSource.getRepository(User);
  const profileRepo = dataSource.getRepository(UserProfile);
  const hash = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);

  const usersToCreate: Array<Omit<Partial<User>, 'profile'> & { profile?: Partial<UserProfile> }> =
    [
      {
        email: 'superadmin@powerzone.app',
        firstName: 'Sistema',
        lastName: 'Super Admin',
        role: UserRole.ADMIN,
        isSuperAdmin: true,
        isActive: true,
        gymId: null,
      },
      {
        email: 'admin@powerzone.app',
        firstName: 'Laura',
        lastName: 'Gómez',
        role: UserRole.ADMIN,
        isSuperAdmin: false,
        isActive: true,
        gymId: gym.id,
        phone: '+52 55 1111 2222',
        gender: UserGender.FEMALE,
      },
      {
        email: 'trainer@powerzone.app',
        firstName: 'Carlos',
        lastName: 'Mendoza',
        role: UserRole.TRAINER,
        isSuperAdmin: false,
        isActive: true,
        gymId: gym.id,
        phone: '+52 55 2222 3333',
        gender: UserGender.MALE,
      },
      {
        email: 'reception@powerzone.app',
        firstName: 'Ana',
        lastName: 'Ríos',
        role: UserRole.RECEPTIONIST,
        isSuperAdmin: false,
        isActive: true,
        gymId: gym.id,
        phone: '+52 55 3333 4444',
        gender: UserGender.FEMALE,
      },
      {
        email: 'client@powerzone.app',
        firstName: 'Diego',
        lastName: 'Sánchez',
        role: UserRole.CLIENT,
        isSuperAdmin: false,
        isActive: true,
        gymId: gym.id,
        phone: '+52 55 4444 5555',
        gender: UserGender.MALE,
        profile: {
          heightCm: 178,
          weightKg: 82.5,
          bodyFatPct: 18,
          goal: FitnessGoal.GAIN_MUSCLE,
          activityLevel: ActivityLevel.MODERATE,
          medicalConditions: [],
          emergencyContactName: 'María Sánchez',
          emergencyContactPhone: '+52 55 5555 6666',
        },
      },
      {
        email: 'client2@powerzone.app',
        firstName: 'Valeria',
        lastName: 'Fernández',
        role: UserRole.CLIENT,
        isSuperAdmin: false,
        isActive: true,
        gymId: gym.id,
        gender: UserGender.FEMALE,
        profile: {
          heightCm: 165,
          weightKg: 58,
          bodyFatPct: 24,
          goal: FitnessGoal.LOSE_FAT,
          activityLevel: ActivityLevel.ACTIVE,
        },
      },
    ];

  const saved: Record<string, User> = {};
  for (const data of usersToCreate) {
    const email = data.email as string;
    const existing = await userRepo.findOne({ where: { email } });
    let user: User;
    if (existing) {
      user = existing;
      console.log(`Usuario ya existente: ${email}`);
    } else {
      const { profile, ...userData } = data;
      user = await userRepo.save(userRepo.create({ ...userData, password: hash }));
      if (profile) {
        await profileRepo.save(profileRepo.create({ ...profile, userId: user.id }));
      }
      console.log(`Usuario creado: ${email}`);
    }
    saved[email] = user;
  }
  return saved;
}

async function seedMembershipTypes(gym: Gym): Promise<Record<string, MembershipType>> {
  const repo = dataSource.getRepository(MembershipType);
  const existing = await repo.find({ where: { gymId: gym.id } });
  if (existing.length > 0) {
    console.log(`Ya existen ${existing.length} tipos de membresía.`);
    return Object.fromEntries(existing.map((t) => [t.name, t]));
  }

  const types = repo.create([
    {
      gymId: gym.id,
      name: 'Mensual',
      description: 'Acceso completo 30 días.',
      durationDays: 30,
      price: 49.99,
      currency: 'usd',
      features: ['Acceso a todas las áreas', '1 clase grupal/semana', 'App de entrenamiento'],
      maxClassesPerWeek: 4,
      isActive: true,
      sortOrder: 1,
    },
    {
      gymId: gym.id,
      name: 'Trimestral',
      description: 'Acceso completo 90 días con descuento.',
      durationDays: 90,
      price: 129.99,
      currency: 'usd',
      features: ['Acceso a todas las áreas', '4 clases grupales/semana', 'App + plan de nutrición'],
      maxClassesPerWeek: 8,
      isActive: true,
      sortOrder: 2,
    },
    {
      gymId: gym.id,
      name: 'Anual Premium',
      description: 'Acceso completo 365 días + beneficios premium.',
      durationDays: 365,
      price: 449.99,
      currency: 'usd',
      features: [
        'Sesión de personal training mensual',
        'Sauna y piscina',
        'Plan de nutrición personalizado',
      ],
      maxClassesPerWeek: 12,
      isActive: true,
      sortOrder: 3,
    },
  ]);
  const savedTypes = await repo.save(types);
  console.log(`Tipos de membresía creados: ${savedTypes.length}`);
  return Object.fromEntries(savedTypes.map((t) => [t.name, t]));
}

async function seedMemberships(
  gym: Gym,
  users: Record<string, User>,
  types: Record<string, MembershipType>,
): Promise<void> {
  const umRepo = dataSource.getRepository(UserMembership);
  const paymentRepo = dataSource.getRepository(Payment);

  const plan = [
    {
      key: 'client@powerzone.app',
      type: types['Trimestral'],
      status: MembershipStatus.ACTIVE,
      autoRenew: true,
      paid: PaymentStatus.SUCCEEDED,
      paidAt: daysFromNow(-10),
    },
    {
      key: 'client2@powerzone.app',
      type: types['Mensual'],
      status: MembershipStatus.ACTIVE,
      autoRenew: false,
      paid: PaymentStatus.SUCCEEDED,
      paidAt: daysFromNow(-3),
    },
  ];

  for (const item of plan) {
    const user = users[item.key];
    const existing = await umRepo.findOne({ where: { userId: user.id } });
    if (existing) continue;

    const start = item.paidAt;
    const end = new Date(start);
    end.setDate(end.getDate() + item.type.durationDays);

    const um = await umRepo.save(
      umRepo.create({
        gymId: gym.id,
        userId: user.id,
        membershipTypeId: item.type.id,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        status: item.status,
        autoRenew: item.autoRenew,
        price: item.type.price,
        notes: 'Creado por seeder de demostración.',
      }),
    );

    await paymentRepo.save(
      paymentRepo.create({
        gymId: gym.id,
        userId: user.id,
        membershipTypeId: item.type.id,
        amount: item.type.price,
        currency: 'usd',
        status: PaymentStatus.SUCCEEDED,
        paymentMethod: PaymentMethod.STRIPE,
        transactionId: `seed_${um.id.slice(0, 8)}`,
        paidAt: item.paidAt,
        metadata: { source: 'seeder' },
      }),
    );
  }
  console.log('Membresías y pagos de ejemplo creados.');

  const paymentRepo2 = dataSource.getRepository(Payment);
  const existingPayment = await paymentRepo2.findOne({
    where: { userId: users['admin@powerzone.app'].id },
  });
  if (!existingPayment) {
    await paymentRepo2.save(
      paymentRepo2.create({
        gymId: gym.id,
        userId: users['admin@powerzone.app'].id,
        membershipTypeId: types['Anual Premium'].id,
        amount: 449.99,
        currency: 'usd',
        status: PaymentStatus.SUCCEEDED,
        paymentMethod: PaymentMethod.CARD,
        transactionId: 'seed_daily_sale',
        paidAt: new Date(),
        metadata: { source: 'seeder', reference: 'sale-demo' },
      }),
    );
    console.log('Pago de ejemplo registrado (reporte financiero).');
  }
}

async function seedExercises(): Promise<void> {
  const repo = dataSource.getRepository(Exercise);
  const count = await repo.count();
  if (count > 0) {
    console.log(`Ya existen ${count} ejercicios, se omite el seed de ejercicios.`);
    return;
  }

  const list = [
    {
      name: 'Press de banca',
      category: ExerciseCategory.CHEST,
      muscleGroup: 'Pectoral',
      equipmentNeeded: 'Barra, banco, discos',
      difficulty: 2,
      instructions: ['Acuéstate en el banco', 'Baja la barra al pecho', 'Empuja hacia arriba'],
    },
    {
      name: 'Sentadilla',
      category: ExerciseCategory.LEGS,
      muscleGroup: 'Cuádriceps',
      equipmentNeeded: 'Barra, rack',
      difficulty: 3,
      instructions: [
        'Coloca la barra en la espalda',
        'Baja flexionando rodillas y cadera',
        'Sube empujando el suelo',
      ],
    },
    {
      name: 'Peso muerto convencional',
      category: ExerciseCategory.BACK,
      muscleGroup: 'Espalda baja y glúteos',
      equipmentNeeded: 'Barra, discos',
      difficulty: 4,
      instructions: ['Pies al ancho de hombros', 'Toma la barra', 'Extiende cadera y rodillas'],
    },
    {
      name: 'Press militar',
      category: ExerciseCategory.SHOULDERS,
      muscleGroup: 'Hombros',
      equipmentNeeded: 'Barra o mancuernas',
      difficulty: 3,
      instructions: ['De pie, barra al pecho', 'Empuja hacia arriba', 'Controla el descenso'],
    },
    {
      name: 'Remo con barra',
      category: ExerciseCategory.BACK,
      muscleGroup: 'Dorsal',
      equipmentNeeded: 'Barra, discos',
      difficulty: 3,
      instructions: ['Inclina el torso', 'Lleva la barra al abdomen', 'Aprieta los omóplatos'],
    },
    {
      name: 'Curl de bíceps',
      category: ExerciseCategory.ARMS,
      muscleGroup: 'Bíceps',
      equipmentNeeded: 'Mancuernas',
      difficulty: 1,
      instructions: ['Mancuernas a los lados', 'Flexiona los codos', 'Baja controlado'],
    },
    {
      name: 'Plancha',
      category: ExerciseCategory.CORE,
      muscleGroup: 'Core',
      equipmentNeeded: 'Tapete',
      difficulty: 1,
      instructions: ['Apoya antebrazos y pies', 'Mantén el cuerpo alineado', 'Aguanta 30-60 s'],
    },
    {
      name: 'Cuerda de saltar',
      category: ExerciseCategory.CARDIO,
      muscleGroup: 'Cardio',
      equipmentNeeded: 'Cuerda',
      difficulty: 2,
      instructions: ['Salta manteniendo el ritmo', 'Muñecas suaves', 'Mantén respiración estable'],
    },
    {
      name: 'Sentadilla con salto',
      category: ExerciseCategory.FULL_BODY,
      muscleGroup: 'Todo el cuerpo',
      equipmentNeeded: 'Ninguno',
      difficulty: 3,
      instructions: ['Baja en sentadilla', 'Explota hacia arriba', 'Aterriza suave'],
    },
    {
      name: 'Dominadas',
      category: ExerciseCategory.BACK,
      muscleGroup: 'Dorsales',
      equipmentNeeded: 'Barra fija',
      difficulty: 4,
      instructions: ['Cuelga de la barra', 'Sube llevando codos al cuerpo', 'Baja controlado'],
    },
    {
      name: 'Zancadas alternas',
      category: ExerciseCategory.LEGS,
      muscleGroup: 'Glúteos y cuádriceps',
      equipmentNeeded: 'Ninguno',
      difficulty: 2,
      instructions: ['Da un paso al frente', 'Baja la rodilla trasera', 'Empuja para volver'],
    },
    {
      name: 'Hip thrust',
      category: ExerciseCategory.LEGS,
      muscleGroup: 'Glúteos',
      equipmentNeeded: 'Banco, barra',
      difficulty: 3,
      instructions: [
        'Apoya la espalda en el banco',
        'Sube la cadera',
        'Aprieta los glúteos arriba',
      ],
    },
  ];
  await repo.save(repo.create(list));
  console.log(`Ejercicios creados: ${list.length}`);
}

async function seedFoods(): Promise<void> {
  const repo = dataSource.getRepository(Food);
  const count = await repo.count();
  if (count > 0) {
    console.log(`Ya existen ${count} alimentos, se omite el seed.`);
    return;
  }

  const list = [
    {
      name: 'Pechuga de pollo',
      category: FoodCategory.PROTEIN,
      servingSizeG: 100,
      calories: 165,
      protein: 31,
      carbs: 0,
      fats: 3.6,
      fiber: 0,
      sugar: 0,
    },
    {
      name: 'Arroz integral',
      category: FoodCategory.CARBOHYDRATES,
      servingSizeG: 100,
      calories: 112,
      protein: 2.6,
      carbs: 23.5,
      fats: 0.9,
      fiber: 1.8,
      sugar: 0.4,
    },
    {
      name: 'Aguacate',
      category: FoodCategory.FATS,
      servingSizeG: 100,
      calories: 160,
      protein: 2,
      carbs: 8.5,
      fats: 14.7,
      fiber: 6.7,
      sugar: 0.7,
    },
    {
      name: 'Brócoli',
      category: FoodCategory.VEGETABLES,
      servingSizeG: 100,
      calories: 34,
      protein: 2.8,
      carbs: 6.6,
      fats: 0.4,
      fiber: 2.6,
      sugar: 1.7,
    },
    {
      name: 'Plátano',
      category: FoodCategory.FRUITS,
      servingSizeG: 100,
      calories: 89,
      protein: 1.1,
      carbs: 22.8,
      fats: 0.3,
      fiber: 2.6,
      sugar: 12.2,
    },
    {
      name: 'Yogur griego',
      category: FoodCategory.DAIRY,
      servingSizeG: 100,
      calories: 59,
      protein: 10,
      carbs: 3.6,
      fats: 0.4,
      fiber: 0,
      sugar: 3.2,
    },
    {
      name: 'Huevo entero',
      category: FoodCategory.PROTEIN,
      servingSizeG: 100,
      calories: 155,
      protein: 13,
      carbs: 1.1,
      fats: 11,
      fiber: 0,
      sugar: 1.1,
    },
    {
      name: 'Whey protein',
      category: FoodCategory.SUPPLEMENTS,
      servingSizeG: 30,
      calories: 120,
      protein: 24,
      carbs: 3,
      fats: 1.5,
      fiber: 0,
      sugar: 1,
    },
    {
      name: 'Batata',
      category: FoodCategory.CARBOHYDRATES,
      servingSizeG: 100,
      calories: 86,
      protein: 1.6,
      carbs: 20,
      fats: 0.1,
      fiber: 3,
      sugar: 4.2,
    },
    {
      name: 'Salmón',
      category: FoodCategory.PROTEIN,
      servingSizeG: 100,
      calories: 208,
      protein: 20,
      carbs: 0,
      fats: 13,
      fiber: 0,
      sugar: 0,
    },
    {
      name: 'Avena',
      category: FoodCategory.CARBOHYDRATES,
      servingSizeG: 100,
      calories: 389,
      protein: 16.9,
      carbs: 66.3,
      fats: 6.9,
      fiber: 10.6,
      sugar: 0,
    },
  ];
  await repo.save(repo.create(list));
  console.log(`Alimentos creados: ${list.length}`);
}

async function seedClassesAndBookings(gym: Gym, users: Record<string, User>): Promise<GymClass[]> {
  const classRepo = dataSource.getRepository(GymClass);
  const existingCount = await classRepo.count({ where: { gymId: gym.id } });
  if (existingCount > 0) {
    console.log(`Ya existen ${existingCount} clases.`);
    return classRepo.find({ where: { gymId: gym.id } });
  }

  const trainer = users['trainer@powerzone.app'];
  const classes = classRepo.create([
    {
      gymId: gym.id,
      name: 'Cross Training',
      description: 'Entrenamiento funcional de alta intensidad.',
      category: 'HIIT',
      instructorId: trainer.id,
      capacity: 20,
      startTime: daysFromNow(1),
      endTime: daysFromNow(1),
      room: 'Sala 1',
      color: '#00d26a',
      status: ClassStatus.SCHEDULED,
      isActive: true,
    },
    {
      gymId: gym.id,
      name: 'Spinning',
      description: 'Sesión de ciclismo indoor con música.',
      category: 'Cardio',
      instructorId: trainer.id,
      capacity: 15,
      startTime: daysFromNow(2),
      endTime: daysFromNow(2),
      room: 'Estudio de ciclismo',
      color: '#ff5b5b',
      status: ClassStatus.SCHEDULED,
      isActive: true,
    },
    {
      gymId: gym.id,
      name: 'Yoga y Movilidad',
      description: 'Flexibilidad, equilibrio y respiración.',
      category: 'Movilidad',
      instructorId: trainer.id,
      capacity: 25,
      startTime: daysFromNow(3),
      endTime: daysFromNow(3),
      room: 'Sala 2',
      color: '#7b6bff',
      status: ClassStatus.SCHEDULED,
      isActive: true,
    },
  ]);

  const saved = await classRepo.save(classes);
  console.log(`Clases creadas: ${saved.length}`);

  const bookingRepo = dataSource.getRepository(ClassBooking);
  await bookingRepo.save(
    bookingRepo.create({
      gymId: gym.id,
      userId: users['client@powerzone.app'].id,
      classId: saved[0].id,
      status: BookingStatus.CONFIRMED,
    }),
  );
  console.log('Reserva de ejemplo creada.');
  return saved;
}

async function seedAttendance(gym: Gym, users: Record<string, User>): Promise<void> {
  const attendanceRepo = dataSource.getRepository(AttendanceRecord);
  const client = users['client@powerzone.app'];
  const client2 = users['client2@powerzone.app'];

  const existing = await attendanceRepo.count({ where: { gymId: gym.id } });
  if (existing > 0) {
    console.log(`Ya existen ${existing} registros de asistencia.`);
    return;
  }

  const records = [];
  for (let day = 1; day <= 5; day++) {
    const ts = daysFromNow(-day);
    ts.setHours(9, 30, 0, 0);
    const out = new Date(ts);
    out.setHours(11, 0, 0, 0);

    records.push(
      attendanceRepo.create({
        gymId: gym.id,
        userId: client.id,
        type: AttendanceType.CHECK_IN,
        method: AttendanceMethod.MEMBER_CARD,
        timestamp: ts,
      }),
      attendanceRepo.create({
        gymId: gym.id,
        userId: client.id,
        type: AttendanceType.CHECK_OUT,
        method: AttendanceMethod.MEMBER_CARD,
        timestamp: out,
      }),
    );
    if (day <= 3) {
      records.push(
        attendanceRepo.create({
          gymId: gym.id,
          userId: client2.id,
          type: AttendanceType.CHECK_IN,
          method: AttendanceMethod.QR_CODE,
          timestamp: ts,
        }),
      );
    }
  }

  await attendanceRepo.save(records);
  console.log(`Registros de asistencia creados: ${records.length}`);
}

async function seedNutrition(gym: Gym, users: Record<string, User>): Promise<void> {
  const foodRepo = dataSource.getRepository(Food);
  const logRepo = dataSource.getRepository(NutritionLog);

  const client = users['client@powerzone.app'];
  const existing = await logRepo.count({ where: { userId: client.id } });
  if (existing > 0) return;

  const foods = await foodRepo.find();
  const map = Object.fromEntries(foods.map((f) => [f.name, f]));

  const logs = [
    { food: 'Avena', mealType: MealType.BREAKFAST, quantityG: 80 },
    { food: 'Pechuga de pollo', mealType: MealType.LUNCH, quantityG: 200 },
    { food: 'Arroz integral', mealType: MealType.LUNCH, quantityG: 150 },
    { food: 'Brócoli', mealType: MealType.LUNCH, quantityG: 100 },
    { food: 'Yogur griego', mealType: MealType.SNACK, quantityG: 150 },
  ];

  const rows: NutritionLog[] = [];
  for (let day = 0; day < 3; day++) {
    for (const entry of logs) {
      const eaten = daysFromNow(-day);
      eaten.setHours(8 + (logs.indexOf(entry) % 10), 0, 0, 0);
      rows.push(
        logRepo.create({
          gymId: gym.id,
          userId: client.id,
          foodId: map[entry.food].id,
          mealType: entry.mealType,
          quantityG: entry.quantityG,
          eatenAt: eaten,
          calculatedCalories:
            Number(map[entry.food].calories) *
            (entry.quantityG / Number(map[entry.food].servingSizeG)),
        }),
      );
    }
  }
  await logRepo.save(rows);
  console.log(`Registros de nutrición creados: ${rows.length}`);
}

async function seedInventory(gym: Gym): Promise<void> {
  const repo = dataSource.getRepository(InventoryItem);
  const existing = await repo.count({ where: { gymId: gym.id } });
  if (existing > 0) return;

  const items = repo.create([
    {
      gymId: gym.id,
      name: 'Banco de press',
      category: InventoryCategory.EQUIPMENT,
      description: 'Banco plano',
      quantity: 4,
      availableQuantity: 4,
      condition: InventoryCondition.GOOD,
      status: InventoryStatus.AVAILABLE,
      replacementCost: 299.99,
      purchasedAt: dateOnly(-180),
      supplier: 'Spartan Fitness',
      location: 'Área de pesas',
    },
    {
      gymId: gym.id,
      name: 'Juego de mancuernas 2-40 kg',
      category: InventoryCategory.WEIGHTS,
      quantity: 6,
      availableQuantity: 5,
      condition: InventoryCondition.GOOD,
      status: InventoryStatus.AVAILABLE,
      replacementCost: 899,
      purchasedAt: dateOnly(-360),
      supplier: 'IronGym',
      location: 'Área de pesas',
    },
    {
      gymId: gym.id,
      name: 'Cinta de correr',
      category: InventoryCategory.MACHINES,
      quantity: 8,
      availableQuantity: 7,
      condition: InventoryCondition.FAIR,
      status: InventoryStatus.AVAILABLE,
      replacementCost: 1499,
      purchasedAt: dateOnly(-720),
      supplier: 'CardioTech',
      location: 'Sala de cardio',
    },
    {
      gymId: gym.id,
      name: 'Bicicleta estática',
      category: InventoryCategory.MACHINES,
      quantity: 6,
      availableQuantity: 6,
      condition: InventoryCondition.NEW,
      status: InventoryStatus.AVAILABLE,
      replacementCost: 1099,
      purchasedAt: dateOnly(-30),
      supplier: 'CardioTech',
      location: 'Estudio de ciclismo',
    },
    {
      gymId: gym.id,
      name: 'Cuerdas de batalla',
      category: InventoryCategory.ACCESSORIES,
      quantity: 3,
      availableQuantity: 3,
      condition: InventoryCondition.GOOD,
      status: InventoryStatus.AVAILABLE,
      replacementCost: 129,
      purchasedAt: dateOnly(-90),
      supplier: 'Spartan Fitness',
      location: 'Área funcional',
    },
    {
      gymId: gym.id,
      name: 'Torre multifuncional',
      category: InventoryCategory.EQUIPMENT,
      quantity: 1,
      availableQuantity: 0,
      condition: InventoryCondition.POOR,
      status: InventoryStatus.MAINTENANCE,
      replacementCost: 2499,
      purchasedAt: dateOnly(-500),
      supplier: 'Spartan Fitness',
      location: 'Área de pesas',
    },
  ]);
  await repo.save(items);
  console.log(`Artículos de inventario creados: ${items.length}`);
}

async function main(): Promise<void> {
  await dataSource.initialize();
  console.log('Conexión a la base de datos establecida.');

  const gym = await seedGym();
  const users = await seedUsers(gym);
  const types = await seedMembershipTypes(gym);
  await seedMemberships(gym, users, types);
  await seedExercises();
  await seedFoods();
  await seedClassesAndBookings(gym, users);
  await seedAttendance(gym, users);
  await seedNutrition(gym, users);
  await seedInventory(gym);

  console.log('\n===== SEED COMPLETADO =====');
  console.log(`Gimnasio:       ${gym.name}`);
  console.log('Credenciales de prueba (contraseña: PowerZone2024!):');
  console.log('  Super Admin:  superadmin@powerzone.app');
  console.log('  Admin:        admin@powerzone.app');
  console.log('  Trainer:      trainer@powerzone.app');
  console.log('  Receptionist: reception@powerzone.app');
  console.log('  Client:       client@powerzone.app');
  console.log('  Client 2:     client2@powerzone.app');

  await dataSource.destroy();
}

main().catch(async (error) => {
  console.error('Error ejecutando el seed:', error);
  await dataSource.destroy();
  process.exit(1);
});
