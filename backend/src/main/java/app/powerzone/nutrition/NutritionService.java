package app.powerzone.nutrition;

import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import app.powerzone.common.CrudService;
import app.powerzone.common.TableStore;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NutritionService {
    private final TableStore db;
    private final CrudService crud;
    public NutritionService(TableStore db, CrudService crud) { this.db = db; this.crud = crud; }
    public Map<String, Object> foods(Map<String, String> q) {
        if (q.get("search") == null || q.get("search").isBlank())
            return crud.list("foods", null, null, q, Set.of("category"));
        int limit = Math.clamp(CrudService.number(q.get("limit"), 20), 1, 100);
        int page = Math.max(1, CrudService.number(q.get("page"), 1));
        var params = Map.<String, Object>of("search", "%" + q.get("search") + "%", "limit", limit,
                "offset", (page - 1) * limit);
        var rows = db.query("SELECT * FROM foods WHERE deleted_at IS NULL AND name ILIKE :search " +
                "ORDER BY name ASC LIMIT :limit OFFSET :offset", params);
        long total = ((Number) db.query("SELECT count(*) AS total FROM foods WHERE deleted_at IS NULL " +
                "AND name ILIKE :search", Map.of("search", params.get("search"))).getFirst().get("total")).longValue();
        return Map.of("items", rows, "meta", Map.of("total", total, "page", page, "limit", limit,
                "totalPages", (int) Math.ceil((double) total / limit), "hasNextPage", page * limit < total,
                "hasPreviousPage", page > 1));
    }
    public Map<String, Object> createFood(Actor actor, Map<String, Object> body) {
        actor.require("admin", "trainer"); return db.insert("foods", body);
    }
    public Map<String, Object> updateFood(Actor actor, UUID id, Map<String, Object> body) {
        actor.require("admin", "trainer"); return db.update("foods", id, body, null, null);
    }
    public void deleteFood(Actor actor, UUID id) { actor.require("admin"); db.softDelete("foods", id, null, null); }

    public Map<String, Object> createLog(Actor actor, Map<String, Object> body) {
        UUID userId = body.get("userId") == null ? actor.id() : AuthService.uuid(body.get("userId"));
        actor.requireSelfOrStaff(userId);
        var user = db.read("users", userId, actor, "gymId");
        var food = db.read("foods", AuthService.uuid(AuthService.required(body, "foodId")), null, null);
        BigDecimal quantity = number(body.get("quantityG"));
        BigDecimal serving = number(food.get("servingSizeG"));
        if (quantity.signum() <= 0 || serving.signum() <= 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad debe ser mayor que cero.");
        BigDecimal calories = number(food.get("calories")).multiply(quantity).divide(serving, 1, RoundingMode.HALF_UP);
        var input = new LinkedHashMap<String, Object>();
        input.put("gymId", user.get("gymId")); input.put("userId", userId);
        input.put("foodId", food.get("id")); input.put("mealType", AuthService.required(body, "mealType"));
        input.put("quantityG", quantity); input.put("calculatedCalories", calories);
        input.put("eatenAt", body.getOrDefault("eatenAt", Instant.now().toString()));
        return enrich(db.insert("nutrition_logs", input));
    }
    public Map<String, Object> logs(Actor actor, Map<String, String> q) {
        var filters = new LinkedHashMap<>(q);
        if ("client".equals(actor.role())) {
            if (q.get("userId") != null && !actor.id().toString().equals(q.get("userId")))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN);
            filters.put("userId", actor.id().toString());
        }
        var page = crud.list("nutrition_logs", actor, "gymId", filters, Set.of("userId", "mealType"));
        @SuppressWarnings("unchecked") var rows = (List<Map<String, Object>>) page.get("items");
        return Map.of("items", rows.stream().map(this::enrich).toList(), "meta", page.get("meta"));
    }
    public Map<String, Object> one(Actor actor, UUID id) {
        var row = db.read("nutrition_logs", id, actor, "gymId");
        if ("client".equals(actor.role()) && !actor.id().toString().equals(row.get("userId")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return enrich(row);
    }
    public void deleteLog(Actor actor, UUID id) { one(actor, id); db.softDelete("nutrition_logs", id, actor, "gymId"); }
    public Map<String, Object> daily(Actor actor, String date, UUID requestedUser) {
        UUID userId = requestedUser == null ? actor.id() : requestedUser;
        actor.requireSelfOrStaff(userId);
        db.read("users", userId, actor, "gymId");
        LocalDate day;
        try { day = date == null || date.isBlank() ? LocalDate.now() : LocalDate.parse(date); }
        catch (RuntimeException ex) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fecha inválida."); }
        var rows = db.query("SELECT * FROM nutrition_logs WHERE user_id=:userId AND deleted_at IS NULL " +
                "AND eaten_at >= :start AND eaten_at < :end ORDER BY eaten_at ASC",
                Map.of("userId", userId, "start", java.sql.Timestamp.from(day.atStartOfDay(java.time.ZoneOffset.UTC).toInstant()),
                        "end", java.sql.Timestamp.from(day.plusDays(1).atStartOfDay(java.time.ZoneOffset.UTC).toInstant())));
        var logs = rows.stream().map(this::enrich).toList();
        var totals = new LinkedHashMap<String, BigDecimal>();
        for (String key : List.of("calories", "protein", "carbs", "fats", "fiber", "sugar"))
            totals.put(key, BigDecimal.ZERO);
        for (var log : logs) {
            @SuppressWarnings("unchecked") var food = (Map<String, Object>) log.get("food");
            if (food == null) continue;
            BigDecimal factor = number(log.get("quantityG")).divide(number(food.get("servingSizeG")), 6, RoundingMode.HALF_UP);
            for (String key : totals.keySet())
                totals.put(key, totals.get(key).add(number(food.get(key)).multiply(factor)));
        }
        totals.replaceAll((key, value) -> value.setScale(1, RoundingMode.HALF_UP));
        return Map.of("date", day.toString(), "logs", logs, "totals", totals);
    }
    private Map<String, Object> enrich(Map<String, Object> row) {
        var result = new LinkedHashMap<>(row);
        var food = db.readOrNull("foods", AuthService.uuid(row.get("foodId")));
        if (food != null) result.put("food", food);
        return result;
    }
    private static BigDecimal number(Object value) {
        return value == null ? BigDecimal.ZERO : new BigDecimal(value.toString());
    }
}
