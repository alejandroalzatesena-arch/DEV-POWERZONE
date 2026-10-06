# Decisión de arquitectura: monolito modular + servicio de IA

## Contexto

Power Zone necesita mantener 107 operaciones HTTP ya documentadas, datos PostgreSQL existentes, una interfaz Angular y tareas de IA en Python. Separar cada dominio en un microservicio introduciría contratos internos, coordinación de transacciones y despliegues adicionales sin una necesidad demostrada de escalado independiente.

## Decisión

- **Angular 22** es el cliente web. Consume `/api` en el mismo origen mediante el proxy local o Nginx y abre `/api/ws` para notificaciones y aforo.
- **Spring Boot 3.5 / Java 21** concentra las reglas de negocio en módulos por dominio. Cada módulo expone controladores y servicios; `TableStore` es el adaptador JDBC que conserva el esquema y los nombres JSON de la API anterior.
- **PostgreSQL 16** es la fuente de verdad. Flyway versiona migraciones. Las operaciones de reservas, asistencia, pagos y campañas que modifican varios registros usan transacciones y bloqueos de fila.
- **FastAPI / Python 3.12** es un proceso independiente, invocado por Spring Boot con `X-AI-Key`. El navegador nunca llama directamente a FastAPI. Su implementación actual usa reglas deterministas; puede evolucionar a un proveedor de modelos sin modificar la API pública.
- **Swagger / OpenAPI** se genera desde Spring y recupera resúmenes, cuerpos, respuestas y esquemas del contrato heredado. `scripts/verify-api-contract.py` comprueba la cobertura de rutas.

## Límites y patrones

La arquitectura es **por capas dentro de un monolito modular**: controlador → servicio de dominio → adaptador de persistencia. FastAPI es una integración externa detrás del servicio `AiService`. No hay un bus de eventos distribuido ni consistencia eventual entre los módulos Java. WebSocket publica únicamente eventos de transacciones confirmadas; cada conexión se valida con JWT y queda asociada al usuario o gimnasio autorizado.

Para nuevas funciones, añade controladores y servicios al módulo de dominio correspondiente, conserva el aislamiento por `gymId`, crea una nueva migración Flyway y amplía el contrato OpenAPI y el smoke test. No edites la migración V1 después de desplegarla.

## Despliegue y evolución

Docker Compose agrupa frontend, API, FastAPI y PostgreSQL. Redis y NestJS ya no son dependencias de ejecución. Si FastAPI requiere escalado propio, puede replicarse sin dividir el resto del backend. Si en el futuro un dominio necesita escalar o desplegarse por separado, su servicio y sus contratos ofrecen un punto de extracción claro; antes de hacerlo conviene medir la necesidad y definir propiedad de datos.
