# 🚀 Полное руководство по созданию и сборке APK (React Native + Expo)

> **Для кого эта инструкция:** Для тех, кто хочет создать мобильное приложение на React Native, собрать его в облаке и установить на Android-телефон, даже если вы никогда этого не делали.

---

## 📋 Оглавление
1. [Создание проекта](#1-создание-проекта)
2. [Установка зависимостей](#2-установка-зависимостей)
3. [Настройка EAS (сборка в облаке)](#3-настройка-eas-сборка-в-облаке)
4. [Обход проблем с Git (Windows)](#4-обход-проблем-с-git-windows)
5. [Ошибка "Unable to resolve module axios"](#5-ошибка-unable-to-resolve-module-axios)
6. [Python-сервер (FastAPI) для связи](#6-python-сервер-fastapi-для-связи)
7. [Интерфейс: клавиатура и навигация](#7-интерфейс-клавиатура-и-навигация)
8. [Как узнать IP-адрес](#8-как-узнать-ip-адрес)
9. [Сборка и установка APK](#9-сборка-и-установка-apk)

---

## 1. Создание проекта

Откройте терминал (VS Code или PowerShell) и выполните:

```bash
npx create-expo-app@latest my_app --template blank
cd my_app
✅ Результат: Появится папка my_app с готовым шаблоном React Native проекта.

2. Установка зависимостей
В зависимости от того, что вы используете, установите нужные библиотеки:

Что нужно	Команда	Зачем
Запросы к серверу	npx expo install axios	Для отправки POST-запросов на бэкенд
Ошибка с userInterfaceStyle	npx expo install expo-system-ui	Если сборка жалуется на эту настройку
HTTP-запросы (Android 9+)	npx expo install expo-build-properties	Чтобы Android не блокировал http:// (без шифрования)
⚠️ Важно: После установки expo-build-properties, обязательно добавьте в app.json настройку:

json
"plugins": [
  ["expo-build-properties", { "android": { "usesCleartextTraffic": true } }]
]

3. Настройка EAS (сборка в облаке)
EAS — это сервис Expo, который собирает APK в облаке. Вам не нужен мощный компьютер.

bash
npm install -g eas-cli
eas login
eas build:configure
🛠 В процессе настройки:

Выберите аккаунт (Personal).
Согласитесь создать проект в облаке.
Выберите платформу Android.
Согласитесь на инициализацию Git (если спросит).

4. Обход проблем с Git (Windows)
Если вы видите ошибку dubious ownership или exited with non-zero code: 128, значит Git блокирует доступ к папке.

Решение:

powershell
git config --global --add safe.directory C:/путь/к/вашему/проекту
(Замените путь на свой, например: C:/projects/my_app)

Если после этого сборка всё равно падает на этапе загрузки — отключите Git для сборки:

powershell
npx cross-env EAS_NO_VCS=1 eas build -p android --profile preview

5. Ошибка "Unable to resolve module axios"
Если сборка падает на этапе Bundle JavaScript с этой ошибкой, значит библиотека не попала в облако.

Что делать:
Убедитесь, что она установлена: npx expo install axios

Откройте package.json и проверьте, что в разделе "dependencies" есть строка "axios": "^...".

Пересоберите проект.

6. Python-сервер (FastAPI) для связи
Если ваше приложение должно общаться с Python-скриптом на ноутбуке, создайте файл server.py в папке с Python-проектом.

Пример минимального сервера:

python
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

app = FastAPI()

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    return {"reply": f"Эхо: {request.message}"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
Запуск (в виртуальном окружении вашего Python-проекта):

powershell
python server.py
⚠️ Важно: Сервер должен слушать 0.0.0.0:8000, а не 127.0.0.1, иначе телефон его не увидит.

7. Интерфейс: клавиатура и навигация
Чтобы на Android клавиатура и системные кнопки не перекрывали поле ввода:

Оберните весь экран в <SafeAreaView>.

Используйте <KeyboardAvoidingView> с behavior={Platform.OS === 'ios' ? 'padding' : 'height'}.

Добавьте paddingBottom для блока с полем ввода.

Пример правильной структуры:

javascript
<SafeAreaView style={{ flex: 1 }}>
  <KeyboardAvoidingView 
    style={{ flex: 1 }} 
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    {/* Ваш чат */}
    <View style={{ paddingBottom: 20 }}>
      <TextInput />
    </View>
  </KeyboardAvoidingView>
</SafeAreaView>

8. Как узнать IP-адрес
Чтобы телефон мог подключиться к ноутбуку, они должны быть в одной Wi-Fi сети.

Откройте терминал на ноутбуке:

powershell
ipconfig
Найдите раздел «Беспроводная сеть» или «Wi-Fi». Нас интересует строка:
IPv4-адрес . . . . . . . . . . . . : 192.168.X.X

В коде приложения (App.js) укажите:

javascript
const SERVER_URL = 'http://192.168.X.X:8000/chat';

9. Сборка и установка APK
Запуск сборки в облаке:

powershell
npx cross-env EAS_NO_VCS=1 eas build -p android --profile preview
⏳ Сборка займет 5–15 минут. В терминале появится ссылка на страницу сборки, где можно скачать готовый .apk файл.

Установка на телефон:

Скачайте .apk файл на телефон (или скачайте на ноутбук и перекиньте).
Откройте файл на телефоне.
Разрешите установку из неизвестных источников.
Готово! Приложение на телефоне.

