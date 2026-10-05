package app.powerzone.reports;

import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import app.powerzone.common.TableStore;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReportsService {
    private final TableStore db;
    public ReportsService(TableStore db) { this.db = db; }
    private UUID gym(Actor actor) {
        if (actor.gymId() != null) return actor.gymId();
        if (actor.superAdmin()) {
            var gyms = db.query("SELECT id FROM gyms WHERE is_active=true AND deleted_at IS NULL " +
                    "ORDER BY created_at ASC LIMIT 1", Map.of());
            if (!gyms.isEmpty()) return AuthService.uuid(gyms.getFirst().get("id"));
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No hay gimnasio para reportes.");
    }
    private Map<String, Object> range(Map<String, String> q) {
        try {
            LocalDate from = q.get("from") == null ? LocalDate.now().withDayOfMonth(1) : LocalDate.parse(q.get("from"));
            LocalDate to = q.get("to") == null ? LocalDate.now() : LocalDate.parse(q.get("to"));
            if (from.isAfter(to)) throw new IllegalArgumentException();
            return Map.of("from", java.sql.Timestamp.from(from.atStartOfDay(ZoneOffset.UTC).toInstant()),
                    "to", java.sql.Timestamp.from(to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant()));
        } catch (RuntimeException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rango de fechas inválido."); }
    }
    private long count(String table, String where, Map<String, Object> params) {
        return ((Number) db.query("SELECT count(*) AS total FROM " + table + " WHERE deleted_at IS NULL " + where,
                params).getFirst().get("total")).longValue();
    }
    public Map<String, Object> financial(Actor actor, Map<String, String> q) {
        actor.require("admin"); UUID gym = gym(actor);
        var range = range(q); var params = new LinkedHashMap<>(range); params.put("gym", gym);
        var rows = db.query("SELECT * FROM payments WHERE gym_id=:gym AND paid_at>=:from AND paid_at<:to " +
                "AND deleted_at IS NULL", params);
        var byMethod = new LinkedHashMap<String, Double>(); var daily = new LinkedHashMap<String, Double>();
        double revenue = 0; long success = 0, failed = 0, pending = 0, refunded = 0;
        for (var row : rows) {
            String status = row.get("status").toString();
            if ("succeeded".equals(status)) {
                double amount = ((Number) row.get("amount")).doubleValue(); revenue += amount; success++;
                byMethod.merge(row.get("paymentMethod").toString(), amount, Double::sum);
                daily.merge(row.get("paidAt").toString().substring(0, 10), amount, Double::sum);
            } else if ("failed".equals(status)) failed++;
            else if ("pending".equals(status)) pending++;
            else if ("refunded".equals(status)) refunded++;
        }
        return Map.of("period", Map.of("from", range.get("from").toString(), "to", range.get("to").toString()),
                "totalRevenue", revenue, "totalPayments", rows.size(), "successfulPayments", success,
                "failedPayments", failed, "pendingPayments", pending, "refunded", refunded,
                "revenueByMethod", byMethod, "dailyRevenue", daily);
    }
    public Map<String, Object> operational(Actor actor) {
        actor.require("admin"); UUID gym = gym(actor); var p = Map.<String, Object>of("gym", gym);
        long active = count("user_memberships", "AND gym_id=:gym AND status='active'", p);
        long users = count("users", "AND gym_id=:gym", p);
        long clients = count("users", "AND gym_id=:gym AND role='client'", p);
        var today = db.query("SELECT type,count(*) AS total FROM attendance_records WHERE gym_id=:gym " +
                "AND timestamp>=CURRENT_DATE AND deleted_at IS NULL GROUP BY type", p);
        var attendance = new LinkedHashMap<String, Long>();
        for (var row : today) attendance.put(row.get("type").toString(), ((Number) row.get("total")).longValue());
        long inside = attendance.getOrDefault("check_in", 0L) - attendance.getOrDefault("check_out", 0L);
        return Map.of("gymId", gym, "totalUsers", users, "clients", clients, "activeMemberships", active,
                "attendanceToday", attendance, "estimatedCurrentOccupancy", Math.max(inside, 0),
                "reportedAt", Instant.now().toString());
    }
    public Map<String, Object> memberships(Actor actor) {
        actor.require("admin"); UUID gym = gym(actor); var p = Map.<String, Object>of("gym", gym);
        var types = db.query("SELECT * FROM membership_types WHERE gym_id=:gym AND deleted_at IS NULL", p);
        var byType = new LinkedHashMap<String, Object>();
        for (var type : types) {
            var params = Map.<String, Object>of("gym", gym, "type", AuthService.uuid(type.get("id")));
            byType.put(type.get("name").toString(), Map.of("total", count("user_memberships",
                    "AND gym_id=:gym AND membership_type_id=:type", params), "active", count("user_memberships",
                    "AND gym_id=:gym AND membership_type_id=:type AND status='active'", params)));
        }
        var statusRows = db.query("SELECT status,count(*) AS total FROM user_memberships WHERE gym_id=:gym " +
                "AND deleted_at IS NULL GROUP BY status", p);
        var byStatus = new LinkedHashMap<String, Long>();
        for (var row : statusRows) byStatus.put(row.get("status").toString(), ((Number) row.get("total")).longValue());
        var soon = db.query("SELECT um.id,u.first_name,u.last_name,mt.name AS membership_type,um.end_date " +
                "FROM user_memberships um JOIN users u ON u.id=um.user_id " +
                "JOIN membership_types mt ON mt.id=um.membership_type_id WHERE um.gym_id=:gym " +
                "AND um.status='active' AND um.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE+7 " +
                "AND um.deleted_at IS NULL", p).stream().map(row -> Map.of("id", row.get("id"),
                        "member", row.get("firstName") + " " + row.get("lastName"),
                        "membershipType", row.get("membershipType"), "endDate", row.get("endDate"))).toList();
        return Map.of("byType", byType, "byStatus", byStatus, "expiringWithin7Days", soon);
    }
    public Map<String, Object> attendance(Actor actor, Map<String, String> q) {
        actor.require("admin", "trainer", "receptionist"); UUID gym = gym(actor);
        var range = range(q); var p = new LinkedHashMap<>(range); p.put("gym", gym);
        var rows = db.query("SELECT DATE(timestamp) AS day,type,count(*) AS total FROM attendance_records " +
                "WHERE gym_id=:gym AND timestamp>=:from AND timestamp<:to AND deleted_at IS NULL " +
                "GROUP BY DATE(timestamp),type ORDER BY day ASC", p);
        var daily = new LinkedHashMap<String, Map<String, Long>>(); long total = 0;
        for (var row : rows) {
            String date = row.get("day").toString();
            var day = daily.computeIfAbsent(date, d -> {
                var v = new LinkedHashMap<String, Long>(); v.put("check_in", 0L); v.put("check_out", 0L);
                v.put("class", 0L); return v;
            });
            long n = ((Number) row.get("total")).longValue(); day.put(row.get("type").toString(), n); total += n;
        }
        return Map.of("period", Map.of("from", range.get("from").toString(), "to", range.get("to").toString()),
                "daily", daily, "totalRecords", total);
    }
    public Map<String, Object> progress(Actor actor, UUID userId) {
        actor.require("admin", "trainer"); db.read("users", userId, actor, "gymId");
        var user = AuthService.publicUser(db.read("users", userId, actor, "gymId"));
        var p = Map.<String, Object>of("id", userId);
        var profile = db.findOne("user_profiles", Map.of("userId", userId), null, null);
        long checkIns = count("attendance_records", "AND user_id=:id AND type='check_in' " +
                "AND timestamp>=now()-interval '30 days'", p);
        long classes = count("class_bookings", "AND user_id=:id AND attended=true", p);
        var memberships = db.query("SELECT * FROM user_memberships WHERE user_id=:id AND deleted_at IS NULL " +
                "ORDER BY created_at DESC LIMIT 6", p);
        var payments = db.query("SELECT * FROM payments WHERE user_id=:id AND status='succeeded' " +
                "AND deleted_at IS NULL ORDER BY paid_at DESC LIMIT 10", p);
        var result = new LinkedHashMap<String, Object>(); result.put("user", user); result.put("profile", profile);
        result.put("metrics", Map.of("checkInsLast30Days", checkIns, "classesAttended", classes));
        result.put("currentMembership", memberships.stream().filter(m -> "active".equals(m.get("status"))).findFirst().orElse(null));
        result.put("membershipHistory", memberships); result.put("paymentHistory", payments); return result;
    }
}
