import json

MEMORY_FILE = "memory.json"

def load_memory():
    with open(MEMORY_FILE, "r") as f:
        data = json.load(f)
        if "budgets" not in data:
            data["budgets"] = {}
        return data

def save_memory(memory):
    with open(MEMORY_FILE, "w") as f:
        json.dump(memory, f, indent=4)

def add_habit(habit):
    memory = load_memory()
    memory["habits"].append(habit)
    save_memory(memory)

def add_goal(goal):
    memory = load_memory()
    memory["goals"].append(goal)
    save_memory(memory)

def get_goals():
    memory = load_memory()
    return memory["goals"]

def get_budgets():
    memory = load_memory()
    return memory.get("budgets", {})

def set_budget(category: str, limit: float):
    memory = load_memory()
    memory.setdefault("budgets", {})
    memory["budgets"][category] = limit
    save_memory(memory)
    return memory["budgets"]