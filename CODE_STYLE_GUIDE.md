# Adaptive RAG — Code Style Guide

## File Structure

```python
"""Module docstring describing the file's purpose."""

# Standard library
import os
from datetime import datetime

# Third-party
from pydantic import BaseModel

# Local
from src.config.settings import Config
```

## Docstrings (Google-style)

```python
def process_document(content: str, format: str = "text") -> dict:
    """
    One-line summary.

    Args:
        content: The document content to process.
        format: Output format. Defaults to 'text'.

    Returns:
        Dictionary with processed content.

    Raises:
        ValueError: If content is empty.
    """
```

## Naming

| Type | Convention | Example |
|------|-----------|---------|
| Functions/Variables | `snake_case` | `get_user_data()` |
| Classes | `PascalCase` | `ChatHistory` |
| Constants | `UPPER_CASE` | `MAX_RETRIES = 3` |
| Private | `_snake_case` | `_internal_method()` |

## Conventions

- **Type hints** on all function parameters and return types
- **Import order**: stdlib → third-party → local (alphabetical groups)
- **Two blank lines** between top-level definitions, one between class methods
- **Comments explain WHY, not WHAT**
- Keep functions focused (< 30 lines)

## Project-Specific

- RAG pipeline: always document retriever tool instructions, log intermediate steps
- API routes: use proper HTTP status codes, document request/response schemas
- All LLM calls use `llm.with_structured_output(PydanticModel)` for classifiers/graders
- FAISS vector store is a global singleton with disk persistence
- Graph state uses `TypedDict` with `add_messages` reducer

## Before Committing

- [ ] Module/function/class have docstrings
- [ ] Type hints present
- [ ] No commented-out code or unused imports
- [ ] Follows naming conventions
- [ ] PEP 8 compliant (run `black src/` and `isort src/`)
