package app.powerzone.marketing;

import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/marketing")
@Tag(name = "Marketing")
public class MarketingController {
    private final MarketingService service;
    public MarketingController(MarketingService service) { this.service = service; }
    @PostMapping("/campaigns") public Map<String, Object> create(@RequestBody Map<String, Object> body, Authentication auth) {
        return service.create(Actor.from(auth), body);
    }
    @GetMapping("/campaigns") public Map<String, Object> list(@RequestParam Map<String, String> q, Authentication auth) {
        return service.list(Actor.from(auth), q);
    }
    @GetMapping("/campaigns/{id}") public Map<String, Object> one(@PathVariable String id, Authentication auth) {
        return service.one(Actor.from(auth), AuthService.uuid(id));
    }
    @PatchMapping("/campaigns/{id}") public Map<String, Object> update(@PathVariable String id,
            @RequestBody Map<String, Object> body, Authentication auth) {
        return service.update(Actor.from(auth), AuthService.uuid(id), body);
    }
    @DeleteMapping("/campaigns/{id}") public Map<String, String> remove(@PathVariable String id, Authentication auth) {
        service.remove(Actor.from(auth), AuthService.uuid(id)); return Map.of("message", "Campaña eliminada.");
    }
    @PostMapping("/campaigns/{id}/send") public Map<String, Object> send(@PathVariable String id, Authentication auth) {
        return service.send(Actor.from(auth), AuthService.uuid(id));
    }
    @PostMapping("/campaigns/{id}/cancel") public Map<String, Object> cancel(@PathVariable String id, Authentication auth) {
        return service.cancel(Actor.from(auth), AuthService.uuid(id));
    }
}
