package app.powerzone.attendance;

import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import app.powerzone.common.CrudService;
import app.powerzone.common.TableStore;
import app.powerzone.realtime.RealtimeHub;
import java.time.Instant;
import java.time.LocalDate;
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
public class AttendanceService {
    private final TableStore db;
    private final CrudService crud;
    private final RealtimeHub hub;
    public AttendanceService(TableStore db, CrudService crud, RealtimeHub hub) {
        this.db = db; this.crud = crud; this.hub = hub;
    }

    @Transactional
    public Map<String, Object> checkIn(Actor actor, UUID userId, String method) {
        actor.require("admin", "receptionist", "client"); actor.requireSelfOrStaff(userId);
        var user = db.read("users", userId, actor, "gymId");
        UUID gymId = AuthService.uuid(user.get("gymId"));
        var gym = lockedGym(gymId);
        var membership = db.findOne("user_memberships", Map.of("userId", userId, "gymId", gymId,
                "status", "active"), null, null);
        if (membership == null || LocalDate.parse(membership.get("endDate").toString()).isBefore(LocalDate.now()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El cliente no tiene membresía activa.");
        if (inside(userId)) throw new ResponseStatusException(HttpStatus.CONFLICT, "El cliente ya está dentro del gimnasio.");
        if ((long) occupancyCount(gymId) >= ((Number) gym.get("maxCapacity")).longValue())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El gimnasio alcanzó su aforo máximo.");
        var saved = db.insert("attendance_records", Map.of("gymId", gymId, "userId", userId,
                "type", "check_in", "method", method, "timestamp", java.sql.Timestamp.from(Instant.now())));
        int current = occupancyCount(gymId);
        int max = ((Number) gym.get("maxCapacity")).intValue();
        hub.publishGym(gymId, Map.of("current", current, "maxCapacity", max, "isFull", current >= max));
        return saved;
    }
    @Transactional
    public Map<String, Object> checkOut(Actor actor, UUID userId, String method) {
        actor.require("admin", "receptionist", "client"); actor.requireSelfOrStaff(userId);
        var user = db.read("users", userId, actor, "gymId");
        UUID gymId = AuthService.uuid(user.get("gymId"));
        var gym = lockedGym(gymId);
        if (!inside(userId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El cliente no está dentro del gimnasio.");
        var saved = db.insert("attendance_records", Map.of("gymId", gymId, "userId", userId,
                "type", "check_out", "method", method, "timestamp", java.sql.Timestamp.from(Instant.now())));
        int current = occupancyCount(gymId);
        int max = ((Number) gym.get("maxCapacity")).intValue();
        hub.publishGym(gymId, Map.of("current", current, "maxCapacity", max, "isFull", current >= max));
        return saved;
    }
    public Map<String, Object> recordClass(Actor actor, UUID classId, String method) {
        var gymClass = db.read("gym_classes", classId, actor, "gymId");
        var booking = db.findOne("class_bookings", Map.of("classId", classId, "userId", actor.id()), null, null);
        if (booking == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No tienes reserva para la clase.");
        return db.insert("attendance_records", Map.of("gymId", gymClass.get("gymId"),
                "userId", actor.id(), "classId", classId, "type", "class", "method", method,
                "timestamp", java.sql.Timestamp.from(Instant.now())));
    }
    public Map<String, Object> history(Actor actor, Map<String, String> q, boolean onlyMine) {
        if (!onlyMine) actor.require("admin", "trainer", "receptionist");
        var filters = new LinkedHashMap<>(q);
        if (onlyMine) filters.put("userId", actor.id().toString());
        var page = crud.list("attendance_records", actor, "gymId", filters, Set.of("type", "userId"));
        @SuppressWarnings("unchecked") var rows = (List<Map<String, Object>>) page.get("items");
        return Map.of("items", rows.stream().map(this::enrich).toList(), "meta", page.get("meta"));
    }
    public Map<String, Object> occupancy(Actor actor, UUID gymId) {
        actor.requireGym(gymId);
        var gym = db.read("gyms", gymId, null, null);
        int current = occupancyCount(gymId);
        int max = ((Number) gym.get("maxCapacity")).intValue();
        return Map.of("current", current, "maxCapacity", max, "isFull", current >= max);
    }
    private Map<String, Object> lockedGym(UUID gymId) {
        var rows = db.query("SELECT * FROM gyms WHERE id=:id AND deleted_at IS NULL FOR UPDATE", Map.of("id", gymId));
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Gimnasio no encontrado.");
        return rows.getFirst();
    }
    private boolean inside(UUID userId) {
        var rows = db.query("SELECT type FROM attendance_records WHERE user_id=:id AND deleted_at IS NULL " +
                "AND type IN ('check_in','check_out') ORDER BY timestamp DESC,id DESC LIMIT 1", Map.of("id", userId));
        return !rows.isEmpty() && "check_in".equals(rows.getFirst().get("type"));
    }
    private int occupancyCount(UUID gymId) {
        var rows = db.query("SELECT count(*) AS total FROM (SELECT DISTINCT ON (user_id) user_id,type " +
                "FROM attendance_records WHERE gym_id=:gymId AND deleted_at IS NULL " +
                "AND type IN ('check_in','check_out') ORDER BY user_id,timestamp DESC,id DESC) latest " +
                "WHERE type='check_in'", Map.of("gymId", gymId));
        return ((Number) rows.getFirst().get("total")).intValue();
    }
    private Map<String, Object> enrich(Map<String, Object> row) {
        var result = new LinkedHashMap<>(row);
        var user = db.readOrNull("users", AuthService.uuid(row.get("userId")));
        if (user != null) result.put("user", AuthService.publicUser(user));
        return result;
    }
}
