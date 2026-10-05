package app.powerzone.common;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.postgresql.util.PGobject;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

/** The database adapter keeps the historical SQL schema and JSON response names. */
@Repository
public class TableStore {
    private static final Set<String> TABLES = Set.of("gyms", "users", "user_profiles", "refresh_tokens",
            "membership_types", "user_memberships", "payments", "exercises", "routines", "routine_exercises",
            "gym_classes", "class_bookings", "attendance_records", "inventory_items", "inventory_maintenances",
            "foods", "nutrition_logs", "notifications", "campaigns");
    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;
    private final ObjectMapper json;
    private final Map<String, Map<String, String>> metadata = new ConcurrentHashMap<>();

    public TableStore(JdbcTemplate jdbc, NamedParameterJdbcTemplate named, ObjectMapper json) {
        this.jdbc = jdbc;
        this.named = named;
        this.json = json;
    }

    private Map<String, String> columns(String table) {
        if (!TABLES.contains(table)) throw new IllegalArgumentException("Unsupported table " + table);
        return metadata.computeIfAbsent(table, t -> {
            Map<String, String> result = new HashMap<>();
            jdbc.query("SELECT column_name, udt_name FROM information_schema.columns " +
                            "WHERE table_schema = current_schema() AND table_name = ?", (RowCallbackHandler) rs ->
                    result.put(rs.getString(1), rs.getString(2)), t);
            if (result.isEmpty()) throw new IllegalStateException("La tabla " + t + " no existe. Ejecuta Flyway.");
            return result;
        });
    }

    private String column(String table, String key) {
        String snake = key.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase();
        if (!columns(table).containsKey(snake)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Campo no permitido: " + key);
        }
        return snake;
    }

