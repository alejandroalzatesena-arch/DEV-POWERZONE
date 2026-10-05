package app.powerzone.catalog;

import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import app.powerzone.common.CrudService;
import app.powerzone.common.TableStore;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@Tag(name = "Catálogos y operación")
public class CatalogController {
    private final CrudService crud;
    private final TableStore db;
    public CatalogController(CrudService crud, TableStore db) { this.crud = crud; this.db = db; }
    private static Actor actor(Authentication auth) { return Actor.from(auth); }
    private static UUID id(String value) { return AuthService.uuid(value); }

    @GetMapping("/api/gyms")
    @Operation(summary = "Listar gimnasios")
    public Map<String, Object> gyms(@RequestParam Map<String, String> q) {
        return crud.list("gyms", null, null, q, Set.of("isActive", "city"));
    }
    @GetMapping("/api/gyms/{id}")
    public Map<String, Object> gym(@PathVariable String id) { return db.read("gyms", id(id), null, null); }
    @PostMapping("/api/gyms")
    public Map<String, Object> createGym(@RequestBody Map<String, Object> body, Authentication auth) {
        if (!actor(auth).superAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return crud.create("gyms", actor(auth), null, body);
    }
    @PatchMapping("/api/gyms/{id}")
    public Map<String, Object> updateGym(@PathVariable String id, @RequestBody Map<String, Object> body, Authentication auth) {
        if (!actor(auth).superAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return crud.update("gyms", id(id), actor(auth), null, body);
    }
    @DeleteMapping("/api/gyms/{id}")
    public void deleteGym(@PathVariable String id, Authentication auth) {
        if (!actor(auth).superAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        crud.delete("gyms", id(id), actor(auth), null);
    }

    @GetMapping("/api/exercises")
    public Map<String, Object> exercises(@RequestParam Map<String, String> q, Authentication auth) {
        actor(auth);
        return crud.list("exercises", null, null, q, Set.of("category", "muscleGroup", "isActive"));
    }
    @GetMapping("/api/exercises/{id}")
    public Map<String, Object> exercise(@PathVariable String id, Authentication auth) {
        actor(auth); return db.read("exercises", id(id), null, null);
    }
    @PostMapping("/api/exercises")
    public Map<String, Object> createExercise(@RequestBody Map<String, Object> body, Authentication auth) {
        actor(auth).require("admin", "trainer"); return crud.create("exercises", actor(auth), null, body);
    }
    @PatchMapping("/api/exercises/{id}")
    public Map<String, Object> updateExercise(@PathVariable String id, @RequestBody Map<String, Object> body, Authentication auth) {
        actor(auth).require("admin", "trainer"); return crud.update("exercises", id(id), actor(auth), null, body);
    }
    @DeleteMapping("/api/exercises/{id}")
    public void deleteExercise(@PathVariable String id, Authentication auth) {
        actor(auth).require("admin"); crud.delete("exercises", id(id), actor(auth), null);
    }

    @GetMapping("/api/inventory")
    public Map<String, Object> inventory(@RequestParam Map<String, String> q, Authentication auth) {
        actor(auth).require("admin", "trainer", "receptionist");
        return crud.list("inventory_items", actor(auth), "gymId", q, Set.of("category", "status"));
    }
    @GetMapping("/api/inventory/{id}")
    public Map<String, Object> item(@PathVariable String id, Authentication auth) {
        actor(auth).require("admin", "trainer", "receptionist");
        return db.read("inventory_items", id(id), actor(auth), "gymId");
    }
    @PostMapping("/api/inventory")
    public Map<String, Object> createItem(@RequestBody Map<String, Object> body, Authentication auth) {
        actor(auth).require("admin", "trainer");
        var input = new LinkedHashMap<>(body);
        input.putIfAbsent("availableQuantity", body.getOrDefault("quantity", 0));
        return crud.create("inventory_items", actor(auth), "gymId", input);
    }
    @PatchMapping("/api/inventory/{id}")
    public Map<String, Object> updateItem(@PathVariable String id, @RequestBody Map<String, Object> body, Authentication auth) {
        actor(auth).require("admin", "trainer");
        return crud.update("inventory_items", id(id), actor(auth), "gymId", body);
    }
    @DeleteMapping("/api/inventory/{id}")
    public void deleteItem(@PathVariable String id, Authentication auth) {
        actor(auth).require("admin"); crud.delete("inventory_items", id(id), actor(auth), "gymId");
    }
    @GetMapping("/api/inventory/{id}/maintenance")
    public Map<String, Object> maintenance(@PathVariable String id, Authentication auth) {
        actor(auth).require("admin", "trainer", "receptionist");
        db.read("inventory_items", id(id), actor(auth), "gymId");
        return db.page("inventory_maintenances", Map.of("itemId", id(id)), null, null, "scheduledAt", "DESC", 1, 100);
    }
    @PostMapping("/api/inventory/{id}/maintenance")
    public Map<String, Object> createMaintenance(@PathVariable String id, @RequestBody Map<String, Object> body, Authentication auth) {
        actor(auth).require("admin", "trainer");
        db.read("inventory_items", id(id), actor(auth), "gymId");
        var input = new LinkedHashMap<>(body); input.put("itemId", id(id));
        return db.insert("inventory_maintenances", input);
    }
    @PatchMapping("/api/inventory/maintenance/{maintenanceId}")
    public Map<String, Object> updateMaintenance(@PathVariable String maintenanceId, @RequestBody Map<String, Object> body, Authentication auth) {
        actor(auth).require("admin", "trainer");
        var row = db.read("inventory_maintenances", id(maintenanceId), null, null);
        db.read("inventory_items", id(String.valueOf(row.get("itemId"))), actor(auth), "gymId");
        return db.update("inventory_maintenances", id(maintenanceId), body, null, null);
    }
    @DeleteMapping("/api/inventory/maintenance/{maintenanceId}")
    public void deleteMaintenance(@PathVariable String maintenanceId, Authentication auth) {
        actor(auth).require("admin", "trainer");
        var row = db.read("inventory_maintenances", id(maintenanceId), null, null);
        db.read("inventory_items", id(String.valueOf(row.get("itemId"))), actor(auth), "gymId");
        db.softDelete("inventory_maintenances", id(maintenanceId), null, null);
    }
}
