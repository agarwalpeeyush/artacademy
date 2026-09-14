# Service Registry — PRD

## Overview

The service-registry provides service discovery for the entire Art Academy
platform so services can find and call each other by logical name rather
than by a fixed network address.

## Goals

- Allow every platform service to register itself on startup.
- Let clients (API Gateway, inter-service WebClients) resolve `lb://`
  names to live instances.
- Provide a single, always-on discovery point with health visibility.

## Non-Goals

- No business data, persistence, or Kafka messaging.
- No request routing (that is the API Gateway's job).

## Requirements

| # | Requirement |
| --- | --- |
| R1 | Run a Eureka server on port 8761. |
| R2 | Do not register with or fetch from any other Eureka node. |
| R3 | Serve the default zone at `http://localhost:8761/eureka/`. |
| R4 | Expose `/health` and `/info` for monitoring. |

## Success Criteria

- All platform services appear in the registry after startup.
- `lb://` lookups resolve to healthy instances.
- The registry recovers its view from client heartbeats after a restart.
