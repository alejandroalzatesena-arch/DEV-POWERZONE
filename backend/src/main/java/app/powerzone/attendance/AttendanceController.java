package app.powerzone.attendance;

import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/attendance")
@Tag(name = "Asistencia")
public class AttendanceController {
    private final AttendanceService attendance;
    public AttendanceController(AttendanceService attendance) { this.attendance = attendance; }
    private static Actor actor(Authentication auth) { return Actor.from(auth); }
    @PostMapping("/check-in/{userId}")
    public Map<String, Object> checkIn(@PathVariable String userId, @RequestBody Map<String, Object> body, Authentication auth) {
        return attendance.checkIn(actor(auth), AuthService.uuid(userId), String.valueOf(body.getOrDefault("method", "member_card")));
    }
    @PostMapping("/check-out/{userId}")
    public Map<String, Object> checkOut(@PathVariable String userId, @RequestBody Map<String, Object> body, Authentication auth) {
        return attendance.checkOut(actor(auth), AuthService.uuid(userId), String.valueOf(body.getOrDefault("method", "member_card")));
    }
    @PostMapping("/class")
    public Map<String, Object> recordClass(@RequestBody Map<String, Object> body, Authentication auth) {
        return attendance.recordClass(actor(auth), AuthService.uuid(AuthService.required(body, "classId")),
                String.valueOf(body.getOrDefault("method", "manual")));
    }
    @GetMapping("/history")
    public Map<String, Object> history(@RequestParam Map<String, String> q, Authentication auth) {
        return attendance.history(actor(auth), q, false);
    }
    @GetMapping("/my")
    public Map<String, Object> mine(@RequestParam Map<String, String> q, Authentication auth) {
        return attendance.history(actor(auth), q, true);
    }
    @GetMapping("/occupancy/{gymId}")
    public Map<String, Object> occupancy(@PathVariable String gymId, Authentication auth) {
        return attendance.occupancy(actor(auth), AuthService.uuid(gymId));
    }
}
