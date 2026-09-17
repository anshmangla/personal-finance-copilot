import json

MEMORY_FILE = "memory.json"

def load_memory():

    with open(MEMORY_FILE, "r") as f:
        return json.load(f)

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