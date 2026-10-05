package app.powerzone.notifications;

import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import app.powerzone.common.CrudService;
import app.powerzone.common.TableStore;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NotificationsService {
    private final TableStore db;
    private final CrudService crud;
    public NotificationsService(TableStore db, CrudService crud) { this.db = db; this.crud = crud; }

    public Map<String, Object> create(Actor actor, Map<String, Object> body, boolean message) {
        if (!message) actor.require("admin", "trainer", "receptionist");
        else actor.require("admin", "trainer", "client");
        var user = db.read("users", AuthService.uuid(AuthService.required(body, "userId")), actor, "gymId");
        var input = new LinkedHashMap<String, Object>();
        input.put("userId", user.get("id")); input.put("gymId", user.get("gymId"));
        input.put("senderId", actor.id()); input.put("title", AuthService.required(body, "title"));
        input.put("body", body.get("body")); input.put("isRead", false);
        input.put("type", message ? "message" : body.getOrDefault("type", "info"));
        input.put("channel", message ? "in_app" : body.getOrDefault("channel", "in_app"));
        input.put("data", message ? Map.of("messageType", "internal") : body.get("data"));
        return db.insert("notifications", input);
    }
    public Map<String, Object> systemNotify(UUID userId, UUID gymId, String type, String title,
            String body, Map<String, Object> data) {
        var input = new LinkedHashMap<String, Object>();
        input.put("userId", userId); input.put("gymId", gymId); input.put("type", type);
        input.put("channel", "in_app"); input.put("title", title); input.put("body", body);
        input.put("data", data); input.put("isRead", false);
        return db.insert("notifications", input);
    }
    public Map<String, Object> mine(Actor actor, Map<String, String> q) {
        var filters = new LinkedHashMap<String, Object>();
        filters.put("userId", actor.id());
        if (q.containsKey("type")) filters.put("type", q.get("type"));
        if ("true".equals(q.get("unreadOnly"))) filters.put("isRead", false);
        return db.page("notifications", filters, null, null, q.getOrDefault("sortBy", "createdAt"),
                q.getOrDefault("sortOrder", "DESC"), CrudService.number(q.get("page"), 1),
                CrudService.number(q.get("limit"), 20));
    }
    public Map<String, Object> unread(Actor actor) {
        long count = ((Number) db.query("SELECT count(*) AS total FROM notifications WHERE user_id=:id " +
                "AND is_read=false AND deleted_at IS NULL", Map.of("id", actor.id())).getFirst().get("total")).longValue();
        return Map.of("unread", count);
    }
    public Map<String, Object> read(Actor actor, UUID id) {
        var row = own(actor, id);
        return db.update("notifications", id, Map.of("isRead", true, "readAt", Instant.now().toString()),
                null, null);
    }
    public Map<String, Object> readAll(Actor actor) {
        int updated = db.execute("UPDATE notifications SET is_read=true,read_at=now(),updated_at=now() " +
                "WHERE user_id=:id AND is_read=false AND deleted_at IS NULL", Map.of("id", actor.id()));
        return Map.of("updated", updated);
    }
    public void remove(Actor actor, UUID id) { own(actor, id); db.softDelete("notifications", id, null, null); }
    private Map<String, Object> own(Actor actor, UUID id) {
        var row = db.read("notifications", id, null, null);
        if (!actor.id().toString().equals(row.get("userId"))) {
            actor.require("admin");
            if (row.get("gymId") != null) actor.requireGym(AuthService.uuid(row.get("gymId")));
        }
        return row;
    }
}
