# Aiturgan — Cryptocurrency Trading Indicator (CTI)

> Веб-платформа для анализа криптовалютного рынка в реальном времени с генерацией торговых сигналов на основе технических индикаторов.

---

## 1. О проекте

**Aiturgan CTI** — это веб-приложение, которое предоставляет инструменты для анализа криптовалютного рынка в реальном времени.

Платформа подключается к Binance API и на основе технических индикаторов генерирует торговые сигналы: **BUY**, **SELL** или **HOLD**. Система **не выполняет реальные сделки** — фокус сделан на аналитике, бэктестинге и оценке эффективности стратегий.

**Целевая аудитория:** трейдеры, исследователи криптовалютного рынка и студенты, изучающие алгоритмическую торговлю.

---

## 2. Основные возможности

| Функция | Описание |
|---|---|
| **Данные в реальном времени** | Подключение к Binance API (REST + WebSocket) для получения актуальных цен и свечных данных |
| **5 торговых стратегий** | RSI, MACD, EMA, Bollinger Bands, Combined (мажоритарное голосование) |
| **Генерация сигналов** | BUY / SELL / HOLD с оценкой уверенности (confidence score) |
| **Бэктестинг** | Симуляция на исторических данных с расчётом ROI, Win Rate, Max Drawdown, Sharpe Ratio |
| **Виртуальные сделки** | Автоматический Stop-Loss и Take-Profit |
| **Telegram-уведомления** | Мгновенные оповещения через бота @aiturgan_cti_bot |
| **Мониторинг** | Автоматическая проверка стратегий каждые 60 секунд |
| **Аналитика и отчёты** | Сравнение стратегий, история сделок, экспорт в CSV |
| **Авторизация** | Google OAuth 2.0 и JWT-аутентификация |
| **Role-based access** | Роли Admin и User с разграничением прав |
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
| PostgreSQL | 15 |
| JWT (jjwt) | — |
| WebSocket (STOMP) | — |

### Frontend

| Технология | Версия |
|---|---|
| React | 18 |
| Vite | — |
| Tailwind CSS | 3.x |
| ApexCharts | — |
| Axios | — |
| React Router | 6 |

### Интеграции

- **Binance API** — рыночные данные (REST + WebSocket)
- **Telegram Bot API** — уведомления о сигналах
- **Google OAuth 2.0** — авторизация через Google

### DevOps

- Docker, Docker Compose
- Nginx (reverse proxy)
- Let's Encrypt SSL
- JUnit 5 (69 тестов)

---

## 4. Архитектура

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐     ┌────────────┐
│   Frontend   │────>│      Nginx        │────>│     Backend      │────>│ PostgreSQL │
│   (React)    │<────│  (reverse proxy)  │<────│  (Spring Boot)   │<────│            │
└──────────────┘     └───────────────────┘     └────────┬─────────┘     └────────────┘
                                                        │
                                               ┌────────┴─────────┐
                                               │                  │
                                        ┌──────▼──────┐   ┌──────▼──────┐
                                        │ Binance API │   │ Telegram    │
                                        │ REST + WS   │   │ Bot API     │
                                        └─────────────┘   └─────────────┘
```

---

## 5. Структура проекта

```
aiturgan/
├── backend/
│   └── src/main/java/com/aiturgan/crypto/
│       ├── config/              # Конфигурации (Security, WebSocket, CORS)
│       ├── controller/          # REST-контроллеры
│       │   ├── AuthController
│       │   ├── MarketController
│       │   ├── SignalController
│       │   ├── BacktestController
│       │   ├── ReportController
│       │   ├── StrategyConfigController
│       │   ├── TradeController
│       │   ├── UserController
│       │   ├── AdminController
│       │   └── WebSocketController
│       ├── model/               # JPA-сущности
│       │   └── enums/           # Перечисления (SignalType, Strategy, Role)
│       ├── dto/                 # Data Transfer Objects
│       ├── repository/          # Spring Data JPA репозитории
│       ├── security/            # JWT-фильтры, OAuth2-обработчики
│       ├── service/             # Бизнес-логика
│       │   └── strategy/        # Реализации торговых стратегий
│       └── CryptoApplication.java
├── frontend/
│   └── src/
│       ├── components/          # React-компоненты
│       ├── pages/               # Страницы приложения
│       │   ├── DashboardPage    # Главная панель
│       │   ├── StrategyPage     # Движок стратегий
│       │   ├── BacktestPage     # Бэктестинг
│       │   ├── ReportsPage      # Отчёты
│       │   ├── SettingsPage     # Настройки
│       │   └── LoginPage        # Авторизация
│       ├── services/            # API-клиенты (Axios)
│       ├── context/             # React Context (Auth)
│       └── hooks/               # Пользовательские хуки
├── docker-compose.yml
└── docs/
```

---

## 6. Установка и запуск

### Предварительные требования

- Java 17+
- Node.js 18+
- Maven 3.8+
- Docker & Docker Compose
- PostgreSQL 15

### Переменные окружения

Создайте файл `.env` или укажите переменные при запуске:

```env
# База данных
DB_URL=jdbc:postgresql://localhost:5432/aiturgan
DB_USERNAME=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_key

