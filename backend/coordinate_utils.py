"""
Coordinate conversion: game world coordinates → minimap pixel coordinates.

World space uses (x, z) for horizontal position; y is elevation and ignored.
All minimaps are 1024×1024 pixels. The image origin (0,0) is top-left, so
the v axis is flipped relative to world z.
"""

MAP_CONFIG = {
    "AmbroseValley": {"scale": 900,  "origin_x": -370, "origin_z": -473},
    "GrandRift":     {"scale": 581,  "origin_x": -290, "origin_z": -290},
    "Lockdown":      {"scale": 1000, "origin_x": -500, "origin_z": -500},
}

IMAGE_SIZE = 1024  # All minimaps are 1024×1024 pixels


def world_to_pixel(x: float, z: float, map_id: str) -> tuple[float, float]:
    """
    Convert world (x, z) coordinates to minimap pixel coordinates.

    Returns (pixel_x, pixel_y) in the range [0, 1024].
    pixel_y is flipped because image y grows downward while world z grows upward.
    """
    cfg = MAP_CONFIG[map_id]
    u = (x - cfg["origin_x"]) / cfg["scale"]
    v = (z - cfg["origin_z"]) / cfg["scale"]
    pixel_x = u * IMAGE_SIZE
    pixel_y = (1 - v) * IMAGE_SIZE  # Y is FLIPPED — image origin is top-left
    return pixel_x, pixel_y


def get_supported_maps() -> list[str]:
    return list(MAP_CONFIG.keys())


# ---------------------------------------------------------------------------
# Unit tests (run with: python coordinate_utils.py)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    def _assert_close(a: float, b: float, tol: float = 0.5, label: str = "") -> None:
        assert abs(a - b) < tol, f"{label}: expected ~{b}, got {a}"

    # AmbroseValley origin should map to (0, 1024)
    px, py = world_to_pixel(-370, -473, "AmbroseValley")
    _assert_close(px, 0.0,    label="AV origin px")
    _assert_close(py, 1024.0, label="AV origin py")

    # AmbroseValley far corner (origin + scale) should map to (1024, 0)
    px, py = world_to_pixel(-370 + 900, -473 + 900, "AmbroseValley")
    _assert_close(px, 1024.0, label="AV far corner px")
    _assert_close(py, 0.0,    label="AV far corner py")

    # Centre of GrandRift world should map to (512, 512)
    cx = -290 + 581 / 2
    cz = -290 + 581 / 2
    px, py = world_to_pixel(cx, cz, "GrandRift")
    _assert_close(px, 512.0, label="GR centre px")
    _assert_close(py, 512.0, label="GR centre py")

    print("All coordinate_utils tests passed.")
