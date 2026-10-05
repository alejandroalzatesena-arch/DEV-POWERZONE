package app.powerzone.payments;

import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import app.powerzone.common.CrudService;
import app.powerzone.common.TableStore;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PaymentsService {
    private final TableStore db;
    private final CrudService crud;
    private final String stripeKey;
    private final String webhookSecret;
    public PaymentsService(TableStore db, CrudService crud,
            @Value("${powerzone.stripe.secret-key}") String stripeKey,
            @Value("${powerzone.stripe.webhook-secret}") String webhookSecret) {
        this.db = db; this.crud = crud; this.stripeKey = stripeKey; this.webhookSecret = webhookSecret;
    }
    public Map<String, Object> list(Actor actor, Map<String, String> q) {
        actor.require("admin", "receptionist");
        return enrichPage(crud.list("payments", actor, "gymId", q, Set.of("status", "userId")));
    }
    public Map<String, Object> mine(Actor actor, Map<String, String> q) {
        var filters = new LinkedHashMap<>(q); filters.put("userId", actor.id().toString());
        return enrichPage(crud.list("payments", actor, "gymId", filters, Set.of("status", "userId")));
    }
    public Map<String, Object> one(Actor actor, UUID id) {
        var payment = db.read("payments", id, actor, "gymId");
        if ("client".equals(actor.role()) && !actor.id().toString().equals(payment.get("userId")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return enrich(payment);
    }
    public Map<String, Object> create(Actor actor, Map<String, Object> body) {
        actor.require("admin", "receptionist");
        UUID userId = AuthService.uuid(AuthService.required(body, "userId"));
        var user = db.read("users", userId, actor, "gymId");
        var input = new LinkedHashMap<String, Object>();
        input.put("gymId", user.get("gymId")); input.put("userId", userId);
        input.put("amount", body.get("amount")); input.put("currency", body.getOrDefault("currency", "usd"));
        input.put("status", "succeeded"); input.put("paymentMethod", body.getOrDefault("paymentMethod", "cash"));
        input.put("paidAt", java.sql.Timestamp.from(Instant.now()));
        for (String key : Set.of("membershipTypeId", "transactionId", "metadata"))
            if (body.get(key) != null) input.put(key, body.get(key));
        return enrich(db.insert("payments", input));
    }
    @Transactional
    public Map<String, Object> checkout(Actor actor, Map<String, Object> body) {
        actor.require("client", "admin");
        UUID payerId = actor.id();
        if (body.get("userId") != null) {
            UUID requested = AuthService.uuid(body.get("userId"));
            if ("client".equals(actor.role()) && !requested.equals(actor.id()))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN);
            payerId = requested;
        }
        var user = db.read("users", payerId, actor, "gymId");
        UUID typeId = AuthService.uuid(AuthService.required(body, "membershipTypeId"));
        var type = db.read("membership_types", typeId, actor, "gymId");
        if (!user.get("gymId").equals(type.get("gymId")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El plan pertenece a otra sucursal.");
        var payment = db.insert("payments", Map.of("gymId", user.get("gymId"), "userId", payerId,
                "membershipTypeId", typeId, "amount", type.get("price"), "currency", type.get("currency"),
                "status", "pending", "paymentMethod", stripeKey.isBlank() ? "cash" : "stripe"));
        String paymentId = String.valueOf(payment.get("id"));
        if (stripeKey.isBlank()) return Map.of("url", "/api/payments/mock-checkout/" + paymentId,
                "paymentId", paymentId);
        Stripe.apiKey = stripeKey;
        try {
            long cents = new BigDecimal(type.get("price").toString()).movePointRight(2).longValueExact();
            var params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setCustomerEmail(String.valueOf(user.get("email")))
                    .setSuccessUrl(String.valueOf(body.getOrDefault("successUrl", "http://localhost:4200/payments/my")))
                    .setCancelUrl(String.valueOf(body.getOrDefault("cancelUrl", "http://localhost:4200/payments/my")))
                    .putMetadata("paymentId", paymentId)
                    .addLineItem(SessionCreateParams.LineItem.builder().setQuantity(1L)
                            .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                    .setCurrency(String.valueOf(type.get("currency")))
                                    .setUnitAmount(cents)
                                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                            .setName(String.valueOf(type.get("name"))).build()).build()).build())
                    .build();
            Session session = Session.create(params);
            db.execute("UPDATE payments SET stripe_checkout_session_id=:session WHERE id=:id",
                    Map.of("session", session.getId(), "id", AuthService.uuid(paymentId)));
            return Map.of("url", session.getUrl(), "paymentId", paymentId);
        } catch (StripeException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo iniciar el pago con Stripe.", ex);
        }
    }
    @Transactional
    public Map<String, Object> mockConfirm(Actor actor, UUID paymentId) {
        if (!stripeKey.isBlank()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        var payment = one(actor, paymentId);
        confirm(paymentId, null);
        return one(actor, paymentId);
    }
    @Transactional
    public void webhook(String payload, String signature) {
        if (stripeKey.isBlank() || webhookSecret.isBlank())
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Stripe no está configurado.");
        try {
            Event event = Webhook.constructEvent(payload, signature, webhookSecret);
            if (!"checkout.session.completed".equals(event.getType())) return;
            Session session = (Session) event.getDataObjectDeserializer().getObject().orElseThrow();
            String id = session.getMetadata().get("paymentId");
            if (id != null) confirm(AuthService.uuid(id), session.getId());
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Webhook de Stripe inválido.", ex);
        }
    }
    private void confirm(UUID id, String sessionId) {
        var locked = db.query("SELECT * FROM payments WHERE id=:id AND deleted_at IS NULL FOR UPDATE", Map.of("id", id));
        if (locked.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Pago no encontrado.");
        var payment = locked.getFirst();
        if ("succeeded".equals(payment.get("status"))) return;
        if (sessionId != null && !sessionId.equals(payment.get("stripeCheckoutSessionId")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La sesión no corresponde al pago.");
        db.execute("UPDATE payments SET status='succeeded',paid_at=now(),updated_at=now() WHERE id=:id", Map.of("id", id));
        if (payment.get("membershipTypeId") == null) return;
        var type = db.read("membership_types", AuthService.uuid(payment.get("membershipTypeId")), null, null);
        UUID userId = AuthService.uuid(payment.get("userId"));
        UUID gymId = AuthService.uuid(payment.get("gymId"));
        db.execute("UPDATE user_memberships SET status='cancelled',updated_at=now() WHERE user_id=:userId " +
                "AND gym_id=:gymId AND status='active' AND deleted_at IS NULL", Map.of("userId", userId, "gymId", gymId));
        LocalDate start = LocalDate.now();
        db.insert("user_memberships", Map.of("gymId", gymId, "userId", userId,
                "membershipTypeId", payment.get("membershipTypeId"), "startDate", start,
                "endDate", start.plusDays(((Number) type.get("durationDays")).longValue()),
                "status", "active", "price", payment.get("amount")));
    }
    private Map<String, Object> enrich(Map<String, Object> row) {
        var result = new LinkedHashMap<>(row);
        var user = db.readOrNull("users", AuthService.uuid(row.get("userId")));
        if (user != null) result.put("user", AuthService.publicUser(user));
        return result;
    }
    private Map<String, Object> enrichPage(Map<String, Object> page) {
        @SuppressWarnings("unchecked") var rows = (List<Map<String, Object>>) page.get("items");
        return Map.of("items", rows.stream().map(this::enrich).toList(), "meta", page.get("meta"));
    }
}
