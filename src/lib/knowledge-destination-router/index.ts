/**
 * GO48 / KB-03 — Knowledge Destination Router public API.
 */

export {
  KB03_KNOWLEDGE_DESTINATION_ROUTER_ID,
  KNOWLEDGE_TYPES,
  type KnowledgeAuthority,
  type KnowledgeClassifyInput,
  type KnowledgeDestinationId,
  type KnowledgePersistInput,
  type KnowledgePersistResult,
  type KnowledgeReuseQuery,
  type KnowledgeReuseResult,
  type KnowledgeRoutePlan,
  type KnowledgeRouteStatus,
  type KnowledgeType,
} from "./types";

export {
  DESTINATION_BY_TYPE,
  classifyKnowledge,
  isKnowledgeType,
} from "./classify";

export {
  persistKnowledge,
  resolveKnowledgeReuse,
  routeKnowledge,
} from "./route";
