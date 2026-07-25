# Design

The Angular service consumes SSE with authenticated `fetch`, because native `EventSource` cannot attach the bearer token used by this application. It emits only invalidation notifications. The page then uses the existing authorized HTTP endpoints to refresh inbox state.
