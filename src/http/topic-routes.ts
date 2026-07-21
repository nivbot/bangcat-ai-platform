import type { IncomingMessage, ServerResponse } from "node:http";
import type { URL } from "node:url";
import type {
  CatOpportunityInput,
  ReferenceContentInput,
  ScoreTopicInput,
  TopicCandidateInput,
  TrendSignalInput,
  ViralPatternInput,
} from "../domain/topic-engine-records.ts";
import { TopicEngineRepository } from "../storage/topic-engine-repository.ts";

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body, null, 2));
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  if (chunks.length === 0) return {};
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("body_must_be_an_object");
  }
  return parsed as Record<string, unknown>;
}

function actor(request: IncomingMessage) {
  const actorType =
    typeof request.headers["x-actor-type"] === "string"
      ? request.headers["x-actor-type"]
      : "admin_api";
  const actorId =
    typeof request.headers["x-actor-id"] === "string"
      ? request.headers["x-actor-id"]
      : null;
  return { actorType, actorId };
}

function itemMatch(pathname: string, collection: string): string | null {
  const match = pathname.match(new RegExp(`^/v1/topic/${collection}/([^/]+)$`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function handleTopicRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  method: string,
  repository: TopicEngineRepository,
): Promise<boolean> {
  if (!url.pathname.startsWith("/v1/topic/")) return false;
  const context = actor(request);

  if (url.pathname === "/v1/topic/trends") {
    if (method === "GET") {
      json(response, 200, {
        items: repository.listTrends(url.searchParams.get("status") ?? undefined),
      });
      return true;
    }
    if (method === "POST") {
      json(
        response,
        201,
        repository.saveTrend(
          (await readJson(request)) as unknown as TrendSignalInput,
          context,
        ),
      );
      return true;
    }
  }

  const trendId = itemMatch(url.pathname, "trends");
  if (trendId) {
    if (method === "GET") {
      const item = repository.getTrend(trendId);
      json(response, item ? 200 : 404, item ?? { error: "trend_not_found" });
      return true;
    }
    if (method === "PUT") {
      json(
        response,
        200,
        repository.saveTrend(
          { ...(await readJson(request)), id: trendId } as unknown as TrendSignalInput,
          context,
        ),
      );
      return true;
    }
  }

  if (url.pathname === "/v1/topic/references") {
    if (method === "GET") {
      json(response, 200, {
        items: repository.listReferences(url.searchParams.get("platform") ?? undefined),
      });
      return true;
    }
    if (method === "POST") {
      json(
        response,
        201,
        repository.saveReference(
          (await readJson(request)) as unknown as ReferenceContentInput,
          context,
        ),
      );
      return true;
    }
  }

  const referenceId = itemMatch(url.pathname, "references");
  if (referenceId) {
    if (method === "GET") {
      const item = repository.getReference(referenceId);
      json(response, item ? 200 : 404, item ?? { error: "reference_not_found" });
      return true;
    }
    if (method === "PUT") {
      json(
        response,
        200,
        repository.saveReference(
          { ...(await readJson(request)), id: referenceId } as unknown as ReferenceContentInput,
          context,
        ),
      );
      return true;
    }
  }

  if (url.pathname === "/v1/topic/patterns") {
    if (method === "GET") {
      json(response, 200, {
        items: repository.listPatterns(url.searchParams.get("status") ?? undefined),
      });
      return true;
    }
    if (method === "POST") {
      json(
        response,
        201,
        repository.savePattern(
          (await readJson(request)) as unknown as ViralPatternInput,
          context,
        ),
      );
      return true;
    }
  }

  const patternId = itemMatch(url.pathname, "patterns");
  if (patternId) {
    if (method === "GET") {
      const item = repository.getPattern(patternId);
      json(response, item ? 200 : 404, item ?? { error: "pattern_not_found" });
      return true;
    }
    if (method === "PUT") {
      json(
        response,
        200,
        repository.savePattern(
          { ...(await readJson(request)), id: patternId } as unknown as ViralPatternInput,
          context,
        ),
      );
      return true;
    }
  }

  if (url.pathname === "/v1/topic/opportunities") {
    if (method === "GET") {
      json(response, 200, {
        items: repository.listOpportunities({
          catId: url.searchParams.get("catId") ?? undefined,
          status: url.searchParams.get("status") ?? undefined,
        }),
      });
      return true;
    }
    if (method === "POST") {
      json(
        response,
        201,
        repository.saveOpportunity(
          (await readJson(request)) as unknown as CatOpportunityInput,
          context,
        ),
      );
      return true;
    }
  }

  const opportunityId = itemMatch(url.pathname, "opportunities");
  if (opportunityId) {
    if (method === "GET") {
      const item = repository.getOpportunity(opportunityId);
      json(response, item ? 200 : 404, item ?? { error: "opportunity_not_found" });
      return true;
    }
    if (method === "PUT") {
      json(
        response,
        200,
        repository.saveOpportunity(
          { ...(await readJson(request)), id: opportunityId } as unknown as CatOpportunityInput,
          context,
        ),
      );
      return true;
    }
  }

  if (url.pathname === "/v1/topic/candidates") {
    if (method === "GET") {
      json(response, 200, {
        items: repository.listCandidates({
          catId: url.searchParams.get("catId") ?? undefined,
          platform: url.searchParams.get("platform") ?? undefined,
          status: url.searchParams.get("status") ?? undefined,
        }),
      });
      return true;
    }
    if (method === "POST") {
      json(
        response,
        201,
        repository.saveCandidate(
          (await readJson(request)) as unknown as TopicCandidateInput,
          context,
        ),
      );
      return true;
    }
  }

  const scoreMatch = url.pathname.match(/^\/v1\/topic\/candidates\/([^/]+)\/score$/);
  if (method === "POST" && scoreMatch) {
    json(
      response,
      200,
      repository.scoreCandidate(
        decodeURIComponent(scoreMatch[1]),
        (await readJson(request)) as unknown as ScoreTopicInput,
        context,
      ),
    );
    return true;
  }

  const statusMatch = url.pathname.match(/^\/v1\/topic\/candidates\/([^/]+)\/status$/);
  if (method === "POST" && statusMatch) {
    const body = await readJson(request);
    json(
      response,
      200,
      repository.updateCandidateStatus(
        decodeURIComponent(statusMatch[1]),
        String(body.status ?? ""),
        context,
      ),
    );
    return true;
  }

  const candidateId = itemMatch(url.pathname, "candidates");
  if (candidateId) {
    if (method === "GET") {
      const item = repository.getCandidate(candidateId);
      json(response, item ? 200 : 404, item ?? { error: "topic_candidate_not_found" });
      return true;
    }
    if (method === "PUT") {
      json(
        response,
        200,
        repository.saveCandidate(
          { ...(await readJson(request)), id: candidateId } as unknown as TopicCandidateInput,
          context,
        ),
      );
      return true;
    }
  }

  json(response, 404, { error: "topic_route_not_found" });
  return true;
}
