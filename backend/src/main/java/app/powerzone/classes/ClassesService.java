package app.powerzone.classes;

import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import app.powerzone.common.CrudService;
import app.powerzone.common.TableStore;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ClassesService {
    private final TableStore db;
    private final CrudService crud;
    public ClassesService(TableStore db, CrudService crud) { this.db = db; this.crud = crud; }

    public Map<String, Object> list(Actor actor, Map<String, String> query) {
        var page = crud.list("gym_classes", actor, "gymId", query, Set.of("category", "status"));
        @SuppressWarnings("unchecked") var rows = (List<Map<String, Object>>) page.get("items");
        return Map.of("items", rows.stream().map(this::enrich).toList(), "meta", page.get("meta"));
    }
    public Map<String, Object> upcoming(Actor actor, Map<String, String> query) {
        int limit = Math.clamp(CrudService.number(query.get("limit"), 50), 1, 100);
        String tenant = actor.superAdmin() ? "" : " AND gym_id=:gymId";
        Map<String, Object> params = actor.superAdmin() ? Map.of("limit", limit) :
                Map.of("limit", limit, "gymId", actor.requiredGym());
        var rows = db.query("SELECT * FROM gym_classes WHERE deleted_at IS NULL AND is_active=true " +
                "AND start_time >= now()" + tenant + " ORDER BY start_time ASC LIMIT :limit", params);
        var items = rows.stream().map(this::enrich).toList();
        return page(items, 1, limit, items.size());
    }
    public Map<String, Object> one(Actor actor, UUID id) { return enrich(db.read("gym_classes", id, actor, "gymId")); }

    public Map<String, Object> create(Actor actor, Map<String, Object> body) {
        actor.require("admin", "trainer");
        UUID instructorId = AuthService.uuid(AuthService.required(body, "instructorId"));
        var instructor = db.read("users", instructorId, actor, "gymId");
        if (!Set.of("trainer", "admin").contains(instructor.get("role")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El instructor debe ser entrenador o administrador.");
        var input = new LinkedHashMap<>(body);
        input.putIfAbsent("capacity", 20); input.putIfAbsent("status", "scheduled");
        input.putIfAbsent("isActive", true);
        return enrich(crud.create("gym_classes", actor, "gymId", input));
    }
    public Map<String, Object> update(Actor actor, UUID id, Map<String, Object> body) {
        actor.require("admin", "trainer");
        return enrich(crud.update("gym_classes", id, actor, "gymId", body));
    }
    public void delete(Actor actor, UUID id) {
        actor.require("admin"); crud.delete("gym_classes", id, actor, "gymId");
    }

    @Transactional
    public Map<String, Object> book(Actor actor, UUID classId, boolean allowWaitlist) {
        var gymClass = lockedClass(actor, classId);
        UUID gymId = AuthService.uuid(gymClass.get("gymId"));
        var membership = db.findOne("user_memberships", Map.of("userId", actor.id(), "gymId", gymId,
                "status", "active"), null, null);
        if (membership == null || LocalDate.parse(membership.get("endDate").toString()).isBefore(LocalDate.now()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Necesitas una membresía activa.");
        var existing = db.findOne("class_bookings", Map.of("classId", classId, "userId", actor.id()), null, null);
        if (existing != null && !"cancelled".equals(existing.get("status")))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya tienes reserva para esta clase.");
        long confirmed = count(classId, "confirmed");
        String status = "confirmed";
        if (confirmed >= ((Number) gymClass.get("capacity")).longValue()) {
            if (!allowWaitlist) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La clase está llena.");
            if (count(classId, "waitlisted") >= 5)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La lista de espera está llena.");
            status = "waitlisted";
        }
        if (existing != null) return enrichBooking(db.update("class_bookings", AuthService.uuid(existing.get("id")),
                Map.of("status", status, "bookedAt", java.sql.Timestamp.from(Instant.now())), null, null));
        return enrichBooking(db.insert("class_bookings", Map.of("gymId", gymId, "classId", classId,
                "userId", actor.id(), "status", status)));
    }

    @Transactional
    public void cancelBooking(Actor actor, UUID classId) {
        lockedClass(actor, classId);
        var booking = db.findOne("class_bookings", Map.of("classId", classId, "userId", actor.id()), null, null);
        if (booking == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada.");
        if ("attended".equals(booking.get("status")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No puedes cancelar una clase asistida.");
        db.update("class_bookings", AuthService.uuid(booking.get("id")), Map.of("status", "cancelled"), null, null);
        promote(classId);
    }

    public Map<String, Object> myBookings(Actor actor, Map<String, String> q) {
        var filters = new LinkedHashMap<>(q); filters.put("userId", actor.id().toString());
        var page = crud.list("class_bookings", null, null, filters, Set.of("userId", "status"));
        @SuppressWarnings("unchecked") var rows = (List<Map<String, Object>>) page.get("items");
        return Map.of("items", rows.stream().map(this::enrichBooking).toList(), "meta", page.get("meta"));
    }
    public Map<String, Object> bookings(Actor actor, UUID classId, Map<String, String> q) {
        actor.require("admin", "trainer", "receptionist");
        one(actor, classId);
        var filters = new LinkedHashMap<>(q); filters.put("classId", classId.toString());
        var page = crud.list("class_bookings", null, null, filters, Set.of("classId", "status"));
        @SuppressWarnings("unchecked") var rows = (List<Map<String, Object>>) page.get("items");
        return Map.of("items", rows.stream().map(this::enrichBooking).toList(), "meta", page.get("meta"));
    }
    @Transactional
    public Map<String, Object> markAttendance(Actor actor, UUID classId, UUID userId, boolean attended) {
        actor.require("admin", "trainer", "receptionist");
        lockedClass(actor, classId);
        var booking = db.findOne("class_bookings", Map.of("classId", classId, "userId", userId), null, null);
        if (booking == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada.");
        var result = db.update("class_bookings", AuthService.uuid(booking.get("id")),
                Map.of("status", attended ? "attended" : "no_show", "attended", attended), null, null);
        promote(classId);
        return enrichBooking(result);
    }

    private Map<String, Object> lockedClass(Actor actor, UUID classId) {
        var rows = db.query("SELECT * FROM gym_classes WHERE id=:id AND deleted_at IS NULL FOR UPDATE", Map.of("id", classId));
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Clase no encontrada.");
        var row = rows.getFirst(); actor.requireGym(AuthService.uuid(row.get("gymId")));
        return row;
    }
    private long count(UUID classId, String status) {
        return ((Number) db.query("SELECT count(*) AS total FROM class_bookings WHERE class_id=:id AND status=:status " +
                "AND deleted_at IS NULL", Map.of("id", classId, "status", status)).getFirst().get("total")).longValue();
    }
    private void promote(UUID classId) {
        var gymClass = db.read("gym_classes", classId, null, null);
        int free = ((Number) gymClass.get("capacity")).intValue() - (int) count(classId, "confirmed");
        if (free <= 0) return;
        var waitlisted = db.query("SELECT * FROM class_bookings WHERE class_id=:id AND status='waitlisted' " +
                "AND deleted_at IS NULL ORDER BY booked_at ASC LIMIT :limit", Map.of("id", classId, "limit", free));
        for (var booking : waitlisted)
            db.update("class_bookings", AuthService.uuid(booking.get("id")), Map.of("status", "confirmed"), null, null);
    }
    private Map<String, Object> enrich(Map<String, Object> gymClass) {
        var result = new LinkedHashMap<>(gymClass);
        UUID id = AuthService.uuid(gymClass.get("id"));
        var instructor = db.readOrNull("users", AuthService.uuid(gymClass.get("instructorId")));
        if (instructor != null) result.put("instructor", AuthService.publicUser(instructor));
        long confirmed = count(id, "confirmed"); long waitlisted = count(id, "waitlisted");
        result.put("bookedSpots", confirmed); result.put("waitlisted", waitlisted);
        result.put("availableSpots", Math.max(0, ((Number) gymClass.get("capacity")).longValue() - confirmed));
        return result;
    }
    private Map<String, Object> enrichBooking(Map<String, Object> booking) {
        var result = new LinkedHashMap<>(booking);
        var gymClass = db.readOrNull("gym_classes", AuthService.uuid(booking.get("classId")));
        if (gymClass != null) { var value = enrich(gymClass); result.put("class", value); result.put("gymClass", value); }
        var user = db.readOrNull("users", AuthService.uuid(booking.get("userId")));
        if (user != null) result.put("user", AuthService.publicUser(user));
        return result;
    }
    private static Map<String, Object> page(List<Map<String, Object>> items, int page, int limit, int total) {
        return Map.of("items", items, "meta", Map.of("total", total, "page", page, "limit", limit,
                "totalPages", (int) Math.ceil((double) total / limit), "hasNextPage", false,
                "hasPreviousPage", false));
    }
}
