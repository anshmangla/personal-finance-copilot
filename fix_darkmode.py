import os
import glob

def fix_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # The issue: Hardcoded tailwind colors don't work in dark mode.
    # We will append dark: classes to common hardcoded classes.

    replacements = {
        "bg-white": "bg-white dark:bg-slate-950",
        "bg-slate-50": "bg-slate-50 dark:bg-slate-900",
        "bg-slate-100": "bg-slate-100 dark:bg-slate-800",
        "bg-slate-200": "bg-slate-200 dark:bg-slate-700",
        
        "text-slate-900": "text-slate-900 dark:text-slate-50",
        "text-slate-800": "text-slate-800 dark:text-slate-100",
        "text-slate-700": "text-slate-700 dark:text-slate-200",
        "text-slate-600": "text-slate-600 dark:text-slate-300",
        "text-slate-500": "text-slate-500 dark:text-slate-400",
        
        "border-slate-100": "border-slate-100 dark:border-slate-800",
        "border-slate-200": "border-slate-200 dark:border-slate-800",
        
        # Specific cases for opacity/gradients
        "bg-white/40": "bg-white/40 dark:bg-slate-950/40",
        "bg-white/60": "bg-white/60 dark:bg-slate-950/60",
        "bg-white/70": "bg-white/70 dark:bg-slate-950/70",
        "bg-white/80": "bg-white/80 dark:bg-slate-950/80",
        "bg-gradient-to-br from-slate-50 to-slate-100/80": "bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-slate-950 dark:to-slate-900/80",
        
        # specific fixes for the bad replaces in layout
        "bg-white dark:bg-slate-950/60 dark:bg-slate-950/60": "bg-white/60 dark:bg-slate-950/60",
        "bg-white dark:bg-slate-950/40 dark:bg-slate-950/40": "bg-white/40 dark:bg-slate-950/40",
        "bg-white dark:bg-slate-950/70 dark:bg-slate-950/70": "bg-white/70 dark:bg-slate-950/70",
        "bg-white dark:bg-slate-950 dark:bg-slate-950": "bg-white dark:bg-slate-950",
        "text-slate-900 dark:text-slate-50 dark:text-slate-50": "text-slate-900 dark:text-slate-50",
        "text-slate-800 dark:text-slate-100 dark:text-slate-100": "text-slate-800 dark:text-slate-100",
        "border-slate-200/60 dark:border-slate-800/60 dark:border-slate-800/60": "border-slate-200/60 dark:border-slate-800/60",
        "border-slate-100/60 dark:border-slate-800/60 dark:border-slate-800/60": "border-slate-100/60 dark:border-slate-800/60",
        "hover:bg-slate-100/50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-800/50": "hover:bg-slate-100/50 dark:hover:bg-slate-800/50",
        "bg-slate-50 dark:bg-slate-900 dark:bg-slate-900": "bg-slate-50 dark:bg-slate-900",
        "border-white dark:border-slate-800 dark:border-slate-800": "border-white dark:border-slate-800",
    }

    # We want to restore original state first if it was double-replaced
    for key, value in replacements.items():
        if "dark:" in key: # These are our cleanup keys
            content = content.replace(key, value)

    # Now apply to files carefully (don't double replace)
    # We can do this by regex or careful ordering.
    import re
    
    # Simple regex replacing strictly the original class if it's not already followed by dark: variant
    def regex_replace(c, orig, new):
        # replace `bg-white` but only if it's not already `bg-white dark:...`
        escaped_orig = re.escape(orig)
        # negative lookahead to ensure we don't double append
        pattern = escaped_orig + r"(?!\s+dark:)"
        return re.sub(pattern, new, c)

    for orig, new in replacements.items():
        if "dark:" not in orig:
            content = regex_replace(content, orig, new)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)


files_to_fix = [
    "web/src/app/(app)/layout.tsx",
    "web/src/app/(app)/dashboard/page.tsx",
    "web/src/app/(app)/transactions/page.tsx",
    "web/src/app/(app)/budgets/page.tsx",
    "web/src/app/(app)/subscriptions/page.tsx",
    "web/src/app/(app)/chat/page.tsx",
]

for f in files_to_fix:
    fix_file(f)

print("Dark mode classes fixed across all files.")
