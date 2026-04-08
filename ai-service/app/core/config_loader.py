"""
config_loader.py
Loads and provides access to config.yaml settings.
"""
import yaml
import os
from pathlib import Path


_config: dict = {}


def load_config(path: str = None) -> dict:
    global _config
    if _config:
        return _config
    if path is None:
        # Default: config.yaml sits at the ai-service root
        path = Path(__file__).parents[2] / "config.yaml"
    with open(path, "r") as f:
        _config = yaml.safe_load(f)
    return _config


def get(key_path: str, default=None):
    """
    Dot-notation key access. e.g. get("llm.default_model")
    """
    config = load_config()
    keys = key_path.split(".")
    val = config
    for k in keys:
        if isinstance(val, dict):
            val = val.get(k)
        else:
            return default
        if val is None:
            return default
    return val
