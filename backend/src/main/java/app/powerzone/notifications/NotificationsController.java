package app.powerzone.notifications;

import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@Tag(name = "Notificaciones")
public class NotificationsController {
    private final NotificationsService service;
    public NotificationsController(NotificationsService service) { this.service = service; }
    @PostMapping public Map<String, Object> create(@RequestBody Map<String, Object> body, Authentication auth) {
        return service.create(Actor.from(auth), body, false);
    }
    @PostMapping("/message") public Map<String, Object> message(@RequestBody Map<String, Object> body, Authentication auth) {
        return service.create(Actor.from(auth), body, true);
    }
    @GetMapping("/mine") public Map<String, Object> mine(@RequestParam Map<String, String> q, Authentication auth) {
        return service.mine(Actor.from(auth), q);
    }
    @GetMapping("/unread-count") public Map<String, Object> unread(Authentication auth) {
        return service.unread(Actor.from(auth));
    }
    @PatchMapping("/read-all") public Map<String, Object> readAll(Authentication auth) {
        return service.readAll(Actor.from(auth));
    }
    @PatchMapping("/{id}/read") public Map<String, Object> read(@PathVariable String id, Authentication auth) {
        return service.read(Actor.from(auth), AuthService.uuid(id));
    }
    @DeleteMapping("/{id}") public Map<String, String> remove(@PathVariable String id, Authentication auth) {
        service.remove(Actor.from(auth), AuthService.uuid(id)); return Map.of("message", "Notificación eliminada.");
    }
}
