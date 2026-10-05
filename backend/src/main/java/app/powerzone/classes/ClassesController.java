package app.powerzone.classes;

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
@RequestMapping("/api/classes")
@Tag(name = "Clases y reservas")
public class ClassesController {
    private final ClassesService classes;
    public ClassesController(ClassesService classes) { this.classes = classes; }
    private static Actor actor(Authentication auth) { return Actor.from(auth); }
    @GetMapping
    public Map<String, Object> list(@RequestParam Map<String, String> q, Authentication auth) {
        return classes.list(actor(auth), q);
    }
    @GetMapping("/upcoming")
    public Map<String, Object> upcoming(@RequestParam Map<String, String> q, Authentication auth) {
        return classes.upcoming(actor(auth), q);
    }
    @GetMapping("/bookings/me")
    public Map<String, Object> mine(@RequestParam Map<String, String> q, Authentication auth) {
        return classes.myBookings(actor(auth), q);
    }
    @GetMapping("/bookings/{classId}")
    public Map<String, Object> bookings(@PathVariable String classId, @RequestParam Map<String, String> q, Authentication auth) {
        return classes.bookings(actor(auth), AuthService.uuid(classId), q);
    }
    @GetMapping("/{id}")
    public Map<String, Object> one(@PathVariable String id, Authentication auth) {
        return classes.one(actor(auth), AuthService.uuid(id));
    }
    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body, Authentication auth) {
        return classes.create(actor(auth), body);
    }
    @PatchMapping("/{id}")
    public Map<String, Object> update(@PathVariable String id, @RequestBody Map<String, Object> body, Authentication auth) {
        return classes.update(actor(auth), AuthService.uuid(id), body);
    }
    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id, Authentication auth) { classes.delete(actor(auth), AuthService.uuid(id)); }
    @PostMapping("/{id}/book")
    public Map<String, Object> book(@PathVariable String id, @RequestBody Map<String, Object> body, Authentication auth) {
        return classes.book(actor(auth), AuthService.uuid(id), !Boolean.FALSE.equals(body.get("allowWaitlist")));
    }
    @DeleteMapping("/{id}/book")
    public void cancel(@PathVariable String id, Authentication auth) { classes.cancelBooking(actor(auth), AuthService.uuid(id)); }
    @PatchMapping("/{id}/attendance")
    public Map<String, Object> attendance(@PathVariable String id, @RequestBody Map<String, Object> body, Authentication auth) {
        return classes.markAttendance(actor(auth), AuthService.uuid(id),
                AuthService.uuid(AuthService.required(body, "userId")), !Boolean.FALSE.equals(body.get("attended")));
    }
}
