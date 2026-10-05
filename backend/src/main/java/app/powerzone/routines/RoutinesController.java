package app.powerzone.routines;

import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/routines")
@Tag(name = "Rutinas")
public class RoutinesController {
    private final RoutinesService routines;
    public RoutinesController(RoutinesService routines) { this.routines = routines; }
    private static Actor actor(Authentication auth) { return Actor.from(auth); }
    @GetMapping
    public Map<String, Object> list(@RequestParam Map<String, String> q, Authentication auth) {
        return routines.list(actor(auth), q);
    }
    @GetMapping("/mine")
    public Map<String, Object> mine(@RequestParam Map<String, String> q, Authentication auth) {
        return routines.mine(actor(auth), q);
    }
    @GetMapping("/{id}")
    public Map<String, Object> one(@PathVariable String id, Authentication auth) {
        return routines.one(actor(auth), AuthService.uuid(id));
    }
    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body, Authentication auth) {
        return routines.create(actor(auth), body);
    }
    @PatchMapping("/{id}")
    public Map<String, Object> update(@PathVariable String id, @RequestBody Map<String, Object> body, Authentication auth) {
        return routines.update(actor(auth), AuthService.uuid(id), body);
    }
    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id, Authentication auth) { routines.delete(actor(auth), AuthService.uuid(id)); }
    @PatchMapping("/{id}/assign")
    public Map<String, Object> assign(@PathVariable String id, @RequestBody Map<String, Object> body, Authentication auth) {
        return routines.assign(actor(auth), AuthService.uuid(id),
                AuthService.uuid(AuthService.required(body, "userId")));
    }
    @PostMapping("/generate")
    public Map<String, Object> generate(@RequestBody Map<String, Object> body, Authentication auth) {
        return routines.generate(actor(auth), body);
    }
}
