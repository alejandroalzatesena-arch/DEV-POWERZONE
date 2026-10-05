package app.powerzone.memberships;

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
@RequestMapping("/api/memberships")
@Tag(name = "Membresías")
public class MembershipsController {
    private final MembershipsService memberships;
    public MembershipsController(MembershipsService memberships) { this.memberships = memberships; }
    private static Actor actor(Authentication auth) { return Actor.from(auth); }

    @GetMapping("/types")
    public Map<String, Object> types(@RequestParam Map<String, String> q, Authentication auth) {
        return memberships.types(actor(auth), q);
    }
    @PostMapping("/types")
    public Map<String, Object> createType(@RequestBody Map<String, Object> body, Authentication auth) {
        return memberships.createType(actor(auth), body);
    }
    @PatchMapping("/types/{id}")
    public Map<String, Object> updateType(@PathVariable String id, @RequestBody Map<String, Object> body, Authentication auth) {
        return memberships.updateType(actor(auth), AuthService.uuid(id), body);
    }
    @DeleteMapping("/types/{id}")
    public void deleteType(@PathVariable String id, Authentication auth) {
        memberships.deleteType(actor(auth), AuthService.uuid(id));
    }
    @GetMapping
    public Map<String, Object> list(@RequestParam Map<String, String> q, Authentication auth) {
        return memberships.list(actor(auth), q);
    }
    @GetMapping("/my")
    public Map<String, Object> mine(Authentication auth) { return memberships.mine(actor(auth)); }
    @PostMapping("/assign")
    public Map<String, Object> assign(@RequestBody Map<String, Object> body, Authentication auth) {
        return memberships.assign(actor(auth), body);
    }
    @PatchMapping("/assign/{id}/renew")
    public Map<String, Object> renew(@PathVariable String id, Authentication auth) {
        return memberships.renew(actor(auth), AuthService.uuid(id));
    }
    @PatchMapping("/assign/{id}/cancel")
    public Map<String, Object> cancel(@PathVariable String id, Authentication auth) {
        return memberships.cancel(actor(auth), AuthService.uuid(id));
    }
}
