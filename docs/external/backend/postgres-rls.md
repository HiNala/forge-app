# PostgreSQL Row-Level Security — references

Forge tenant isolation is implemented with PostgreSQL **RLS** + session variables (`app.current_org_id`, `app.current_tenant_id`, `app.current_user_id`). Application code still applies explicit `WHERE organization_id = …` filters; RLS is the last line of defense against bugs and generated SQL.

## Authoritative external sources

- **AWS Prescriptive Guidance — Multi-tenant SaaS on Amazon RDS for PostgreSQL** (design patterns for tenant isolation and roles).  
  Search: `AWS PostgreSQL multi-tenant SaaS prescriptive guidance`.

- **Crunchy Data — Row Level Security** (tenant patterns, performance considerations).  
  Search: `Crunchy Data row level security PostgreSQL`.

- PostgreSQL documentation — [Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

Summaries and ADRs may also appear under `docs/architecture/`.
