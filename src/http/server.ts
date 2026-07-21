import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import type { UntrustedSourceCat } from "../domain/cat-asset.ts";
import { sanitizeSourceCat } from "../domain/sanitize-source-cat.ts";
import { syncCats } from "../application/sync-cats.ts";
import { CatAssetRepository } from "../storage/cat-asset-repository.ts";

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body, null, 2));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  if (chunks.length === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function authorized(request: IncomingMessage, adminApiKey: string | undefined): boolean {
  if (!adminApiKey || adminApiKey === "change-me") return true;
  return request.headers["x-admin-api-key"] === adminApiKey;
}

export function createHttpServer(
  repository: CatAssetRepository,
  options: { adminApiKey?: string } = {},
) {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      const method = request.method ?? "GET";

      if (method === "GET" && url.pathname === "/health") {
        return json(response, 200, { status: "ok", service: "bangcat-ai-platform" });
      }

      if (method === "GET" && url.pathname === "/v1/cats") {
        const adoptionStatus = url.searchParams.get("adoptionStatus") ?? undefined;
        return json(response, 200, {
          items: repository.list({ adoptionStatus, publicOnly: true }),
        });
      }

      const catMatch = url.pathname.match(/^\/v1\/cats\/([^/]+)$/);
      if (method === "GET" && catMatch) {
        const cat = repository.getById(decodeURIComponent(catMatch[1]));
        return cat ? json(response, 200, cat) : json(response, 404, { error: "cat_not_found" });
      }

      if (method === "POST" && url.pathname === "/v1/sync/preview") {
        if (!authorized(request, options.adminApiKey)) {
          return json(response, 401, { error: "unauthorized" });
        }
        const body = (await readJson(request)) as UntrustedSourceCat;
        const result = sanitizeSourceCat(body);
        return json(response, 200, result);
      }

      if (method === "POST" && url.pathname === "/v1/sync/fixture") {
        if (!authorized(request, options.adminApiKey)) {
          return json(response, 401, { error: "unauthorized" });
        }
        const body = await readJson(request);
        if (!Array.isArray(body)) {
          return json(response, 400, { error: "body_must_be_an_array" });
        }
        return json(response, 200, syncCats(repository, body as UntrustedSourceCat[], "fixture"));
      }

      return json(response, 404, { error: "not_found" });
    } catch (error) {
      return json(response, 400, {
        error: "request_failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
