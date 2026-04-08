"""
python_repl.py
Python code execution tool for the MindBot agent.
WARNING: Only enable in trusted/local environments. Controlled by config.yaml.
"""
import sys
import io
from langchain_core.tools import tool
from app.core.config_loader import get


@tool
def python_repl(code: str) -> str:
    """
    Execute Python code and return the output. Use this for complex calculations,
    data analysis, string manipulation, or any task requiring programmatic logic.
    Args:
        code: Valid Python code to execute.
    Returns:
        The stdout output of the executed code, or any error messages.
    """
    if not get("tools.python_repl.enabled", False):
        return "Python REPL tool is disabled in the configuration."
    
    # Capture stdout
    old_stdout = sys.stdout
    sys.stdout = captured = io.StringIO()
    
    try:
        # Create a clean execution namespace
        exec_globals = {"__builtins__": __builtins__}
        exec(code, exec_globals)  # noqa: S102
        output = captured.getvalue()
        return output if output else "Code executed successfully with no output."
    except Exception as exc:
        return f"Execution error: {type(exc).__name__}: {str(exc)}"
    finally:
        sys.stdout = old_stdout
