import 'reflect-metadata';
import dataSource from '../data-source';

async function clear(): Promise<void> {
  await dataSource.initialize();
  console.log('Conexión establecida. Limpiando datos...');

  const tables = [
    'campaigns',
    'notifications',
    'inventory_maintenances',
    'inventory_items',
    'nutrition_logs',
    'foods',
    'attendance_records',
    'class_bookings',
    'gym_classes',
    'routine_exercises',
    'routines',
    'exercises',
    'payments',
    'user_memberships',
    'membership_types',
    'user_profiles',
    'users',
    'gyms',
    'refresh_tokens',
  ];

  if (dataSource.isInitialized) {
    for (const table of tables) {
      try {
        const exists = await dataSource.query(
          `SELECT 1 FROM information_schema.tables WHERE table_name = $1`,
          [table],
        );
        if (exists.length > 0) {
          await dataSource.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
        }
      } catch (error) {
        console.warn(`No se pudo limpiar la tabla ${table}:`, String(error));
      }
    }
  }

  console.log('Datos limpiados.');
  await dataSource.destroy();
}

clear().catch(async (error) => {
  console.error('Error limpiando la base de datos:', error);
  await dataSource.destroy();
  process.exit(1);
});
