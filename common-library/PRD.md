# Common Library — PRD

## Overview

`common-library` provides the shared contracts and infrastructure that
every Art Academy service depends on, so security, API responses, error
handling, event messaging, and logging behave identically across the
platform. It is a JAR dependency, not a runnable service — no port and no
database.

## Goals

- Be the single source of truth for Kafka event DTOs and topic constants.
- Provide consistent JWT handling across all services.
- Provide a uniform API response envelope and exception model.
- Provide shared logging configuration.

## Non-Goals

- No business logic, REST controllers, persistence, or standalone runtime.
- No Kafka broker or topic provisioning.

## Requirements

| # | Requirement |
| --- | --- |
| R1 | Provide Kafka event DTOs and the canonical `KafkaTopics` constants so no service hardcodes topic strings. |
| R2 | Provide `FeeType` and `FeeCadence` enums. |
| R3 | Provide `JwtUtil` (generate/validate, roles + bootstrap claim, 15-min expiry) and `JwtAuthenticationFilter` (populates `SecurityContext` with `ROLE_` authorities). |
| R4 | Provide `ApiResponse<T>` with `success`/`error` builders. |
| R5 | Provide `ApiException` with `notFound`/`badRequest`/`forbidden`/`conflict` factories. |
| R6 | Provide `logback-spring.xml`: console (non-docker) and JSON-to-Logstash (docker), tagging each line with a `service` field. |

## Notes

- Event DTO fields and topic strings form a wire contract; changes must be
  coordinated across producers and consumers.
- Some event DTOs and topic constants exist without an active
  producer/consumer today and are available for future use.