    private Object sqlValue(String table, String col, Object value) {
        if (value == null) return null;
        String type = columns(table).get(col);
        if ("uuid".equals(type)) return value instanceof UUID ? value : UUID.fromString(value.toString());
        if ("date".equals(type)) return value instanceof java.time.LocalDate date
                ? Date.valueOf(date) : Date.valueOf(value.toString());
        if ("timestamptz".equals(type)) {
            if (value instanceof Timestamp timestamp) return timestamp;
            return Timestamp.from(java.time.OffsetDateTime.parse(value.toString()).toInstant());
        }
        if ("bool".equals(type)) return value instanceof Boolean ? value : Boolean.parseBoolean(value.toString());
        if ("int4".equals(type)) return value instanceof Number n ? n.intValue() : Integer.parseInt(value.toString());
        if ("numeric".equals(type)) return value instanceof java.math.BigDecimal ? value :
                new java.math.BigDecimal(value.toString());
        if ("jsonb".equals(type)) {
            var pg = new PGobject();
            pg.setType("jsonb");
            try {
                pg.setValue(json.writeValueAsString(value));
            } catch (JsonProcessingException | java.sql.SQLException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "JSON inválido");
            }
            return pg;
        }
        return value;
    }

    private MapSqlParameterSource values(String table, Map<String, ?> fields) {
        var params = new MapSqlParameterSource();
        fields.forEach((key, value) -> {
            String col = column(table, key);
            params.addValue(col, sqlValue(table, col, value));
        });
        return params;
    }

    public Map<String, Object> read(String table, UUID id, Actor actor, String tenantColumn) {
        String sql = "SELECT * FROM " + table + " WHERE id=:id AND deleted_at IS NULL";
        var params = new MapSqlParameterSource("id", id);
        if (tenantColumn != null && actor != null && !actor.superAdmin()) {
            sql += " AND " + column(table, tenantColumn) + "=:tenant";
            params.addValue("tenant", actor.requiredGym());
        }
        var result = named.queryForList(sql, params);
        if (result.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Registro no encontrado.");
        return normalize(result.getFirst());
    }

    public Map<String, Object> readOrNull(String table, UUID id) {
        var rows = named.queryForList("SELECT * FROM " + table + " WHERE id=:id AND deleted_at IS NULL",
                new MapSqlParameterSource("id", id));
        return rows.isEmpty() ? null : normalize(rows.getFirst());
    }

    public Map<String, Object> findOne(String table, Map<String, ?> filters, Actor actor, String tenantColumn) {
        var rows = search(table, filters, actor, tenantColumn, "createdAt", "DESC", 1, 1);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public List<Map<String, Object>> search(String table, Map<String, ?> filters, Actor actor, String tenantColumn,
            String sortBy, String sortOrder, int page, int limit) {
        var params = new MapSqlParameterSource();
        String where = where(table, filters, actor, tenantColumn, params);
        String order = column(table, sortBy == null ? "createdAt" : sortBy);
        String direction = "ASC".equalsIgnoreCase(sortOrder) ? "ASC" : "DESC";
        params.addValue("limit", Math.clamp(limit, 1, 100));
        params.addValue("offset", (Math.max(page, 1) - 1) * Math.clamp(limit, 1, 100));
        return named.queryForList("SELECT * FROM " + table + where + " ORDER BY " + order + " " + direction +
                " LIMIT :limit OFFSET :offset", params).stream().map(this::normalize).toList();
    }

    public Map<String, Object> page(String table, Map<String, ?> filters, Actor actor, String tenantColumn,
            String sortBy, String sortOrder, int page, int limit) {
        page = Math.max(1, page);
        limit = Math.clamp(limit, 1, 100);
        var params = new MapSqlParameterSource();
        String where = where(table, filters, actor, tenantColumn, params);
        long total = named.queryForObject("SELECT count(*) FROM " + table + where, params, Long.class);
        int pages = (int) Math.ceil((double) total / limit);
        return Map.of("items", search(table, filters, actor, tenantColumn, sortBy, sortOrder, page, limit),
                "meta", Map.of("total", total, "page", page, "limit", limit, "totalPages", pages,
                        "hasNextPage", page < pages, "hasPreviousPage", page > 1));
    }

    private String where(String table, Map<String, ?> filters, Actor actor, String tenantColumn,
            MapSqlParameterSource params) {
        columns(table);
        StringBuilder where = new StringBuilder(" WHERE deleted_at IS NULL");
        if (tenantColumn != null && actor != null && !actor.superAdmin()) {
            String col = column(table, tenantColumn);
            where.append(" AND ").append(col).append("=:tenant");
            params.addValue("tenant", actor.requiredGym());
        }
        if (filters != null) filters.forEach((key, value) -> {
            if (value == null || "".equals(value)) return;
            String col = column(table, key);
            if ("deleted_at".equals(col) || "password".equals(col))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Filtro no permitido");
            where.append(" AND ").append(col).append("=:").append(col);
            params.addValue(col, sqlValue(table, col, value));
        });
        return where.toString();
    }

    public Map<String, Object> insert(String table, Map<String, ?> fields) {
        var data = new LinkedHashMap<String, Object>();
        fields.forEach((key, value) -> {
            String col = column(table, key);
            if (Set.of("created_at", "updated_at", "deleted_at").contains(col))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Campo no editable: " + key);
            data.put(col, sqlValue(table, col, value));
        });
        if (data.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Faltan datos.");
        var params = new MapSqlParameterSource();
        data.forEach(params::addValue);
        String cols = String.join(",", data.keySet());
        String placeholders = ":" + String.join(",:", data.keySet());
        return normalize(named.queryForMap("INSERT INTO " + table + " (" + cols + ") VALUES (" +
                placeholders + ") RETURNING *", params));
    }

    public Map<String, Object> update(String table, UUID id, Map<String, ?> fields, Actor actor, String tenantColumn) {
        read(table, id, actor, tenantColumn);
        var data = new LinkedHashMap<String, Object>();
        fields.forEach((key, value) -> {
            String col = column(table, key);
            if (Set.of("id", "created_at", "updated_at", "deleted_at", "password", "gym_id").contains(col))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Campo no editable: " + key);
            data.put(col, sqlValue(table, col, value));
        });
        if (data.isEmpty()) return read(table, id, actor, tenantColumn);
        var params = new MapSqlParameterSource("id", id);
        data.forEach(params::addValue);
        var assignments = new ArrayList<String>();
        data.keySet().forEach(col -> assignments.add(col + "=:" + col));
        return normalize(named.queryForMap("UPDATE " + table + " SET " + String.join(",", assignments) +
                ",updated_at=now() WHERE id=:id RETURNING *", params));
    }

    public void softDelete(String table, UUID id, Actor actor, String tenantColumn) {
        read(table, id, actor, tenantColumn);
        named.update("UPDATE " + table + " SET deleted_at=now(),updated_at=now() WHERE id=:id",
                new MapSqlParameterSource("id", id));
    }

    public List<Map<String, Object>> query(String sql, Map<String, ?> params) {
        return named.queryForList(sql, valuesForQuery(params)).stream().map(this::normalize).toList();
    }

    public int execute(String sql, Map<String, ?> params) { return named.update(sql, valuesForQuery(params)); }

    private MapSqlParameterSource valuesForQuery(Map<String, ?> params) {
        var result = new MapSqlParameterSource();
        params.forEach(result::addValue);
        return result;
    }

    private Map<String, Object> normalize(Map<String, Object> source) {
        var out = new LinkedHashMap<String, Object>();
        source.forEach((key, value) -> {
            if (value instanceof PGobject pg && "jsonb".equals(pg.getType())) {
                try { value = json.readValue(pg.getValue(), Object.class); }
                catch (JsonProcessingException e) { throw new IllegalStateException(e); }
            } else if (value instanceof UUID uuid) value = uuid.toString();
            else if (value instanceof Timestamp ts) value = ts.toInstant().toString();
            else if (value instanceof Date date) value = date.toLocalDate().toString();
            else if (value instanceof Instant instant) value = instant.toString();
            String camel = key.replaceAll("_([a-z])", "$1");
            String[] parts = key.split("_");
            if (parts.length > 1) {
                var b = new StringBuilder(parts[0]);
                for (int i = 1; i < parts.length; i++) b.append(Character.toUpperCase(parts[i].charAt(0)))
                        .append(parts[i].substring(1));
                camel = b.toString();
            }
            out.put(camel, value);
        });
        return out;
    }
}
