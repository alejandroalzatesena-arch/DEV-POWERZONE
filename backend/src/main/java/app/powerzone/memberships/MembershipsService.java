package app.powerzone.memberships;

import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import app.powerzone.common.CrudService;
import app.powerzone.common.TableStore;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MembershipsService {
    private final TableStore db;
    private final CrudService crud;
    public MembershipsService(TableStore db, CrudService crud) { this.db = db; this.crud = crud; }

    public Map<String, Object> types(Actor actor, Map<String, String> q) {
        return crud.list("membership_types", actor, "gymId", q, Set.of("isActive"));
    }
    public Map<String, Object> createType(Actor actor, Map<String, Object> body) {
        actor.require("admin"); return crud.create("membership_types", actor, "gymId", body);
    }
    public Map<String, Object> updateType(Actor actor, UUID id, Map<String, Object> body) {
        actor.require("admin"); return crud.update("membership_types", id, actor, "gymId", body);
    }
    public void deleteType(Actor actor, UUID id) {
        actor.require("admin"); crud.delete("membership_types", id, actor, "gymId");
    }

    @Transactional
    public Map<String, Object> assign(Actor actor, Map<String, Object> body) {
        actor.require("admin", "receptionist");
        UUID userId = AuthService.uuid(AuthService.required(body, "userId"));
        UUID typeId = AuthService.uuid(AuthService.required(body, "membershipTypeId"));
        var user = db.read("users", userId, actor, "gymId");
        if (!"client".equals(user.get("role")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Solo clientes pueden tener membresía.");
        var type = db.read("membership_types", typeId, actor, "gymId");
        if (!user.get("gymId").equals(type.get("gymId")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El plan pertenece a otro gimnasio.");
        UUID gymId = AuthService.uuid(user.get("gymId"));
        db.execute("UPDATE user_memberships SET status='cancelled',updated_at=now() WHERE user_id=:userId " +
                "AND gym_id=:gymId AND status='active' AND deleted_at IS NULL", Map.of("userId", userId, "gymId", gymId));
        LocalDate start = LocalDate.now();
        LocalDate end = start.plusDays(((Number) type.get("durationDays")).longValue());
        var input = new LinkedHashMap<String, Object>();
        input.put("gymId", gymId); input.put("userId", userId); input.put("membershipTypeId", typeId);
        input.put("startDate", start); input.put("endDate", end); input.put("status", "active");
        input.put("autoRenew", body.getOrDefault("autoRenew", false));
        input.put("price", body.getOrDefault("price", type.get("price")));
        if (body.get("notes") != null) input.put("notes", body.get("notes"));
        var membership = db.insert("user_memberships", input);
        db.insert("payments", Map.of("gymId", gymId, "userId", userId, "membershipTypeId", typeId,
                "amount", input.get("price"), "currency", type.get("currency"), "status", "succeeded",
                "paymentMethod", "cash", "paidAt", java.sql.Timestamp.from(java.time.Instant.now())));
        return enrich(membership);
    }

    public Map<String, Object> list(Actor actor, Map<String, String> q) {
        actor.require("admin", "trainer", "receptionist");
        var page = crud.list("user_memberships", actor, "gymId", q, Set.of("status", "userId"));
        @SuppressWarnings("unchecked") var rows = (List<Map<String, Object>>) page.get("items");
        return Map.of("items", rows.stream().map(this::enrich).toList(), "meta", page.get("meta"));
    }

    public Map<String, Object> mine(Actor actor) {
        var found = db.findOne("user_memberships", Map.of("userId", actor.id(), "status", "active"),
                actor, "gymId");
        return found == null ? null : enrich(found);
    }

    @Transactional
    public Map<String, Object> renew(Actor actor, UUID id) {
        actor.require("admin", "receptionist");
        var membership = db.read("user_memberships", id, actor, "gymId");
        var type = db.read("membership_types", AuthService.uuid(membership.get("membershipTypeId")), actor, "gymId");
        LocalDate start = LocalDate.now();
        LocalDate end = start.plusDays(((Number) type.get("durationDays")).longValue());
        db.execute("UPDATE user_memberships SET start_date=:start,end_date=:end,status='active',auto_renew=true," +
                "updated_at=now() WHERE id=:id", Map.of("start", start, "end", end, "id", id));
        db.insert("payments", Map.of("gymId", membership.get("gymId"), "userId", membership.get("userId"),
                "membershipTypeId", membership.get("membershipTypeId"), "amount", membership.get("price"),
                "currency", type.get("currency"), "status", "succeeded", "paymentMethod", "cash",
                "paidAt", java.sql.Timestamp.from(java.time.Instant.now())));
        return enrich(db.read("user_memberships", id, actor, "gymId"));
    }
    public Map<String, Object> cancel(Actor actor, UUID id) {
        actor.require("admin", "receptionist");
        return db.update("user_memberships", id, Map.of("status", "cancelled", "autoRenew", false),
                actor, "gymId");
    }
    private Map<String, Object> enrich(Map<String, Object> row) {
        var result = new LinkedHashMap<>(row);
        var type = db.readOrNull("membership_types", AuthService.uuid(row.get("membershipTypeId")));
        if (type != null) result.put("membershipType", type);
        var user = db.readOrNull("users", AuthService.uuid(row.get("userId")));
        if (user != null) result.put("user", AuthService.publicUser(user));
        return result;
    }
    @Scheduled(cron = "0 0 2 * * *", zone = "America/Bogota")
    public void expireOverdue() {
        db.execute("UPDATE user_memberships SET status='expired',updated_at=now() " +
                "WHERE status='active' AND end_date < CURRENT_DATE AND deleted_at IS NULL", Map.of());
    }
}
