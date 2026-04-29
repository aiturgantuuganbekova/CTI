# Aiturgan — Cryptocurrency Trading Indicator (CTI)

> Веб-платформа для анализа криптовалютного рынка в реальном времени с генерацией торговых сигналов на основе технических индикаторов.

---

## 1. О проекте

**Aiturgan CTI** — это веб-приложение, которое предоставляет инструменты для анализа криптовалютного рынка в реальном времени.

Платформа подключается к Binance API и на основе технических индикаторов генерирует торговые сигналы: **BUY**, **SELL** или **HOLD**. Система **не выполняет реальные сделки** — фокус сделан на аналитике и понимании логики индикаторов.

**Целевая аудитория:** трейдеры, исследователи криптовалютного рынка и студенты, изучающие алгоритмическую торговлю.

---

## 2. Основные возможности

| Функция | Описание |
|---|---|
| **Данные в реальном времени** | Подключение к Binance API для получения актуальных цен и свечных данных |
| **5 торговых стратегий** | RSI, MACD, EMA, Bollinger Bands, Combined (мажоритарное голосование) |
| **Генерация сигналов** | BUY / SELL / HOLD с оценкой уверенности (confidence score) |
| **Объяснение сигналов** | Каждый сигнал сопровождается текстовым объяснением — почему он появился |
| **Индикаторы в реальном времени** | RSI, EMA 200, Volatility обновляются при каждом анализе |
| **Live Signals** | Таблица последних авто-сигналов от мониторинга с обновлением каждые 15 секунд |
| **Telegram-уведомления** | Мгновенные оповещения через бота @aiturgan_cti_bot |
| **Автоматический мониторинг** | Настраиваемый интервал проверки (от 5 секунд до 1 часа) |
| **Виртуальные сделки** | Автоматический Stop-Loss и Take-Profit по активным стратегиям |
| **Авторизация** | Google OAuth 2.0 и JWT-аутентификация |
| **Dark UI** | Интерфейс в стиле TradingView |

---

## 3. Технологический стек

### Backend

| Технология | Версия |
|---|---|
| Java | 17 |
| Spring Boot | 3.2 |
| Spring Security | 6.x |
| Hibernate / JPA | — |
| PostgreSQL | 16 (native) |
| JWT (jjwt) | — |

### Frontend

| Технология | Версия |
|---|---|
| React | 18 |
| Vite | 6.x |
| Tailwind CSS | 3.x |
| ApexCharts | — |
| Axios | — |
| React Router | 6 |

### Интеграции

- **Binance API** — рыночные данные (REST)
- **Telegram Bot API** — уведомления о сигналах (`@aiturgan_cti_bot`)
- **Google OAuth 2.0** — авторизация через Google

### DevOps

- Ubuntu 24.04 (VPS, Contabo)
- Nginx (reverse proxy + SSL termination)
- Let's Encrypt SSL
- Systemd-сервисы (`aiturgan-backend.service`, `postgresql.service`)
- Native PostgreSQL 16 (apt install, не Docker)

---

## 4. Архитектура

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐     ┌────────────┐
│   Frontend   │────>│      Nginx        │────>│     Backend      │────>│ PostgreSQL │
│   (React)    │<────│  (reverse proxy)  │<────│  (Spring Boot)   │<────│  (native)  │
└──────────────┘     └───────────────────┘     └────────┬─────────┘     └────────────┘
                                                        │
                                               ┌────────┴─────────┐
                                               │                  │
                                        ┌──────▼──────┐   ┌──────▼──────┐
                                        │ Binance API │   │ Telegram    │
                                        │    REST     │   │ Bot API     │
                                        └─────────────┘   └─────────────┘
```

---

## 5. Структура проекта

```
aiturgan/
├── backend/
│   └── src/main/java/com/aiturgan/crypto/
│       ├── config/              # Конфигурации (Security, CORS)
│       ├── controller/          # REST-контроллеры
│       │   ├── AuthController
│       │   ├── MarketController
│       │   ├── SignalController
│       │   ├── BacktestController
│       │   ├── ReportController
│       │   ├── StrategyConfigController
│       │   ├── TradeController
│       │   ├── UserController
│       │   └── MonitoringController
│       ├── model/               # JPA-сущности
│       │   └── enums/           # SignalType, StrategyType, Role
│       ├── dto/                 # Data Transfer Objects
│       ├── repository/          # Spring Data JPA репозитории
│       ├── security/            # JWT-фильтры, OAuth2-обработчики
│       └── service/             # Бизнес-логика
│           ├── strategy/        # Реализации торговых стратегий
│           ├── BinanceService
│           ├── StrategyEngine
│           ├── TelegramService
│           └── ScheduledMonitoringService
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── DashboardPage    # Главная страница (Indicator)
│       │   ├── SettingsPage     # Настройки
│       │   └── LoginPage        # Авторизация
│       ├── services/            # API-клиенты (Axios)
│       ├── context/             # AuthContext (JWT + loading state)
│       └── i18n/                # Переводы EN / RU
└── docs/
    └── USER_GUIDE.md
