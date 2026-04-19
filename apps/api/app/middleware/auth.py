"""
JWT verification for Clerk (ADR-002).

Verification runs in FastAPI dependencies (`app.deps.auth`) so routes receive a
resolved :class:`~app.db.models.user.User` before DB session + RLS context.
"""
