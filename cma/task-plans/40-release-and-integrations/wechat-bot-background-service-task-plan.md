# WeChat Bot Background Service Task Plan

## Priority

Priority 4

## Objective

Support durable background automation and external messaging through a service layer.

## Scope

- WeChat bot integration
- background runtime
- notification or task dispatch behavior

## Tasks

### Task 1 — Service Boundary

- keep bot/service logic outside the VS Code extension host
- define clear communication between extension and service

### Task 2 — Bot Use Cases

- notifications
- status updates
- optional task dispatch or reminders

### Task 3 — Reliability and Security

- define credential handling
- define restart/recovery behavior
- keep service failure separate from extension failure

## Exit Criteria

- bot behavior does not depend on the extension being open
- background service architecture is explicit and supportable