```

---

## 6. Установка и запуск

### Предварительные требования

- Java 17+
- Node.js 18+
- Maven 3.8+
- PostgreSQL 16

### Переменные окружения

Создайте файл `.env` или укажите в `application.yml`:

```env
# База данных
DB_URL=jdbc:postgresql://localhost:5432/aiturgan_crypto
DB_USERNAME=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

### Локальный запуск

**1. Клонировать репозиторий:**

```bash
git clone https://github.com/aiturgantuuganbekova/CTI.git
cd CTI
```

**2. Создать базу данных PostgreSQL:**

```bash
sudo -u postgres psql -c "CREATE DATABASE aiturgan_crypto;"
sudo -u postgres psql -c "CREATE USER aiturgan WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE aiturgan_crypto TO aiturgan;"
```

**3. Собрать и запустить Backend:**

```bash
cd backend
mvn clean package -DskipTests
java -jar target/*.jar
```

Backend будет доступен на `http://localhost:8080`

**4. Собрать и запустить Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Frontend будет доступен на `http://localhost:3000`

---

## 7. Навигация и страницы

Интерфейс состоит из **двух страниц**:

### Indicator (главная `/`)

- **Контролы:** выбор монеты (BTC, ETH, BNB, SOL, XRP), таймфрейм, стратегия, кнопка "Analyze"
- **Свечной график** — OHLCV из Binance в реальном времени
- **Панель сигнала** — тип (BUY / SELL / HOLD) + объяснение почему
- **Индикаторы** — RSI(14), EMA(200), Volatility
- **Live Signals** — таблица авто-сигналов от мониторинга (обновляется каждые 15с), колонка "Why" с объяснением каждого сигнала

### Settings (`/settings`)

- Профиль пользователя
- Подключение Telegram (Chat ID + Test)
- Интервал мониторинга (5s – 3600s)
- Управление активными стратегиями

---

## 8. API Endpoints

### Аутентификация

| Метод | Endpoint | Описание |
|---|---|---|
| `POST` | `/api/auth/register` | Регистрация нового пользователя |
| `POST` | `/api/auth/login` | Вход по логину и паролю |
| `POST` | `/api/auth/google` | Вход через Google OAuth 2.0 |

### Рыночные данные

| Метод | Endpoint | Описание |
|---|---|---|
| `GET` | `/api/market/price/{symbol}` | Текущая цена торговой пары |
| `GET` | `/api/market/klines/{symbol}` | Свечные данные (OHLCV) |
| `GET` | `/api/market/indicators/{symbol}` | Значения индикаторов |

### Сигналы и стратегии

| Метод | Endpoint | Описание |
|---|---|---|
| `POST` | `/api/signals/generate` | Генерация торгового сигнала |
| `GET` | `/api/signals` | Список сигналов пользователя |
| `GET` | `/api/strategies` | Список сохранённых стратегий |
| `POST` | `/api/strategies` | Создание стратегии |
| `PUT` | `/api/strategies/{id}/toggle` | Включить/выключить стратегию |
| `DELETE` | `/api/strategies/{id}` | Удалить стратегию |

### Мониторинг

| Метод | Endpoint | Описание |
|---|---|---|
| `GET` | `/api/monitoring/status` | Статус и текущий интервал |
| `POST` | `/api/monitoring/start` | Запустить мониторинг |
| `POST` | `/api/monitoring/stop` | Остановить мониторинг |
| `PUT` | `/api/monitoring/interval` | Обновить интервал |

### Пользователь

| Метод | Endpoint | Описание |
|---|---|---|
| `GET` | `/api/user/telegram` | Получить Telegram Chat ID |
| `PUT` | `/api/user/telegram` | Сохранить Telegram Chat ID |
| `POST` | `/api/user/telegram/test` | Отправить тестовое сообщение |

> Все защищённые эндпоинты требуют заголовок `Authorization: Bearer <JWT_TOKEN>`

---

## 9. Демо

| Ресурс | Ссылка |
|---|---|
| Веб-приложение | [https://cti-aiturgan.com](https://cti-aiturgan.com) |
| Telegram-бот | [@aiturgan_cti_bot](https://t.me/aiturgan_cti_bot) |
| GitHub | [github.com/aiturgantuuganbekova/CTI](https://github.com/aiturgantuuganbekova/CTI) |

---

## 10. Автор

Проект разработан в рамках дипломной работы.

---

## 11. Лицензия

Этот проект распространяется под лицензией [MIT](LICENSE).

```
MIT License

Copyright (c) 2025 Aiturgan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
