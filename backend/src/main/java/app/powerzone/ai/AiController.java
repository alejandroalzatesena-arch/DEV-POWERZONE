package app.powerzone.ai;

import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai-proxy")
@Tag(name = "Asistente y recomendaciones")
public class AiController {
    private final AiService ai;
    public AiController(AiService ai) { this.ai = ai; }
    @GetMapping("/health")
    public Map<String, String> health() { return ai.health(); }
    @PostMapping("/chat")
    public Map<String, Object> chat(@RequestBody Map<String, Object> body, Authentication auth) {
        return ai.chat(Actor.from(auth), String.valueOf(body.getOrDefault("sessionId", "general")),
                AuthService.required(body, "message"));
    }
    @PostMapping("/routines/generate")
    public Map<String, Object> routine(@RequestBody Map<String, Object> body, Authentication auth) {
        return ai.routine(Actor.from(auth), body);
    }
    @PostMapping("/recommendations/workout")
    public Map<String, Object> workout(@RequestBody Map<String, Object> body, Authentication auth) {
        return ai.recommendation(Actor.from(auth), AuthService.uuid(AuthService.required(body, "userId")), "workout");
    }
    @PostMapping("/recommendations/nutrition")
    public Map<String, Object> nutrition(@RequestBody Map<String, Object> body, Authentication auth) {
        return ai.recommendation(Actor.from(auth), AuthService.uuid(AuthService.required(body, "userId")), "nutrition");
    }
}
