"""
backend/coverage.py — backward-compatible shim.
Imports from the new canonical location: backend/core/coverage.py
"""
from backend.core.coverage import coverage_report, IMPLEMENTED_SOLVERS  # noqa: F401
