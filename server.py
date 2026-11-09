from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

app = FastAPI()

# Описываем, что мы ждем от телефона (поле "message")
class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    user_text = request.message
    print(f"📥 Получено от телефона: {user_text}")
    
    # ТУТ ПОЗЖЕ МЫ БУДЕМ ВЫЗЫВАТЬ ТВОЕГО ДЖАРВИСА
    # Пока просто возвращаем тестовый ответ
    jarvis_reply = f"Привет! Я Джарвис. Ты написал: '{user_text}'"
    
    return {"reply": jarvis_reply}

if __name__ == "__main__":
    # Запускаем сервер на всех интерфейсах (0.0.0.0), чтобы телефон мог достучаться
    uvicorn.run(app, host="0.0.0.0", port=8000)