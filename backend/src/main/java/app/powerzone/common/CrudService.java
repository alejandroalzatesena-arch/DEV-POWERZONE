package app.powerzone.common;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CrudService {
    private final TableStore db;
    public CrudService(TableStore db) { this.db = db; }

    public Map<String, Object> list(String table, Actor actor, String tenant, Map<String, String> query,
            Set<String> allowedFilters) {
        var filters = new HashMap<String, Object>();
        allowedFilters.forEach(key -> {
            if (query.get(key) != null && !query.get(key).isBlank()) filters.put(key, query.get(key));
        });
        return db.page(table, filters, actor, tenant, query.getOrDefault("sortBy", "createdAt"),
                query.getOrDefault("sortOrder", "DESC"), number(query.get("page"), 1), number(query.get("limit"), 20));
    }

    public Map<String, Object> create(String table, Actor actor, String tenant, Map<String, Object> input) {
        var body = new LinkedHashMap<>(input);
        if (tenant != null) {
            if (actor.superAdmin()) {
                if (!body.containsKey(tenant))
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Falta el gimnasio.");
            } else {
                if (body.containsKey(tenant) && !actor.requiredGym().toString().equals(body.get(tenant).toString()))
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No puedes crear datos de otra sucursal.");
                body.put(tenant, actor.requiredGym());
            }
        }
        body.remove("id");
        return db.insert(table, body);
    }

    public Map<String, Object> update(String table, UUID id, Actor actor, String tenant, Map<String, Object> body) {
        return db.update(table, id, body, actor, tenant);
    }

    public void delete(String table, UUID id, Actor actor, String tenant) { db.softDelete(table, id, actor, tenant); }

    public static int number(String value, int defaultValue) {
        if (value == null || value.isBlank()) return defaultValue;
        try { return Integer.parseInt(value); }
        catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Número inválido.");
        }
    }
}
