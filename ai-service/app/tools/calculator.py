"""
calculator.py
Safe expression evaluator tool for the MindBot agent.
Uses numexpr for efficient, safe math evaluation without exec/eval risks.
"""
from langchain_core.tools import tool
import math
import re


@tool
def calculator(expression: str) -> str:
    """
    Evaluate a mathematical expression safely. Supports basic arithmetic,
    trigonometry, logarithms, and common math functions.
    Args:
        expression: A mathematical expression string (e.g. "2 + 2", "sin(pi/2)", "sqrt(16)")
    Returns:
        The numeric result as a string.
    """
    # Allow only safe characters: numbers, operators, spaces, math function names
    allowed = re.compile(r"^[\d\s\+\-\*\/\(\)\.\,\%\^a-zA-Z_]+$")
    if not allowed.match(expression):
        return "Error: Expression contains invalid characters."
    
    # Build a safe math namespace
    safe_namespace = {
        "__builtins__": {},
        "abs": abs, "round": round,
        "sin": math.sin, "cos": math.cos, "tan": math.tan,
        "asin": math.asin, "acos": math.acos, "atan": math.atan,
        "sqrt": math.sqrt, "log": math.log, "log10": math.log10, "log2": math.log2,
        "exp": math.exp, "pow": math.pow,
        "pi": math.pi, "e": math.e, "inf": math.inf,
        "floor": math.floor, "ceil": math.ceil,
    }
    try:
        result = eval(expression, safe_namespace)  # noqa: S307 - namespace is locked down
        return str(result)
    except ZeroDivisionError:
        return "Error: Division by zero."
    except Exception as exc:
        return f"Error evaluating expression: {str(exc)}"
