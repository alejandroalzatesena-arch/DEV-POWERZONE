package app.powerzone.demo;

import app.powerzone.auth.AuthService;
import app.powerzone.common.TableStore;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/** Explicit, idempotent development data. Never runs in production unless requested. */
@Component
@ConditionalOnProperty(name = "powerzone.seed-demo", havingValue = "true")
public class DemoSeeder implements ApplicationRunner {
    private final TableStore db;
    private final PasswordEncoder passwords;
    private final TransactionTemplate transaction;
    public DemoSeeder(TableStore db, PasswordEncoder passwords,
            org.springframework.transaction.PlatformTransactionManager manager) {
        this.db = db; this.passwords = passwords; this.transaction = new TransactionTemplate(manager);
    }
    @Override public void run(ApplicationArguments args) {
        transaction.executeWithoutResult(status -> seed());
    }
    private void seed() {
        var gym = ensure("gyms", Map.of("slug", "powerzone-central"),
                fields("name", "PowerZone Central", "slug", "powerzone-central",
                        "description", "Gimnasio central de PowerZone con área de pesas, cardio y funcional.",
                        "address", "Av. Central 123, Col. Centro", "city", "Ciudad de México",
                        "phone", "+52 55 1234 5678", "email", "central@powerzone.app",
                        "maxCapacity", 150, "currency", "usd",
                        "services", List.of("pesas", "cardio", "funcional", "crossfit", "nutrición")));
        UUID gymId = AuthService.uuid(gym.get("id"));
        String hash = passwords.encode("PowerZone2024!");
        var superadmin = user("superadmin@powerzone.app", "Sistema", "Super Admin", "admin", null, true, hash);
        var admin = user("admin@powerzone.app", "Laura", "Gómez", "admin", gymId, false, hash);
        var trainer = user("trainer@powerzone.app", "Carlos", "Mendoza", "trainer", gymId, false, hash);
        user("reception@powerzone.app", "Ana", "Ríos", "receptionist", gymId, false, hash);
        var client = user("client@powerzone.app", "Diego", "Sánchez", "client", gymId, false, hash);
        var client2 = user("client2@powerzone.app", "Valeria", "Fernández", "client", gymId, false, hash);
        ensure("user_profiles", Map.of("userId", client.get("id")),
                fields("userId", client.get("id"), "heightCm", 178, "weightKg", 82.5,
                        "bodyFatPct", 18, "goal", "gain_muscle", "activityLevel", "moderate"));
        ensure("user_profiles", Map.of("userId", client2.get("id")),
                fields("userId", client2.get("id"), "heightCm", 165, "weightKg", 58,
                        "bodyFatPct", 24, "goal", "lose_fat", "activityLevel", "active"));
        var monthly = plan(gymId, "Mensual", 30, 49.99, 4, 1);
        var quarterly = plan(gymId, "Trimestral", 90, 129.99, 8, 2);
        plan(gymId, "Anual Premium", 365, 449.99, 12, 3);
        membership(gymId, client, quarterly, 10, true);
        membership(gymId, client2, monthly, 3, false);
        if (db.findOne("payments", Map.of("transactionId", "seed_daily_sale"), null, null) == null)
            db.insert("payments", fields("gymId", gymId, "userId", admin.get("id"),
                    "amount", 449.99, "currency", "usd", "status", "succeeded",
                    "paymentMethod", "card", "transactionId", "seed_daily_sale",
                    "paidAt", Instant.now().toString(), "metadata", Map.of("source", "seeder")));
        exercises(); foods();
        var gymClass = ensure("gym_classes", Map.of("gymId", gymId, "name", "Yoga Matutino"),
                fields("gymId", gymId, "name", "Yoga Matutino", "category", "yoga",
                        "instructorId", trainer.get("id"), "capacity", 20,
                        "startTime", Instant.now().plus(2, ChronoUnit.DAYS).toString(),
                        "endTime", Instant.now().plus(2, ChronoUnit.DAYS).plus(1, ChronoUnit.HOURS).toString(),
                        "status", "scheduled"));
        ensure("class_bookings", Map.of("classId", gymClass.get("id"), "userId", client.get("id")),
                fields("gymId", gymId, "classId", gymClass.get("id"), "userId", client.get("id"),
                        "status", "confirmed"));
        if (db.findOne("attendance_records", Map.of("gymId", gymId), null, null) == null) {
            for (int day = 1; day <= 5; day++) {
                var time = Instant.now().minus(day, ChronoUnit.DAYS);
                db.insert("attendance_records", fields("gymId", gymId, "userId", client.get("id"),
                        "type", "check_in", "method", "member_card", "timestamp", time.toString()));
                db.insert("attendance_records", fields("gymId", gymId, "userId", client.get("id"),
                        "type", "check_out", "method", "member_card", "timestamp", time.plus(1, ChronoUnit.HOURS).toString()));
            }
        }
        var chicken = db.findOne("foods", Map.of("name", "Pechuga de pollo"), null, null);
        ensure("nutrition_logs", Map.of("userId", client.get("id"), "foodId", chicken.get("id")),
                fields("gymId", gymId, "userId", client.get("id"), "foodId", chicken.get("id"),
                        "mealType", "lunch", "quantityG", 150, "calculatedCalories", 247.5,
                        "eatenAt", Instant.now().toString()));
        for (Object[] item : new Object[][] {{"Cinta de correr", "cardio", 8},
                {"Banco ajustable", "strength", 12}, {"Mancuernas", "strength", 40}})
            ensure("inventory_items", Map.of("gymId", gymId, "name", item[0]),
                    fields("gymId", gymId, "name", item[0], "category", item[1],
                            "quantity", item[2], "availableQuantity", item[2]));
    }
    private Map<String, Object> user(String email, String first, String last, String role,
            UUID gymId, boolean superAdmin, String hash) {
        return ensure("users", Map.of("email", email), fields("email", email, "password", hash,
                "firstName", first, "lastName", last, "role", role, "gymId", gymId,
                "isSuperAdmin", superAdmin, "isActive", true));
    }
    private Map<String, Object> plan(UUID gymId, String name, int days, double price, int classes, int order) {
        return ensure("membership_types", Map.of("gymId", gymId, "name", name),
                fields("gymId", gymId, "name", name, "durationDays", days, "price", price,
                        "currency", "usd", "maxClassesPerWeek", classes, "sortOrder", order,
                        "features", List.of("Acceso a todas las áreas", "Clases grupales")));
    }
    private void membership(UUID gymId, Map<String, Object> user, Map<String, Object> plan,
            int daysAgo, boolean autoRenew) {
        var previous = db.findOne("user_memberships", Map.of("userId", user.get("id")), null, null);
        if (previous != null) return;
        int duration = ((Number) plan.get("durationDays")).intValue();
        LocalDate start = LocalDate.now().minusDays(daysAgo);
        var member = db.insert("user_memberships", fields("gymId", gymId, "userId", user.get("id"),
                "membershipTypeId", plan.get("id"), "startDate", start.toString(),
                "endDate", start.plusDays(duration).toString(), "status", "active",
                "autoRenew", autoRenew, "price", plan.get("price"),
                "notes", "Creado por seeder de demostración."));
        db.insert("payments", fields("gymId", gymId, "userId", user.get("id"),
                "membershipTypeId", plan.get("id"), "amount", plan.get("price"), "currency", "usd",
                "status", "succeeded", "paymentMethod", "stripe",
                "transactionId", "seed_" + member.get("id").toString().substring(0, 8),
                "paidAt", Instant.now().minus(daysAgo, ChronoUnit.DAYS).toString(),
                "metadata", Map.of("source", "seeder")));
    }
    private void exercises() {
        Object[][] rows = {{"Press de banca", "chest", "Pectoral"}, {"Sentadilla", "legs", "Cuádriceps"},
                {"Peso muerto convencional", "back", "Espalda baja y glúteos"},
                {"Press militar", "shoulders", "Hombros"}, {"Remo con barra", "back", "Dorsal"},
                {"Curl de bíceps", "arms", "Bíceps"}, {"Plancha", "core", "Core"},
                {"Cuerda de saltar", "cardio", "Cardio"}, {"Sentadilla con salto", "full_body", "Todo el cuerpo"},
                {"Dominadas", "back", "Dorsales"}, {"Zancadas alternas", "legs", "Glúteos y cuádriceps"},
                {"Hip thrust", "legs", "Glúteos"}};
        for (Object[] row : rows) ensure("exercises", Map.of("name", row[0]),
                fields("name", row[0], "category", row[1], "muscleGroup", row[2],
                        "difficulty", 2, "instructions", List.of("Controla el movimiento", "Respira con ritmo")));
    }
    private void foods() {
        Object[][] rows = {{"Pechuga de pollo", "protein", 100, 165, 31, 0, 3.6},
                {"Arroz integral", "carbohydrates", 100, 112, 2.6, 23.5, 0.9},
                {"Aguacate", "fats", 100, 160, 2, 8.5, 14.7},
                {"Brócoli", "vegetables", 100, 34, 2.8, 6.6, 0.4},
                {"Plátano", "fruits", 100, 89, 1.1, 22.8, 0.3},
                {"Yogur griego", "dairy", 100, 59, 10, 3.6, 0.4},
                {"Huevo entero", "protein", 100, 155, 13, 1.1, 11},
                {"Whey protein", "supplements", 30, 120, 24, 3, 1.5},
                {"Batata", "carbohydrates", 100, 86, 1.6, 20, 0.1},
                {"Salmón", "protein", 100, 208, 20, 0, 13},
                {"Avena", "carbohydrates", 100, 389, 16.9, 66.3, 6.9}};
        for (Object[] row : rows) ensure("foods", Map.of("name", row[0]),
                fields("name", row[0], "category", row[1], "servingSizeG", row[2],
                        "calories", row[3], "protein", row[4], "carbs", row[5], "fats", row[6],
                        "fiber", 0, "sugar", 0));
    }
    private Map<String, Object> ensure(String table, Map<String, ?> lookup, Map<String, Object> data) {
        var found = db.findOne(table, lookup, null, null);
        return found == null ? db.insert(table, data) : found;
    }
    private static Map<String, Object> fields(Object... pairs) {
        var map = new LinkedHashMap<String, Object>();
        for (int i = 0; i < pairs.length; i += 2) map.put((String) pairs[i], pairs[i + 1]);
        return map;
    }
}
