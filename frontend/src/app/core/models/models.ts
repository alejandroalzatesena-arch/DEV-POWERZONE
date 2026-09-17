// ============================================================
// Modelos de datos (tipos del backend)
// ============================================================

export interface Paginated<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  gymId: string | null;
  isSuperAdmin?: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: TokenPair;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  phone?: string;
  birthDate?: string;
  gender?: UserGender;
  role: UserRole;
  avatarUrl?: string;
  isSuperAdmin?: boolean;
  isActive?: boolean;
  lastLoginAt?: string;
  gymId: string | null;
  gym?: Gym;
  profile?: UserProfile;
}

export interface UserProfile {
  userId?: string;
  heightCm?: number;
  weightKg?: number;
  bodyFatPct?: number;
  goal?: FitnessGoal;
  activityLevel?: ActivityLevel;
  medicalConditions?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface Gym {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  address?: string;
  city?: string;
  phone?: string;
  contactEmail?: string;
  email?: string;
  logoUrl?: string;
  maxCapacity?: number;
  currency?: string;
  isActive?: boolean;
  services?: string[];
  openingHour?: string;
  closingHour?: string;
  createdAt?: string;
}

export interface MembershipType {
  id: string;
  gymId?: string;
  name: string;
  description?: string;
  durationDays: number;
  price: number;
  currency?: string;
  features?: string[];
  maxClassesPerWeek?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UserMembership {
  id: string;
  gymId?: string;
  userId: string;
  membershipTypeId?: string;
  startDate: string;
  endDate: string;
  status: MembershipStatus;
  autoRenew?: boolean;
  price?: number;
  notes?: string;
  membershipType?: MembershipType;
  user?: User;
}

export interface Payment {
  id: string;
  gymId?: string;
  userId: string;
  membershipTypeId?: string;
  amount: number;
  currency?: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  paidAt?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
  user?: User;
  membershipType?: MembershipType;
}

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  category: ExerciseCategory;
  muscleGroup: string;
  equipmentNeeded?: string;
  difficulty?: number;
  instructions?: string[];
  videoUrl?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface RoutineExercise {
  routineId?: string;
  exerciseId: string;
  exercise?: Exercise;
  dayOfWeek: number;
  order?: number;
  sets: number;
  reps: number;
  restSeconds?: number;
  weight?: number;
  notes?: string;
}

export interface Routine {
  id: string;
  gymId?: string;
  title: string;
  description?: string;
  objective?: RoutineObjective;
  difficulty?: number;
  daysPerWeek: number;
  durationWeeks?: number;
  status?: RoutineStatus;
  isTemplate?: boolean;
  assigneeId?: string;
  assignee?: User;
  createdById?: string;
  createdBy?: User;
  exercises?: RoutineExercise[];
}

export interface GymClass {
  id: string;
  gymId?: string;
  name: string;
  description?: string;
  category?: string;
  instructorId: string;
  instructor?: User;
  capacity: number;
  startTime: string;
  endTime?: string;
  room?: string;
  color?: string;
  status?: ClassStatus;
  isActive?: boolean;
  bookedSpots?: number;
  waitlisted?: number;
  availableSpots?: number;
  bookings?: ClassBooking[];
}

export interface ClassBooking {
  id: string;
  gymId?: string;
  classId: string;
  class?: GymClass;
  userId: string;
  user?: User;
  status: BookingStatus;
  bookedAt?: string;
  attended?: boolean;
}

export interface AttendanceRecord {
  id: string;
  gymId?: string;
  userId: string;
  user?: User;
  type: AttendanceType;
  classId?: string;
  method?: AttendanceMethod;
  timestamp: string;
}

export interface Occupancy {
  current: number;
  maxCapacity: number;
  isFull: boolean;
}

export interface InventoryItem {
  id: string;
  gymId?: string;
  name: string;
  description?: string;
  category: InventoryCategory;
  quantity: number;
  availableQuantity?: number;
  condition?: InventoryCondition;
  status?: InventoryStatus;
  replacementCost?: number;
  purchasedAt?: string;
  supplier?: string;
  location?: string;
}

export interface InventoryMaintenance {
  id: string;
  itemId?: string;
  description: string;
  scheduledAt: string;
  completedAt?: string;
  cost?: number;
  technician?: string;
  status?: MaintenanceStatus;
}

export interface Food {
  id: string;
  name: string;
  category: FoodCategory;
  servingSizeG: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  sugar?: number;
}

export interface NutritionLog {
  id: string;
  gymId?: string;
  userId: string;
  foodId: string;
  food?: Food;
  mealType: MealType;
  quantityG: number;
  eatenAt?: string;
  calculatedCalories?: number;
}

export interface NutritionSummary {
  date: string;
  logs: NutritionLog[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  channel?: NotificationChannel;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  senderId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt?: string;
}

export interface Campaign {
  id: string;
  gymId?: string;
  createdById?: string;
  name: string;
  subject?: string;
  content?: string;
  type: CampaignType;
  audience?: Record<string, unknown>;
  status: CampaignStatus;
  scheduledAt?: string;
  sentAt?: string;
  stats?: Record<string, unknown>;
}

// ============================================================
// Enums
// ============================================================

export type UserRole = 'admin' | 'trainer' | 'receptionist' | 'client';
export type UserGender = 'male' | 'female' | 'other';
export type FitnessGoal =
  | 'lose_fat'
  | 'gain_muscle'
  | 'maintain'
  | 'endurance'
  | 'general_fitness';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'pending';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded' | 'cancelled';
export type PaymentMethod = 'card' | 'cash' | 'transfer' | 'stripe';
export type RoutineStatus = 'draft' | 'active' | 'archived';
export type RoutineObjective =
  | 'strength'
  | 'hypertrophy'
  | 'weight_loss'
  | 'endurance'
  | 'general'
  | 'rehabilitation';
export type ExerciseCategory =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'cardio'
  | 'full_body'
  | 'stretching';
export type ClassStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type BookingStatus = 'confirmed' | 'cancelled' | 'waitlisted' | 'attended' | 'no_show';
export type AttendanceType = 'check_in' | 'check_out' | 'class';
export type AttendanceMethod = 'member_card' | 'qr_code' | 'manual' | 'face_id';
export type InventoryCategory =
  | 'equipment'
  | 'weights'
  | 'machines'
  | 'supplements'
  | 'accessories';
export type InventoryCondition = 'new' | 'good' | 'fair' | 'poor';
export type InventoryStatus = 'available' | 'in_use' | 'maintenance' | 'out_of_order' | 'retired';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'post_workout' | 'pre_workout';
export type FoodCategory =
  | 'protein'
  | 'carbohydrates'
  | 'fats'
  | 'vegetables'
  | 'fruits'
  | 'dairy'
  | 'supplements'
  | 'beverages'
  | 'other';
export type NotificationType =
  | 'info'
  | 'alert'
  | 'promotion'
  | 'message'
  | 'membership'
  | 'payment'
  | 'schedule'
  | 'system';
export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';
export type CampaignType = 'email' | 'sms' | 'push' | 'in_app';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
export type ReportFormat = 'json' | 'csv' | 'pdf';