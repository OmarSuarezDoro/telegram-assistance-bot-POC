# Telegram AI Bot POC

## Description

This repository contains a small POC for a Telegram bot designed to:

- receive text and audio messages
- transcribe audio to text
- interpret the user's intent with the help of an AI model
- execute simple commands related to reminders and tasks

The goal of the project is to demonstrate a complete and easy-to-understand end-to-end flow:

1. Telegram delivers a message to the bot.
2. If the message is a voice message, it is transcribed to text.
3. The text is sent to an AI model to classify the intent.
4. The intent is routed to the application logic.
5. The application responds to the user and, when applicable, persists data in PostgreSQL.

It is not intended to be an enterprise solution or a production-ready product. It is designed as a foundation for experimentation and learning.


## POC Objective

This POC aims to validate, in a simple way:

- integration with Telegram
- audio transcription
- intent classification using AI - decoupling between parser, dispatcher and domain services
- basic persistence with PostgreSQL
- portable packaging using Docker



## What It Currently Does

The bot currently supports intents for:

- creating reminders
- listing reminders
- deleting reminders
- updating reminders
- creating tasks
- listing tasks
- deleting a task
- deleting all pending tasks
- auxiliary commands such as `help`, `start` and `cancel`

It also includes:

- automatic notification of overdue reminders
- audio transcription with `faster-whisper`
- intent configuration through `config/CONFIGURATION_AI.md`



## Simplified Architecture

The main flow is as follows:

```text
Telegram
  -> Bot
  -> Input Parser
  -> AI / LLM
  -> Command Dispatcher
  -> Services
  -> Repository
  -> PostgreSQL
```

### Main Components

- `src/index.ts`  
  Bot entry point and basic orchestration.

- `src/modules/inputs`  
  Text and audio input parsing.

- `pworker/transcribe.py`  
  Python worker for audio transcription.

- `src/modules/commands`  
  Intent definitions and command dispatcher.

- `src/modules/reminders`  
  Reminder domain, repository, service and notifier.

- `src/modules/tasks`  
  Task domain, repository and service.

- `config/CONFIGURATION_AI.md`  
  Classification contract for the AI model.



## AI Integration

The application is designed to use a model served by Ollama over HTTP.

### Current State

For now, the project considers a free Ollama model accessible on localhost, for example:

```text
http://localhost:11434
```

### Important

Although the example uses Ollama on localhost, the integration is decoupled through configuration:

- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`

This means that changing the provider or moving the model to another machine is relatively straightforward, as long as a compatible interface is maintained for the call made by the app.

In other words: today it is prepared for a local and low-cost model, but it is not rigidly tied to it.



## POC Limitations

This project is deliberately simple. Some important limitations are:

- model clustering has not been considered to guarantee availability
- there is no high availability for the AI service
- there is no load balancing across multiple model instances
- there are no advanced fault-tolerance mechanisms- there are no dedicated work queues
- there is no advanced observability or formal metrics
- there is no production-grade secrets management
- there is no complete separation between environments or rolling deployment strategy

This is important to make clear: using a single model served by Ollama on localhost greatly simplifies the POC, but it does not guarantee availability or resilience.



## Requirements

To run the project, you need at least:

- Node.js
- npm
- Docker and Docker Compose, if you want container-based deployment
- a Telegram Bot token
- PostgreSQL
- an Ollama endpoint accessible to the app

If you run transcription outside Docker, you also need:

- Python
- dependencies from `requirements.txt`
- `ffmpeg`



## Environment Variables

The project uses a `.env` file.

You can start from:

```bash
cp .env.example .env
```

Main variables:

- `TELEGRAM_API`  
  Telegram bot token.

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`  
  PostgreSQL configuration.

- `OLLAMA_BASE_URL`  
  Base URL of the AI service.

- `OLLAMA_MODEL`  
  Model to use in Ollama.

- `PYTHON_BIN`  
  Python binary used for transcription.

- `REMINDER_POLL_INTERVAL_MS`  
  Interval for checking overdue reminders.

- `REMINDER_POLL_BATCH_SIZE`  
  Batch size when processing reminders.

Optional variables for transcription:

- `WHISPER_DEVICE`
- `WHISPER_MODEL`
- `WHISPER_CPU_COMPUTE_TYPE`
- `WHISPER_CUDA_COMPUTE_TYPE`



## Local Execution

### 1. Install Node dependencies

```bash
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Run

```bash
npm start
```

### 4. Development mode

```bash
npm run dev
```



## Deployment with Docker

This repository includes basic Docker infrastructure to improve portability.

### What Docker Compose Starts

- `app`  
  The Node.js application with the Python transcription worker.

- `db`  
  PostgreSQL with automatic initialization from `config/init.sql`.

### Build the image

```bash
npm run docker:build
```

### Start services

```bash
npm run docker:up
```

### View logs

```bash
npm run docker:logs
```

### Stop services

```bash
npm run docker:down
```

### Note About Ollama in Docker

AI is not embedded in the current `docker-compose`.

The application expects an endpoint accessible through `OLLAMA_BASE_URL`.
By default, the example is designed to use:

```text
http://host.docker.internal:11434
```

This is useful when Ollama runs on the host machine and the app runs inside Docker.



## Database

The database is initialized with:

- `config/init.sql`

It currently creates tables for:

- `tasks`
- `reminders`
- `users`

The schema is designed for this POC and not as a final domain model.



## Audio Transcription

Audio transcription is performed with `faster-whisper` from Python.

### Current Behavior

- it uses CPU by default
- it can use GPU if explicitly configured
- it falls back to CPU if the CUDA backend fails

This significantly improves portability, especially in environments where NVIDIA dependencies are not available.



## Intent Configuration

The classifier contract is defined in:

- `config/CONFIGURATION_AI.md`

That file defines:

- valid intents
- allowed fields
- semantic rules
- examples
- test cases

If new commands are added to the dispatcher, this document should be updated to keep the code and the expected model behavior in sync.



## Portability and Decoupling

Several decisions were made to make the project more portable:

- Docker for the app and PostgreSQL
- environment variables to decouple services
- AI integration through a configurable URL
- isolated Python transcription worker
- separation between parser, dispatcher, services and repositories

This does not turn the project into a cloud-native platform, but it does make it easier to move between computers, machines and test environments with less friction.


## What This POC Does Not Cover

At least for now, it does not cover:

- model clustering
- AI service redundancy
- multi-region replication
- orchestrated deployment on Kubernetes
- distributed queues
- serious rate limiting
- complex authentication
- admin dashboard
- full inference traceability



## Evolution Ideas

If this POC grows, some reasonable next steps would be:

- move reminder notifications to a separate worker
- decouple the AI behind a more generic interface
- add automated tests
- better separate local, Docker and production configuration
- incorporate real observability
- add retry and queue strategies
- evaluate model availability using multiple replicas or external services
