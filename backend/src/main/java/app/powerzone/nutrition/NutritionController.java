package app.powerzone.nutrition;

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
@RequestMapping("/api/nutrition")
@Tag(name = "Nutrición")
public class NutritionController {
    private final NutritionService nutrition;
    public NutritionController(NutritionService nutrition) { this.nutrition = nutrition; }
    private static Actor actor(Authentication auth) { return Actor.from(auth); }
    @GetMapping("/foods")
    public Map<String, Object> foods(@RequestParam Map<String, String> q) { return nutrition.foods(q); }
    @PostMapping("/foods")
    public Map<String, Object> createFood(@RequestBody Map<String, Object> body, Authentication auth) {
        return nutrition.createFood(actor(auth), body);
    }
    @PatchMapping("/foods/{id}")
    public Map<String, Object> updateFood(@PathVariable String id, @RequestBody Map<String, Object> body, Authentication auth) {
        return nutrition.updateFood(actor(auth), AuthService.uuid(id), body);
    }
    @DeleteMapping("/foods/{id}")
    public Map<String, String> deleteFood(@PathVariable String id, Authentication auth) {
        nutrition.deleteFood(actor(auth), AuthService.uuid(id)); return Map.of("message", "Alimento eliminado.");
    }
    @GetMapping("/logs")
    public Map<String, Object> logs(@RequestParam Map<String, String> q, Authentication auth) {
        return nutrition.logs(actor(auth), q);
    }
    @PostMapping("/logs")
    public Map<String, Object> createLog(@RequestBody Map<String, Object> body, Authentication auth) {
        return nutrition.createLog(actor(auth), body);
    }
    @GetMapping("/logs/{id}")
    public Map<String, Object> one(@PathVariable String id, Authentication auth) {
        return nutrition.one(actor(auth), AuthService.uuid(id));
    }
    @DeleteMapping("/logs/{id}")
    public Map<String, String> deleteLog(@PathVariable String id, Authentication auth) {
        nutrition.deleteLog(actor(auth), AuthService.uuid(id)); return Map.of("message", "Registro eliminado.");
    }
    @GetMapping("/summary/daily")
    public Map<String, Object> daily(@RequestParam(required = false) String date,
            @RequestParam(required = false) String userId, Authentication auth) {
        return nutrition.daily(actor(auth), date, userId == null ? null : AuthService.uuid(userId));
    }
}
