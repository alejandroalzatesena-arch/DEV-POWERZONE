export enum UserRole {
  ADMIN = 'admin',
  TRAINER = 'trainer',
  RECEPTIONIST = 'receptionist',
  CLIENT = 'client',
}

export const ALL_ROLES = [
  UserRole.ADMIN,
  UserRole.TRAINER,
  UserRole.RECEPTIONIST,
  UserRole.CLIENT,
];

export enum UserGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum FitnessGoal {
  LOSE_FAT = 'lose_fat',
  GAIN_MUSCLE = 'gain_muscle',
  MAINTAIN = 'maintain',
  ENDURANCE = 'endurance',
  GENERAL_FITNESS = 'general_fitness',
}

export enum ActivityLevel {
  SEDENTARY = 'sedentary',
  LIGHT = 'light',
  MODERATE = 'moderate',
  ACTIVE = 'active',
  VERY_ACTIVE = 'very_active',
}

export enum MembershipStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CARD = 'card',
  CASH = 'cash',
  TRANSFER = 'transfer',
  STRIPE = 'stripe',
}

export enum RoutineStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum RoutineObjective {
  STRENGTH = 'strength',
  HYPERTROPHY = 'hypertrophy',
  WEIGHT_LOSS = 'weight_loss',
  ENDURANCE = 'endurance',
  GENERAL = 'general',
  REHABILITATION = 'rehabilitation',
}

export enum ExerciseCategory {
  CHEST = 'chest',
  BACK = 'back',
  LEGS = 'legs',
  SHOULDERS = 'shoulders',
  ARMS = 'arms',
  CORE = 'core',
  CARDIO = 'cardio',
  FULL_BODY = 'full_body',
  STRETCHING = 'stretching',
}

export enum ClassStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum BookingStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  WAITLISTED = 'waitlisted',
  ATTENDED = 'attended',
  NO_SHOW = 'no_show',
}

export enum AttendanceType {
  CHECK_IN = 'check_in',
  CHECK_OUT = 'check_out',
  CLASS = 'class',
}

export enum AttendanceMethod {
  MEMBER_CARD = 'member_card',
  QR_CODE = 'qr_code',
  MANUAL = 'manual',
  FACE_ID = 'face_id',
}

export enum InventoryCategory {
  EQUIPMENT = 'equipment',
  WEIGHTS = 'weights',
  MACHINES = 'machines',
  SUPPLEMENTS = 'supplements',
  ACCESSORIES = 'accessories',
}

export enum InventoryCondition {
  NEW = 'new',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

export enum InventoryStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  MAINTENANCE = 'maintenance',
  OUT_OF_ORDER = 'out_of_order',
  RETIRED = 'retired',
}

export enum MaintenanceStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  SNACK = 'snack',
  POST_WORKOUT = 'post_workout',
  PRE_WORKOUT = 'pre_workout',
}

export enum FoodCategory {
  PROTEIN = 'protein',
  CARBOHYDRATES = 'carbohydrates',
  FATS = 'fats',
  VEGETABLES = 'vegetables',
  FRUITS = 'fruits',
  DAIRY = 'dairy',
  SUPPLEMENTS = 'supplements',
  BEVERAGES = 'beverages',
  OTHER = 'other',
}

export enum NotificationType {
  INFO = 'info',
  ALERT = 'alert',
  PROMOTION = 'promotion',
  MESSAGE = 'message',
  MEMBERSHIP = 'membership',
  PAYMENT = 'payment',
  SCHEDULE = 'schedule',
  SYSTEM = 'system',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
}

export enum CampaignType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  CANCELLED = 'cancelled',
}

export enum ReportType {
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  PROGRESS = 'progress',
  MEMBERSHIP = 'membership',
  ATTENDANCE = 'attendance',
}

export enum ReportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
}