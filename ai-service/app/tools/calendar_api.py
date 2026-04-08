"""
calendar_api.py
Mock calendar tool — stores events in a local JSON file.
Designed with a minimal token footprint since it will be replaced later.
"""
import json
import os
from datetime import datetime
from langchain_core.tools import tool
from app.core.config_loader import get


def _load_calendar() -> list:
    path = get("tools.calendar.data_path", "./data/calendar.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not os.path.exists(path):
        return []
    with open(path, "r") as f:
        return json.load(f)


def _save_calendar(events: list) -> None:
    path = get("tools.calendar.data_path", "./data/calendar.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(events, f, indent=2)


@tool
def calendar_get_events(date: str = None) -> str:
    """
    Retrieve calendar events. Optionally filter by date (YYYY-MM-DD format).
    If no date is provided, returns all upcoming events.
    Args:
        date: Optional date string in YYYY-MM-DD format.
    Returns:
        A formatted list of events.
    """
    events = _load_calendar()
    now = datetime.now().isoformat()
    upcoming = [e for e in events if e.get("datetime", "") >= now]
    if date:
        upcoming = [e for e in upcoming if e.get("datetime", "").startswith(date)]
    if not upcoming:
        return "No events found."
    return "\n".join(
        f"- [{e['datetime'][:16]}] {e['title']}: {e.get('description', '')}"
        for e in sorted(upcoming, key=lambda x: x["datetime"])
    )


@tool
def calendar_add_event(title: str, datetime_str: str, description: str = "") -> str:
    """
    Add a new event to the calendar.
    Args:
        title: Short event title.
        datetime_str: Date and time in YYYY-MM-DD HH:MM format.
        description: Optional longer description.
    Returns:
        Confirmation message.
    """
    try:
        # Validate the format
        dt = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M")
    except ValueError:
        return "Invalid datetime format. Use YYYY-MM-DD HH:MM."
    events = _load_calendar()
    events.append({
        "id": len(events) + 1,
        "title": title,
        "datetime": dt.isoformat(),
        "description": description,
    })
    _save_calendar(events)
    return f"Event '{title}' added for {datetime_str}."
