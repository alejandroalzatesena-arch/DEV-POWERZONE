package app.powerzone.payments;

import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
@Tag(name = "Pagos")
public class PaymentsController {
    private final PaymentsService payments;
    public PaymentsController(PaymentsService payments) { this.payments = payments; }
    private static Actor actor(Authentication auth) { return Actor.from(auth); }
    @GetMapping
    public Map<String, Object> list(@RequestParam Map<String, String> q, Authentication auth) {
        return payments.list(actor(auth), q);
    }
    @GetMapping("/my")
    public Map<String, Object> mine(@RequestParam Map<String, String> q, Authentication auth) {
        return payments.mine(actor(auth), q);
    }
    @GetMapping("/{id}")
    public Map<String, Object> one(@PathVariable String id, Authentication auth) {
        return payments.one(actor(auth), AuthService.uuid(id));
    }
    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body, Authentication auth) {
        return payments.create(actor(auth), body);
    }
    @PostMapping("/checkout")
    public Map<String, Object> checkout(@RequestBody Map<String, Object> body, Authentication auth) {
        return payments.checkout(actor(auth), body);
    }
    @PostMapping("/mock-checkout/{id}/confirm")
    public Map<String, Object> mockConfirm(@PathVariable String id, Authentication auth) {
        return payments.mockConfirm(actor(auth), AuthService.uuid(id));
    }
    @PostMapping("/webhook/stripe")
    public Map<String, Boolean> webhook(@RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String signature) {
        payments.webhook(payload, signature); return Map.of("received", true);
    }
}