# Binance
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

### Локальный запуск

**1. Клонировать репозиторий:**

```bash
git clone https://github.com/aiturgantuuganbekova/CTI.git
cd CTI
```

**2. Запустить PostgreSQL:**

```bash
docker run -d \
  --name aiturgan-db \
  -e POSTGRES_DB=aiturgan \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:15
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

**5. Открыть приложение:**

Перейдите в браузере по адресу [http://localhost:3000](http://localhost:3000)

### Запуск через Docker Compose

```bash
docker-compose up --build
```

Приложение будет доступно на `http://localhost` (порт 80).

---

## 7. Как пользоваться

### 7.1 Регистрация и вход

- Зарегистрируйтесь через форму (username / email / password) или войдите через **Google OAuth**
- Первый зарегистрированный пользователь автоматически получает роль **ADMIN**

### 7.2 Dashboard

Главная панель отображает:

- Текущую цену BTC, ETH и других монет в реальном времени
- Свечной график с выбором таймфрейма (1m, 5m, 15m, 1h, 4h, 1d)
- Ключевые метрики: **ROI**, **Win Rate**, **Active Signals**, **Total Trades**
- Таблицу последних сигналов

### 7.3 Strategy Engine

Движок стратегий позволяет:

1. Выбрать торговую пару (например, BTCUSDT)
2. Выбрать стратегию: RSI, MACD, EMA, Bollinger Bands или Combined
3. Настроить таймфрейм анализа
4. Задать уровни **Stop-Loss** и **Take-Profit**
5. Сгенерировать сигнал — получить BUY / SELL / HOLD с confidence score
6. Просмотреть значения индикаторов (RSI, MACD, EMA, полосы Боллинджера)
7. Сохранить пресет стратегии для быстрого доступа

### 7.4 Backtesting

Бэктестинг позволяет проверить стратегию на исторических данных:

1. Выберите период, стратегию и начальный баланс
2. Запустите симуляцию
3. Получите результаты:
   - **ROI** — доходность
   - **Win Rate** — процент прибыльных сделок
   - **Max Drawdown** — максимальная просадка
   - **Sharpe Ratio** — коэффициент Шарпа
   - **Equity Curve** — график изменения баланса
4. Просмотрите таблицу всех сделок
5. Экспортируйте результаты в **CSV**

### 7.5 Reports

Раздел отчётов включает:

- Историю сигналов и совершённых виртуальных сделок
- Сравнительный анализ эффективности стратегий
- Экспорт отчётов в CSV
- Консолидированную аналитику по всем стратегиям

### 7.6 Settings

В настройках можно:

- Подключить **Telegram-уведомления** (подробная инструкция ниже)
- Управлять активными стратегиями мониторинга
- Настроить параметры автоматического отслеживания

### 7.7 Telegram-уведомления

Пошаговая инструкция для подключения:

1. Найдите бота **@aiturgan_cti_bot** в Telegram
2. Отправьте команду `/start`
3. Узнайте свой Chat ID — отправьте любое сообщение боту **@userinfobot**, он вернёт ваш ID
4. Перейдите в **Settings** на сайте и введите полученный Chat ID
5. Нажмите "Save" — при генерации сигналов **BUY** или **SELL** вам придёт уведомление в Telegram

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

### Сигналы и стратегии

| Метод | Endpoint | Описание |
|---|---|---|
| `POST` | `/api/signals/generate` | Генерация торгового сигнала |
| `GET` | `/api/signals` | Список сигналов пользователя |

### Бэктестинг

| Метод | Endpoint | Описание |
|---|---|---|
| `POST` | `/api/backtest/run` | Запуск бэктеста |

### Отчёты и пользователь

| Метод | Endpoint | Описание |
|---|---|---|
| `GET` | `/api/reports` | Получение отчётов |
| `PUT` | `/api/user/telegram` | Обновление Telegram Chat ID |

> Все защищённые эндпоинты требуют заголовок `Authorization: Bearer <JWT_TOKEN>`

---

## 9. Демо

| Ресурс | Ссылка |
|---|---|
| Веб-приложение | [https://cti-aiturgan.com](https://cti-aiturgan.com) |
| Telegram-бот | [@aiturgan_cti_bot](https://t.me/aiturgan_cti_bot) |

---

## 10. Автор

Проект разработан в рамках дипломной работы.

- **GitHub:** [https://github.com/aiturgantuuganbekova/CTI](https://github.com/aiturgantuuganbekova/CTI)

---

## 11. Лицензия

Этот проект распространяется под лицензией [MIT](LICENSE).

```
MIT License

Copyright (c) 2024 Aiturgan

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
