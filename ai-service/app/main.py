"""
Servicio de IA de Power Zone (FastAPI).

Provee asistente virtual, generación de rutinas y recomendaciones.
Sin dependencia de un LLM externo: usa reglas/motores deterministas para
poder correr en cualquier entorno sin claves.

Ejecutar:
    cd ai-service
    pip install -r requirements.txt
    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import os
import random
from typing import Any, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field

app = FastAPI(
    title="Power Zone AI Service",
    description="Servicio de IA para Power Zone: chat, rutinas y recomendaciones.",
    version="1.0.0",
)

AI_KEY = os.getenv("AI_SERVICE_API_KEY", "internal-ai-key")


# ---------------------------------------------------------------------------
# Esquemas
# ---------------------------------------------------------------------------
class ChatRequest(BaseModel):
    session_id: str = Field(default="general", max_length=128)
    message: str = Field(min_length=1, max_length=2000)
    context: dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    reply: str


class RoutineRequest(BaseModel):
    user_id: str
    objective: str = "gain_muscle"
    days_per_week: int = Field(default=4, ge=1, le=7)
    difficulty: int = Field(default=3, ge=1, le=5)


class ExercisePayload(BaseModel):
    name: str
    sets: int
    reps: str
    restSeconds: int
    notes: str


class RoutineResponse(BaseModel):
    title: str
    description: str
    exercises: list[ExercisePayload]


class RecommendationRequest(BaseModel):
    user_id: str
    context: dict[str, Any] = Field(default_factory=dict)


class RecommendationResponse(BaseModel):
    recommendation: str
    tips: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Dependencia de seguridad (clave compartida con el proxy NestJS)
# ---------------------------------------------------------------------------
def require_api_key(x_ai_key: Optional[str] = Header(default=None)) -> None:
    if not x_ai_key or x_ai_key != AI_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Clave de API inválida")


# ---------------------------------------------------------------------------
# Motores deterministas
# ---------------------------------------------------------------------------
EXERCISES = {
    "gain_muscle": {
        "name": "Hipertrofia",
        "description": "Rutina enfocada en desarrollo muscular con rangos de 8-12 repeticiones.",
        "exercises": [
            "Press de banca",
            "Sentadilla",
            "Remo con barra",
            "Press militar",
            "Peso muerto rumano",
            "Curl de bíceps",
            "Fondos en paralelas",
        ],
    },
    "fat_loss": {
        "name": "Quema de grasa",
        "description": "Circuito de alta intensidad para maximizar el gasto calórico.",
        "exercises": [
            "Burpees",
            "Cuerda de saltar",
            "Kettlebell swing",
            "Mountain climbers",
            "Sentadilla con salto",
            "Plancha",
            "Zancadas alternas",
        ],
    },
    "strength": {
        "name": "Fuerza máxima",
        "description": "Fuerza con series de pocas repeticiones y descansos largos.",
        "exercises": [
            "Sentadilla pesada",
            "Press de banca pesado",
            "Peso muerto convencional",
            "Press militar de pie",
            "Remo pesado",
            "Hip thrust",
            "Dominadas con peso",
        ],
    },
    "endurance": {
        "name": "Resistencia",
        "description": "Acondicionamiento y resistencia muscular con descansos cortos.",
        "exercises": [
            "Carrera en cinta",
            "Remo erg",
            "Bicicleta estática",
            "Squats con pausa",
            "Flexiones",
            "Burpees",
            "Cuerda de saltar",
        ],
    },
    "general_fitness": {
        "name": "Fitness general",
        "description": "Rutina equilibrada de fuerza, cardio y movilidad.",
        "exercises": [
            "Sentadilla goblet",
            "Press de pecho con mancuernas",
            "Remo en máquina",
            "Desplantes",
            "Plancha lateral",
            "Cardio suave",
            "Estiramientos",
        ],
    },
}

CHAT_FALLBACKS = [
    "El horario de clases suele estar disponible en recepción y en la app.",
    "Para dudas sobre tu membresía puedes consultarla en la sección Membresías.",
    "Te recomiendo llegar 10 minutos antes a tu clase para calentar.",
    "¿Quieres saber más sobre nutrición? Pregunta por recomendaciones alimenticias.",
]


def _reps_for(objective: str, difficulty: int) -> str:
    if objective == "strength":
        return f"{5 - difficulty} - {6 - difficulty}" if difficulty <= 4 else "3 - 5"
    if objective == "fat_loss" or objective == "endurance":
        return "15 - 20"
    return "8 - 12"


def build_routine(request: RoutineRequest) -> RoutineResponse:
    objective = request.objective if request.objective in EXERCISES else "general_fitness"
    plan = EXERCISES[objective]

    exercises: list[ExercisePayload] = []
    for name in plan["exercises"]:
        exercises.append(
            ExercisePayload(
                name=name,
                sets=4 if objective == "strength" else 3,
                reps=_reps_for(objective, request.difficulty),
                restSeconds=90 if objective == "strength" else (30 if objective in ("fat_loss", "endurance") else 60),
                notes=f"Dificultad {request.difficulty}/5 · controlar la técnica",
            )
        )

    # Asignar bloques según los días semanales
    split: dict[int, str] = {
        2: "Upper body + Lower body",
        3: "Push + Pull + Legs",
        4: "Upper/Lower ×2",
        5: "Fuerza + Hipertrofia + Cardio + Full body",
    }
    description = plan["description"] + (
        f" Frecuencia: {request.days_per_week} días/semana · Split: {split.get(request.days_per_week, 'Full body')}."
    )

    return RoutineResponse(
        title=plan["name"],
        description=description,
        exercises=exercises,
    )


def recommend_workout(request: RecommendationRequest) -> RecommendationResponse:
    plan = build_routine(RoutineRequest(user_id=request.user_id, objective="general_fitness", days_per_week=3, difficulty=3))
    return RecommendationResponse(
        recommendation=(
            "Basado en tu perfil te proponemos una sesión equilibrada: "
            "10 min de calentamiento, 40 min de fuerza y 10 min de cardio."
        ),
        tips=[
            f"Ejercicio clave sugerido: {plan.exercises[0].name}.",
            "Hidrátate antes y durante el entrenamiento.",
            "Respeta los descansos para evitar sobrecarga.",
        ],
    )


def recommend_nutrition(_request: RecommendationRequest) -> RecommendationResponse:
    return RecommendationResponse(
        recommendation=(
            "Mantén entre 1.6 y 2.2 g de proteína por kg de peso corporal. "
            "Distribuye 4-5 comidas al día priorizando alimentos integrales."
        ),
        tips=[
            "Incluye vegetales en cada comida.",
            "Ajusta los carbohidratos según tu volumen de entrenamiento.",
            "Evita ultraprocesados y azúcares añadidos.",
            "Duerme 7-9 horas para una mejor recuperación.",
        ],
    )


def chat_default(session_id: str, message: str, context: dict[str, Any]) -> ChatResponse:
    lower = " ".join([message, str(context or {})]).lower()
    if any(word in lower for word in ("clase", "horario", "clases")):
        return ChatResponse(reply="Las clases y horarios están disponibles en la app en la sección Clases.")
    if any(word in lower for word in ("membres", "suscripcion", "pago")):
        return ChatResponse(reply="Consulta tu membresía y pagos en la sección Membresías de la app.")
    if any(word in lower for word in ("rutina", "ejercicio", "entrenar")):
        return ChatResponse(reply="¿Quieres que te genere una rutina? Usa /ai-proxy/routines/generate.")
    if any(word in lower for word in ("nutric", "comer", "dieta")):
        return ChatResponse(reply="Te recomiendo 1.6-2.2 g de proteína/kg. Pide una recomendación nutricional personalizada.")
    return ChatResponse(reply=random.choice(CHAT_FALLBACKS))


# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------
@app.get("/health", summary="Estado del servicio")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse, summary="Chatbot del gimnasio")
def chat(payload: ChatRequest, _key: None = Depends(require_api_key)) -> ChatResponse:
    return chat_default(payload.session_id, payload.message, payload.context)


@app.post("/routines/generate", response_model=RoutineResponse, summary="Generar rutina")
def routines_generate(payload: RoutineRequest, _key: None = Depends(require_api_key)) -> RoutineResponse:
    return build_routine(payload)


@app.post("/recommendations/workout", response_model=RecommendationResponse, summary="Recomendación de entrenamiento")
def recommendations_workout(
    payload: RecommendationRequest, _key: None = Depends(require_api_key)
) -> RecommendationResponse:
    return recommend_workout(payload)


@app.post("/recommendations/nutrition", response_model=RecommendationResponse, summary="Recomendación nutricional")
def recommendations_nutrition(
    payload: RecommendationRequest, _key: None = Depends(require_api_key)
) -> RecommendationResponse:
    return recommend_nutrition(payload)