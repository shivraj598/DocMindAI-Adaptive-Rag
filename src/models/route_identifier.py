"""
Route identifier model.
"""

from typing import Optional

from pydantic import BaseModel, Field


class RouteIdentifier(BaseModel):
    """Model for routing queries and providing answers."""

    route: str = Field(description="'index', 'general', or 'search'")
    answer: Optional[str] = Field(None, description="Brief answer if route is 'index'")
