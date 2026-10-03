import os

replacements = {
    # Emerald
    'bg-emerald-50/30': 'bg-emerald-50/30 dark:bg-emerald-950/30',
    'border-emerald-100': 'border-emerald-100 dark:border-emerald-900/50',
    'text-emerald-700': 'text-emerald-700 dark:text-emerald-400',
    'bg-emerald-100': 'bg-emerald-100 dark:bg-emerald-900/50',
    'bg-emerald-50': 'bg-emerald-50 dark:bg-emerald-950',
    
    # Rose
    'bg-rose-50/30': 'bg-rose-50/30 dark:bg-rose-950/30',
    'border-rose-100': 'border-rose-100 dark:border-rose-900/50',
    'text-rose-700': 'text-rose-700 dark:text-rose-400',
    'bg-rose-100': 'bg-rose-100 dark:bg-rose-900/50',
    'bg-rose-50': 'bg-rose-50 dark:bg-rose-950',
    'text-rose-800': 'text-rose-800 dark:text-rose-300',

    # Amber
    'bg-amber-50/30': 'bg-amber-50/30 dark:bg-amber-950/30',
    'border-amber-100': 'border-amber-100 dark:border-amber-900/50',
    'text-amber-700': 'text-amber-700 dark:text-amber-400',
    'text-amber-600': 'text-amber-600 dark:text-amber-400',
    'bg-amber-100': 'bg-amber-100 dark:bg-amber-900/50',
    'bg-amber-50': 'bg-amber-50 dark:bg-amber-950',

    # Blue
    'bg-blue-50/30': 'bg-blue-50/30 dark:bg-blue-950/30',
    'border-blue-100': 'border-blue-100 dark:border-blue-900/50',
    'text-blue-700': 'text-blue-700 dark:text-blue-400',
    'bg-blue-100': 'bg-blue-100 dark:bg-blue-900/50',
    'bg-blue-50': 'bg-blue-50 dark:bg-blue-950',

    # Indigo
    'bg-indigo-50/30': 'bg-indigo-50/30 dark:bg-indigo-950/30',
    'border-indigo-100': 'border-indigo-100 dark:border-indigo-900/50',
    'text-indigo-700': 'text-indigo-700 dark:text-indigo-400',
    'bg-indigo-100': 'bg-indigo-100 dark:bg-indigo-900/50',
    'bg-indigo-50': 'bg-indigo-50 dark:bg-indigo-950',

    # Slate / Grays (leftover specific ones not caught by the previous semantic pass)
    'border-slate-100': 'border-slate-100 dark:border-slate-800',
    'border-slate-200': 'border-slate-200 dark:border-slate-800',
    'bg-slate-50': 'bg-slate-50 dark:bg-slate-900',
    'bg-slate-100': 'bg-slate-100 dark:bg-slate-800',
}

files_to_fix = [
    "web/src/app/(app)/dashboard/page.tsx",
    "web/src/app/(app)/transactions/page.tsx",
    "web/src/app/(app)/budgets/page.tsx",
    "web/src/app/(app)/subscriptions/page.tsx",
    "web/src/app/(app)/chat/page.tsx",
]

def clean_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Sort replacements by length descending to avoid partial matches
    sorted_reps = sorted(replacements.items(), key=lambda x: len(x[0]), reverse=True)
    
    import re
    def regex_replace(c, orig, new):
        escaped_orig = re.escape(orig)
        pattern = escaped_orig + r"(?!\s+dark:)"
        return re.sub(pattern, new, c)

    for old, new in sorted_reps:
        content = regex_replace(content, old, new)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

for f in files_to_fix:
    clean_file(f)

print("Color fixes applied.")
