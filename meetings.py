import json
import os
from typing import Optional

MEETINGS_FILE = "meetings.json"


class MeetingManager:
    def __init__(self):
        self.meetings = self._load()

    def _load(self) -> list:
        if os.path.exists(MEETINGS_FILE):
            with open(MEETINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        return []

    def _save(self) -> None:
        with open(MEETINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(self.meetings, f, ensure_ascii=False, indent=2)

    def add_meeting(self, title: str, date: str, time: str, description: str = "") -> dict:
        meeting = {
            "title": title.strip(),
            "date": date.strip(),
            "time": time.strip(),
            "description": description.strip(),
        }
        self.meetings.append(meeting)
        self._save()
        return meeting

    def get_all_meetings(self) -> list:
        return self.meetings

    def delete_meeting(self, index: int) -> Optional[dict]:
        if 0 <= index < len(self.meetings):
            deleted = self.meetings.pop(index)
            self._save()
            return deleted
        return None

    def find_meetings_by_date(self, date: str) -> list:
        return [m for m in self.meetings if m["date"] == date]
