# Telegram AI Bot POC

## Descripcion

Este repositorio contiene un pequeño POC de un bot de Telegram orientado a:

- recibir mensajes de texto y audio
- transcribir audio a texto
- interpretar la intencion del usuario con ayuda de un modelo de IA
- ejecutar comandos sencillos sobre recordatorios y tareas

La idea del proyecto es demostrar un flujo completo y entendible de extremo a extremo:

1. Telegram entrega un mensaje al bot.
2. Si el mensaje es de voz, se transcribe a texto.
3. El texto se envía a un modelo de IA para clasificar el intent.
4. El intent se enruta a la lógica de aplicación.
5. La aplicación responde al usuario y, si aplica, persiste datos en PostgreSQL.

No pretende ser una solución enterprise ni un producto listo para producción. Está diseñado como base de experimentación y aprendizaje.

---

## Objetivo del POC

Este POC busca validar de forma simple:

- integración con Telegram
- transcripción de audio
- clasificación de intents mediante IA
- desacoplo entre parser, dispatcher y servicios de dominio
- persistencia básica con PostgreSQL
- empaquetado portable mediante Docker

---

## Qué hace ahora mismo

Actualmente el bot soporta intents de:

- creación de recordatorios
- listado de recordatorios
- borrado de recordatorios
- actualización de recordatorios
- creación de tareas
- listado de tareas
- borrado de una tarea
- borrado de todas las tareas pendientes
- comandos auxiliares como `help`, `start` y `cancel`

También incluye:

- notificación automática de recordatorios vencidos
- transcripción de audios con `faster-whisper`
- configuración de intents mediante `config/CONFIGURATION_AI.md`

---

## Arquitectura simplificada

El flujo principal es este:

```text
Telegram
  -> Bot
  -> Input Parser
  -> IA / LLM
  -> Command Dispatcher
  -> Services
  -> Repository
  -> PostgreSQL
```

### Piezas principales

- `src/index.ts`
  Punto de entrada del bot y orquestación básica.

- `src/modules/inputs`
  Parseo de entrada de texto y audio.

- `pworker/transcribe.py`
  Worker Python para transcribir audio.

- `src/modules/commands`
  Definición de intents y dispatcher de comandos.

- `src/modules/reminders`
  Dominio de recordatorios, repositorio, servicio y notificador.

- `src/modules/tasks`
  Dominio de tareas, repositorio y servicio.

- `config/CONFIGURATION_AI.md`
  Contrato de clasificación para el modelo de IA.

---

## Integracion con IA

La aplicación está pensada para usar un modelo servido por Ollama a través de HTTP.

### Estado actual

Por ahora se contempla un modelo gratuito de Ollama accesible en localhost, por ejemplo:

```text
http://localhost:11434
```

### Importante

Aunque el ejemplo usa Ollama en localhost, la integración está desacoplada mediante configuración:

- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`

Eso significa que cambiar el proveedor o mover el modelo a otra máquina es relativamente sencillo, siempre que se mantenga una interfaz compatible con la llamada que hace la app.

En otras palabras: hoy está preparado para un modelo local y barato, pero no está rígidamente atado a él.

---

## Limitaciones del POC

Este proyecto es deliberadamente simple. Algunas limitaciones importantes:

- no se ha contemplado clustering de modelos para garantizar disponibilidad
- no hay alta disponibilidad del servicio de IA
- no hay balanceo entre múltiples instancias del modelo
- no hay mecanismos avanzados de tolerancia a fallos
- no hay colas de trabajo dedicadas
- no hay observabilidad avanzada ni métricas formales
- no hay gestión de secretos de nivel productivo
- no hay separación completa entre entornos ni estrategia de despliegue rolling

Esto es importante dejarlo claro: el uso de un único modelo servido por Ollama en localhost simplifica muchísimo el POC, pero no garantiza disponibilidad ni resiliencia.

---

## Requisitos

Para ejecutar el proyecto necesitas como mínimo:

- Node.js
- npm
- Docker y Docker Compose si quieres despliegue con contenedores
- un token de Telegram Bot
- PostgreSQL
- un endpoint de Ollama accesible para la app

Si ejecutas la transcripción fuera de Docker, también necesitas:

- Python
- dependencias de `requirements.txt`
- `ffmpeg`

---

## Variables de entorno

El proyecto usa un archivo `.env`.

Puedes partir de:

```bash
cp .env.example .env
```

Variables principales:

- `TELEGRAM_API`
  Token del bot de Telegram.

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
  Configuración de PostgreSQL.

- `OLLAMA_BASE_URL`
  URL base del servicio de IA.

- `OLLAMA_MODEL`
  Modelo a usar en Ollama.

- `PYTHON_BIN`
  Binario de Python para la transcripción.

- `REMINDER_POLL_INTERVAL_MS`
  Intervalo de comprobación de recordatorios vencidos.

- `REMINDER_POLL_BATCH_SIZE`
  Tamaño de lote al procesar recordatorios.

Variables opcionales para transcripción:

- `WHISPER_DEVICE`
- `WHISPER_MODEL`
- `WHISPER_CPU_COMPUTE_TYPE`
- `WHISPER_CUDA_COMPUTE_TYPE`

---

## Ejecucion local

### 1. Instalar dependencias de Node

```bash
npm install
```

### 2. Compilar

```bash
npm run build
```

### 3. Ejecutar

```bash
npm start
```

### 4. Modo desarrollo

```bash
npm run dev
```

---

## Despliegue con Docker

Este repositorio incluye infraestructura básica con Docker para facilitar portabilidad.

### Qué levanta Docker Compose

- `app`
  La aplicación Node.js con el worker Python de transcripción.

- `db`
  PostgreSQL con inicialización automática desde `config/init.sql`.

### Construir imagen

```bash
npm run docker:build
```

### Levantar servicios

```bash
npm run docker:up
```

### Ver logs

```bash
npm run docker:logs
```

### Parar servicios

```bash
npm run docker:down
```

### Nota sobre Ollama en Docker

La IA no va embebida en el `docker-compose` actual.

La aplicación espera un endpoint accesible por `OLLAMA_BASE_URL`.
Por defecto, el ejemplo está pensado para usar:

```text
http://host.docker.internal:11434
```

Esto es útil cuando Ollama corre en la máquina host y la app corre dentro de Docker.

---

## Base de datos

La base de datos se inicializa con:

- `config/init.sql`

Actualmente se crean tablas para:

- `tasks`
- `reminders`
- `users`

El esquema está pensado para este POC y no como modelo final de dominio.

---

## Transcripción de audio

La transcripción se hace con `faster-whisper` desde Python.

### Comportamiento actual

- por defecto usa CPU
- puede usar GPU si se configura explícitamente
- hace fallback a CPU si el backend CUDA falla

Esto mejora bastante la portabilidad, especialmente en entornos donde no hay dependencias NVIDIA disponibles.

---

## Configuracion de intents

El contrato del clasificador está definido en:

- `config/CONFIGURATION_AI.md`

Ese archivo define:

- intents válidos
- campos permitidos
- reglas semánticas
- ejemplos
- casos de prueba

Si se añaden nuevos comandos al dispatcher, conviene actualizar ese documento para mantener sincronía entre código y comportamiento esperado del modelo.

---

## Portabilidad y desacoplo

Se han tomado varias decisiones para hacer el proyecto más portable:

- Docker para la app y PostgreSQL
- variables de entorno para desacoplar servicios
- integración con IA a través de URL configurable
- worker de transcripción aislado en Python
- separación entre parser, dispatcher, servicios y repositorios

Esto no convierte el proyecto en una plataforma cloud-native, pero sí facilita moverlo entre equipos, máquinas y entornos de prueba con menos fricción.

---

## Qué no cubre este POC

No cubre, al menos de momento:

- clustering de modelos
- redundancia del servicio de IA
- replicación multi-región
- despliegue orquestado en Kubernetes
- colas distribuidas
- rate limiting serio
- autenticación compleja
- panel de administración
- trazabilidad completa de inferencias

---

## Ideas de evolucion

Si este POC creciera, algunos siguientes pasos razonables serían:

- mover la notificación de recordatorios a un worker separado
- desacoplar la IA detrás de una interfaz más genérica
- añadir tests automatizados
- separar mejor configuración local, Docker y producción
- incorporar observabilidad real
- añadir estrategia de reintentos y colas
- evaluar disponibilidad del modelo con varias réplicas o servicios externos

---

## Resumen

Este proyecto es un POC sencillo pero funcional de:

- bot de Telegram
- transcripción de audio
- integración con modelos de IA
- gestión básica de intents del usuario final

Está pensado para ser fácil de entender, fácil de mover y fácil de extender.

Y al mismo tiempo deja claro su alcance:

- un único modelo de IA accesible por URL
- sin clustering
- sin garantías fuertes de disponibilidad
- orientado a validación funcional, no a operación crítica
