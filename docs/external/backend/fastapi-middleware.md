# FastAPI middleware — references

Forge BI-02 builds a **Starlette / FastAPI** middleware stack (see [REQUEST_PIPELINE.md](../../architecture/REQUEST_PIPELINE.md)).

## External references

- [FastAPI Middleware](https://fastapi.tiangolo.com/tutorial/middleware/) — order and CORS caveats.
- [Starlette CORS](https://www.starlette.io/middleware/#corsmiddleware) — `allow_credentials` and wildcards.
- Multi-tenant API patterns — search: *Building Multi-Tenant APIs with FastAPI* (subdomain vs header; Forge uses **header-first** `X-Forge-Active-Org-Id` plus optional subdomain slug resolution).

Forge uses a **single pooled** PostgreSQL connection with **RLS session variables**, not a database-per-tenant.
