package app.powerzone.users;

import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import app.powerzone.common.CrudService;
import app.powerzone.common.TableStore;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users")
@Tag(name = "Usuarios")
public class UsersController {
    private final TableStore db;
    private final CrudService crud;
    private final PasswordEncoder passwords;
    public UsersController(TableStore db, CrudService crud, PasswordEncoder passwords) {
        this.db = db; this.crud = crud; this.passwords = passwords;
    }
    private static Actor actor(Authentication auth) { return Actor.from(auth); }
    private static UUID id(String value) { return AuthService.uuid(value); }

    @GetMapping
    public Map<String, Object> list(@RequestParam Map<String, String> q, Authentication auth) {
        Actor actor = actor(auth); actor.require("admin", "trainer", "receptionist");
        var page = crud.list("users", actor, "gymId", q, Set.of("role", "isActive", "gymId"));
        @SuppressWarnings("unchecked") var rows = (List<Map<String, Object>>) page.get("items");
        return Map.of("items", rows.stream().map(AuthService::publicUser).toList(), "meta", page.get("meta"));
    }

    @GetMapping("/{id}")
    public Map<String, Object> one(@PathVariable String id, Authentication auth) {
        Actor actor = actor(auth); actor.requireSelfOrStaff(id(id));
        return AuthService.publicUser(db.read("users", id(id), actor, "gymId"));
    }

    @PostMapping
    @Transactional
    public Map<String, Object> create(@RequestBody Map<String, Object> body, Authentication auth) {
        Actor actor = actor(auth); actor.require("admin");
        if (body.containsKey("isSuperAdmin")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        var input = new LinkedHashMap<String, Object>();
        for (String field : List.of("email", "firstName", "lastName", "role", "phone", "gender", "birthDate", "isActive", "gymId"))
            if (body.containsKey(field)) input.put(field, body.get(field));
        input.put("email", AuthService.required(body, "email").toLowerCase());
        input.put("firstName", AuthService.required(body, "firstName"));
        input.put("lastName", AuthService.required(body, "lastName"));
        input.put("password", passwords.encode(AuthService.required(body, "password")));
        input.putIfAbsent("role", "client");
        var created = crud.create("users", actor, "gymId", input);
        var profile = new LinkedHashMap<String, Object>();
        for (String field : List.of("heightCm", "weightKg", "goal", "activityLevel"))
            if (body.get(field) != null) profile.put(field, body.get(field));
        if (!profile.isEmpty()) {
            profile.put("userId", created.get("id"));
            db.insert("user_profiles", profile);
        }
        return AuthService.publicUser(created);
    }

    @PatchMapping("/{id}")
    public Map<String, Object> update(@PathVariable String id, @RequestBody Map<String, Object> body, Authentication auth) {
        Actor actor = actor(auth); actor.require("admin");
        if (body.containsKey("isSuperAdmin") && !actor.superAdmin())
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        var input = new LinkedHashMap<String, Object>();
        for (String field : List.of("firstName", "lastName", "phone", "gender", "birthDate", "avatarUrl", "role", "isActive"))
            if (body.containsKey(field)) input.put(field, body.get(field));
        return AuthService.publicUser(crud.update("users", id(id), actor, "gymId", input));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id, Authentication auth) {
        Actor actor = actor(auth); actor.require("admin");
        if (actor.id().equals(id(id))) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No puedes borrar tu cuenta.");
        crud.delete("users", id(id), actor, "gymId");
    }

    @GetMapping("/me/profile")
    public Map<String, Object> myProfile(Authentication auth) { return profile(actor(auth).id(), actor(auth)); }
    @PatchMapping("/me/profile")
    public Map<String, Object> updateMyProfile(@RequestBody Map<String, Object> body, Authentication auth) {
        return updateProfile(actor(auth).id(), body, actor(auth));
    }
    @GetMapping("/{id}/profile")
    public Map<String, Object> profile(@PathVariable String id, Authentication auth) {
        return profile(id(id), actor(auth));
    }
    @PatchMapping("/{id}/profile")
    public Map<String, Object> updateProfile(@PathVariable String id, @RequestBody Map<String, Object> body, Authentication auth) {
        return updateProfile(id(id), body, actor(auth));
    }

    private Map<String, Object> profile(UUID userId, Actor actor) {
        actor.requireSelfOrStaff(userId);
        db.read("users", userId, actor, "gymId");
        var found = db.findOne("user_profiles", Map.of("userId", userId), null, null);
        return found == null ? db.insert("user_profiles", Map.of("userId", userId)) : found;
    }
    private Map<String, Object> updateProfile(UUID userId, Map<String, Object> body, Actor actor) {
        var existing = profile(userId, actor);
        var input = new LinkedHashMap<String, Object>();
        for (String field : List.of("heightCm", "weightKg", "bodyFatPct", "goal", "activityLevel",
                "medicalConditions", "emergencyContactName", "emergencyContactPhone"))
            if (body.containsKey(field)) input.put(field, body.get(field));
        return db.update("user_profiles", id(String.valueOf(existing.get("id"))), input, null, null);
    }
}
