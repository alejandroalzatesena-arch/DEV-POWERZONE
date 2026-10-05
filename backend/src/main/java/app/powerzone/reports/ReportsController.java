package app.powerzone.reports;

import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@Tag(name = "Reportes")
public class ReportsController {
    private final ReportsService reports;
    public ReportsController(ReportsService reports) { this.reports = reports; }
    @GetMapping("/financial") public Map<String, Object> financial(@RequestParam Map<String, String> q, Authentication auth) {
        return reports.financial(Actor.from(auth), q);
    }
    @GetMapping("/operational") public Map<String, Object> operational(Authentication auth) {
        return reports.operational(Actor.from(auth));
    }
    @GetMapping("/memberships") public Map<String, Object> memberships(Authentication auth) {
        return reports.memberships(Actor.from(auth));
    }
    @GetMapping("/attendance") public Map<String, Object> attendance(@RequestParam Map<String, String> q, Authentication auth) {
        return reports.attendance(Actor.from(auth), q);
    }
    @GetMapping("/progress/{userId}") public Map<String, Object> progress(@PathVariable String userId, Authentication auth) {
        return reports.progress(Actor.from(auth), AuthService.uuid(userId));
    }
}
