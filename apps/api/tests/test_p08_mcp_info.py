def test_mcp_routes_registered() -> None:
    from app.main import app

    route_paths = [getattr(r, "path", "") for r in app.routes]
    assert any(p and "mcp/v1" in p for p in route_paths)
