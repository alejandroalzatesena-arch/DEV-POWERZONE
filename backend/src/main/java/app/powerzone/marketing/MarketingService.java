package app.powerzone.marketing;

import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import app.powerzone.common.CrudService;
import app.powerzone.common.TableStore;
import app.powerzone.notifications.NotificationsService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MarketingService {
    private final TableStore db;
    private final CrudService crud;
    private final NotificationsService notifications;
    private final TransactionTemplate transaction;
    public MarketingService(TableStore db, CrudService crud, NotificationsService notifications,
            PlatformTransactionManager manager) {
        this.db = db; this.crud = crud; this.notifications = notifications;
        this.transaction = new TransactionTemplate(manager);
    }
    public Map<String, Object> create(Actor actor, Map<String, Object> body) {
        actor.require("admin");
        var input = new LinkedHashMap<String, Object>();
        input.put("gymId", actor.requiredGym()); input.put("createdById", actor.id());
        input.put("name", AuthService.required(body, "name"));
        input.put("subject", body.get("subject")); input.put("content", body.get("content"));
        input.put("type", AuthService.required(body, "type"));
        input.put("audience", body.getOrDefault("audience", Map.of("roles", List.of("client"))));
        Object scheduledAt = body.get("scheduledAt");
        input.put("status", scheduledAt != null && Instant.parse(scheduledAt.toString()).isAfter(Instant.now())
                ? "scheduled" : "draft");
        input.put("scheduledAt", scheduledAt);
        return db.insert("campaigns", input);
    }
    public Map<String, Object> list(Actor actor, Map<String, String> q) {
        actor.require("admin");
        return crud.list("campaigns", actor, "gymId", q, java.util.Set.of("status", "type"));
    }
    public Map<String, Object> one(Actor actor, UUID id) {
        actor.require("admin"); return db.read("campaigns", id, actor, "gymId");
    }
    public Map<String, Object> update(Actor actor, UUID id, Map<String, Object> body) {
        var campaign = one(actor, id);
        if ("sent".equals(campaign.get("status")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La campaña ya fue enviada.");
        var input = new LinkedHashMap<String, Object>();
        for (String key : List.of("name", "subject", "content", "type", "audience", "scheduledAt"))
            if (body.containsKey(key)) input.put(key, body.get(key));
        return db.update("campaigns", id, input, actor, "gymId");
    }
    public void remove(Actor actor, UUID id) { one(actor, id); db.softDelete("campaigns", id, actor, "gymId"); }
    public Map<String, Object> cancel(Actor actor, UUID id) {
        var campaign = one(actor, id);
        if ("sent".equals(campaign.get("status")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La campaña ya fue enviada.");
        return db.update("campaigns", id, Map.of("status", "cancelled"), actor, "gymId");
    }
    public Map<String, Object> send(Actor actor, UUID id) {
        return transaction.execute(status -> sendInTransaction(actor, id));
    }
    private Map<String, Object> sendInTransaction(Actor actor, UUID id) {
        actor.require("admin");
        var rows = db.query("SELECT * FROM campaigns WHERE id=:id AND deleted_at IS NULL FOR UPDATE", Map.of("id", id));
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Campaña no encontrada.");
        var campaign = rows.getFirst();
        actor.requireGym(AuthService.uuid(campaign.get("gymId")));
        if ("sent".equals(campaign.get("status")) || "cancelled".equals(campaign.get("status")))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta campaña no puede enviarse.");
        if (campaign.get("scheduledAt") != null && Instant.parse(campaign.get("scheduledAt").toString()).isAfter(Instant.now()))
            return db.update("campaigns", id, Map.of("status", "scheduled"), actor, "gymId");
        @SuppressWarnings("unchecked") var audience = campaign.get("audience") instanceof Map<?, ?> map
                ? (Map<String, Object>) map : Map.<String, Object>of();
        var users = resolveAudience(AuthService.uuid(campaign.get("gymId")), audience);
        int sent = 0;
        for (var user : users) {
            var data = Map.<String, Object>of("campaignId", id.toString(), "channel", campaign.get("type"));
            notifications.systemNotify(AuthService.uuid(user.get("id")), AuthService.uuid(campaign.get("gymId")),
                    "promotion", campaign.get("subject") == null ? campaign.get("name").toString() : campaign.get("subject").toString(),
                    campaign.get("content") == null ? null : campaign.get("content").toString(), data);
            sent++;
        }
        return db.update("campaigns", id, Map.of("status", "sent", "sentAt", Instant.now().toString(),
                "stats", Map.of("sent", sent, "failed", 0, "audienceSize", users.size())), actor, "gymId");
    }
    private List<Map<String, Object>> resolveAudience(UUID gymId, Map<String, Object> audience) {
        Object requested = audience.get("roles");
        List<?> roles = requested instanceof List<?> list && !list.isEmpty() ? list : List.of("client");
        var users = db.query("SELECT * FROM users WHERE gym_id=:gymId AND is_active=true AND deleted_at IS NULL",
                Map.of("gymId", gymId));
        var filtered = new ArrayList<Map<String, Object>>();
        for (var user : users) {
            if (!roles.contains(user.get("role"))) continue;
            UUID userId = AuthService.uuid(user.get("id"));
            if (Boolean.TRUE.equals(audience.get("activeMembership")) && db.query("SELECT id FROM user_memberships " +
                    "WHERE user_id=:id AND gym_id=:gymId AND status='active' AND deleted_at IS NULL LIMIT 1",
                    Map.of("id", userId, "gymId", gymId)).isEmpty()) continue;
            if (audience.get("goal") != null && db.query("SELECT id FROM user_profiles WHERE user_id=:id " +
                    "AND goal=:goal AND deleted_at IS NULL LIMIT 1", Map.of("id", userId, "goal", audience.get("goal"))).isEmpty()) continue;
            if (audience.get("search") != null) {
                String name = (user.get("firstName") + " " + user.get("lastName")).toLowerCase();
                if (!name.contains(audience.get("search").toString().toLowerCase())) continue;
            }
            filtered.add(user);
        }
        return filtered;
    }
    @Scheduled(fixedDelay = 60000)
    public void scheduled() {
        var due = db.query("SELECT id,created_by_id,gym_id FROM campaigns WHERE status='scheduled' " +
                "AND scheduled_at<=now() AND deleted_at IS NULL", Map.of());
        for (var item : due) {
            var actor = new Actor(AuthService.uuid(item.get("createdById")), AuthService.uuid(item.get("gymId")), "admin", false);
            try { send(actor, AuthService.uuid(item.get("id"))); }
            catch (RuntimeException ignored) { /* retry on next scheduler pass */ }
        }
    }
}
