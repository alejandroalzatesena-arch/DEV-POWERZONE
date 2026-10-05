package app.powerzone.routines;

import app.powerzone.ai.AiService;
import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import app.powerzone.common.CrudService;
import app.powerzone.common.TableStore;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RoutinesService {
    private final TableStore db;
    private final CrudService crud;
    private final AiService ai;
    public RoutinesService(TableStore db, CrudService crud, AiService ai) { this.db = db; this.crud = crud; this.ai = ai; }

    @Transactional
    public Map<String, Object> create(Actor actor, Map<String, Object> body) {
        actor.require("admin", "trainer");
        var input = new LinkedHashMap<>(body);
        Object exercises = input.remove("exercises");
        input.put("createdById", actor.id()); input.putIfAbsent("objective", "general");
        input.putIfAbsent("status", "active"); input.putIfAbsent("isTemplate", false);
        if (input.get("assigneeId") != null) verifyAssignee(actor, AuthService.uuid(input.get("assigneeId")));
        var routine = crud.create("routines", actor, "gymId", input);
        if (exercises instanceof List<?> rows) saveExercises(actor, AuthService.uuid(routine.get("id")), rows);
        return one(actor, AuthService.uuid(routine.get("id")));
    }
    public Map<String, Object> list(Actor actor, Map<String, String> q) {
        var page = crud.list("routines", actor, "gymId", q, Set.of("objective", "status", "isTemplate"));
        @SuppressWarnings("unchecked") var rows = (List<Map<String, Object>>) page.get("items");
        return Map.of("items", rows.stream().map(this::enrich).toList(), "meta", page.get("meta"));
    }
    public Map<String, Object> mine(Actor actor, Map<String, String> q) {
        var assigned = db.search("routines", Map.of("assigneeId", actor.id()), actor, "gymId", "createdAt", "DESC", 1, 100);
        var created = db.search("routines", Map.of("createdById", actor.id()), actor, "gymId", "createdAt", "DESC", 1, 100);
        var unique = new LinkedHashMap<Object, Map<String, Object>>();
        assigned.forEach(r -> unique.put(r.get("id"), r)); created.forEach(r -> unique.put(r.get("id"), r));
        var rows = unique.values().stream().sorted(Comparator.comparing(r -> String.valueOf(r.get("createdAt")),
                Comparator.reverseOrder())).toList();
        int page = Math.max(1, CrudService.number(q.get("page"), 1));
        int limit = Math.clamp(CrudService.number(q.get("limit"), 20), 1, 100);
        var items = rows.stream().skip((long) (page - 1) * limit).limit(limit).map(this::enrich).toList();
        return Map.of("items", items, "meta", Map.of("total", rows.size(), "page", page, "limit", limit,
                "totalPages", (int) Math.ceil((double) rows.size() / limit),
                "hasNextPage", page * limit < rows.size(), "hasPreviousPage", page > 1));
    }
    public Map<String, Object> one(Actor actor, UUID id) {
        var routine = db.read("routines", id, actor, "gymId");
        if ("client".equals(actor.role()) && !actor.id().toString().equals(routine.get("assigneeId"))
                && !Boolean.TRUE.equals(routine.get("isTemplate")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return enrich(routine);
    }
    @Transactional
    public Map<String, Object> update(Actor actor, UUID id, Map<String, Object> body) {
        actor.require("admin", "trainer"); one(actor, id);
        var input = new LinkedHashMap<>(body);
        Object exercises = input.remove("exercises");
        db.update("routines", id, input, actor, "gymId");
        if (exercises instanceof List<?> rows) {
            db.execute("DELETE FROM routine_exercises WHERE routine_id=:id", Map.of("id", id));
            saveExercises(actor, id, rows);
        }
        return one(actor, id);
    }
    public void delete(Actor actor, UUID id) {
        actor.require("admin", "trainer"); db.softDelete("routines", id, actor, "gymId");
    }
    public Map<String, Object> assign(Actor actor, UUID id, UUID userId) {
        actor.require("admin", "trainer");
        var routine = one(actor, id);
        if ("draft".equals(routine.get("status")) && Boolean.TRUE.equals(routine.get("isTemplate")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Activa la plantilla antes de asignarla.");
        verifyAssignee(actor, userId);
        db.update("routines", id, Map.of("assigneeId", userId, "status", "active", "isTemplate", false), actor, "gymId");
        return one(actor, id);
    }
    @Transactional
    public Map<String, Object> generate(Actor actor, Map<String, Object> body) {
        actor.require("admin", "trainer");
        UUID userId = AuthService.uuid(AuthService.required(body, "userId")); verifyAssignee(actor, userId);
        String objective = String.valueOf(body.getOrDefault("objective", "general"));
        int days = ((Number) body.getOrDefault("daysPerWeek", 3)).intValue();
        if (days < 1 || days > 7) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Días por semana inválidos.");
        var catalog = db.search("exercises", Map.of("isActive", true), null, null, "name", "ASC", 1, 100);
        if (catalog.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Crea ejercicios antes de generar rutinas.");
        var input = new LinkedHashMap<String, Object>();
        input.put("title", "Rutina automática de " + objective.replace('_', ' '));
        input.put("description", "Rutina generada para " + days + " días por semana");
        input.put("objective", objective); input.put("daysPerWeek", days);
        input.put("durationWeeks", 8); input.put("difficulty", body.getOrDefault("difficulty", 3));
        input.put("isTemplate", false); input.put("status", "active");
        input.put("assigneeId", userId); input.put("createdById", actor.id());
        List<Map<String, Object>> chosen = new ArrayList<>();
        if (Boolean.TRUE.equals(body.get("useAI"))) {
            try {
                var request = new LinkedHashMap<>(body);
                request.put("objective", switch (objective) {
                    case "hypertrophy" -> "gain_muscle"; case "weight_loss" -> "fat_loss";
                    case "general" -> "general_fitness"; default -> objective;
                });
                var result = ai.routine(actor, request);
                input.put("title", result.getOrDefault("title", input.get("title")));
                input.put("description", result.getOrDefault("description", input.get("description")));
                if (result.get("exercises") instanceof List<?> suggested) {
                    int i = 0;
                    for (Object item : suggested) {
                        if (!(item instanceof Map<?, ?> suggestion)) continue;
                        String name = String.valueOf(suggestion.get("name")).toLowerCase(Locale.ROOT);
                        var match = catalog.stream().filter(e -> String.valueOf(e.get("name")).toLowerCase(Locale.ROOT)
                                .equals(name)).findFirst();
                        if (match.isEmpty()) continue;
                        int index = i++;
                        chosen.add(Map.of("exerciseId", match.get().get("id"), "dayOfWeek", index % days + 1,
                                "sets", value(suggestion, "sets", 3), "reps", 10,
                                "restSeconds", value(suggestion, "restSeconds", 60)));
                    }
                }
            } catch (RuntimeException ignored) { chosen.clear(); }
        }
        if (chosen.isEmpty()) {
            int i = 0;
            for (var exercise : catalog.stream().limit(Math.min(catalog.size(), days * 4L)).toList()) {
                int index = i++;
                chosen.add(Map.of("exerciseId", exercise.get("id"), "dayOfWeek", index % days + 1,
                        "sets", 3, "reps", 10, "restSeconds", 60));
            }
        }
        var routine = crud.create("routines", actor, "gymId", input);
        saveExercises(actor, AuthService.uuid(routine.get("id")), chosen);
        return one(actor, AuthService.uuid(routine.get("id")));
    }
    private void verifyAssignee(Actor actor, UUID userId) {
        var user = db.read("users", userId, actor, "gymId");
        if (!"client".equals(user.get("role")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La rutina solo se asigna a clientes.");
    }
    private void saveExercises(Actor actor, UUID routineId, List<?> rows) {
        int order = 0;
        for (Object item : rows) {
            if (!(item instanceof Map<?, ?> row)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ejercicio inválido.");
            UUID exerciseId = AuthService.uuid(row.get("exerciseId"));
            db.read("exercises", exerciseId, null, null);
            var input = new LinkedHashMap<String, Object>();
            input.put("routineId", routineId); input.put("exerciseId", exerciseId);
            input.put("dayOfWeek", value(row, "dayOfWeek", 1));
            input.put("sets", value(row, "sets", 3)); input.put("reps", value(row, "reps", 10));
            input.put("restSeconds", value(row, "restSeconds", 60));
            input.put("order", value(row, "order", ++order));
            if (row.get("weight") != null) input.put("weight", row.get("weight"));
            if (row.get("notes") != null) input.put("notes", row.get("notes"));
            db.insert("routine_exercises", input);
        }
    }
    private Map<String, Object> enrich(Map<String, Object> row) {
        var result = new LinkedHashMap<>(row);
        var exercises = db.search("routine_exercises", Map.of("routineId", AuthService.uuid(row.get("id"))),
                null, null, "order", "ASC", 1, 100);
        var detail = new ArrayList<Map<String, Object>>();
        for (var exercise : exercises) {
            var line = new LinkedHashMap<>(exercise);
            var catalog = db.readOrNull("exercises", AuthService.uuid(exercise.get("exerciseId")));
            if (catalog != null) line.put("exercise", catalog);
            detail.add(line);
        }
        result.put("exercises", detail);
        if (row.get("assigneeId") != null) {
            var user = db.readOrNull("users", AuthService.uuid(row.get("assigneeId")));
            if (user != null) result.put("assignee", AuthService.publicUser(user));
        }
        return result;
    }
    private static Object value(Map<?, ?> row, String key, Object fallback) {
        Object found = row.get(key);
        return found == null ? fallback : found;
    }
}
