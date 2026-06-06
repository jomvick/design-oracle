def generate_tailwind_config(result: dict) -> str:
    colors = result.get("colors", {}).get("palette", {})
    typography = result.get("typography", {})
    dna = result.get("dna", {})

    lines = []
    lines.append("/** @type {import('tailwindcss').Config} */")
    lines.append("export default {")
    lines.append("  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],")
    lines.append("  theme: {")
    lines.append("    extend: {")
    lines.append("      colors: {")
    lines.append(f"        primary: '{colors.get('primary') or '#6366f1'}',")
    lines.append(f"        secondary: '{colors.get('secondary') or '#8b5cf6'}',")
    lines.append(f"        accent: '{colors.get('accent') or '#f59e0b'}',")
    if colors.get("background_light"):
        lines.append(f"        surface: '{colors['background_light']}',")
    if colors.get("background_dark"):
        lines.append(f"        'surface-dark': '{colors['background_dark']}',")
    lines.append("      },")
    if typography.get("primary_font"):
        pf = typography["primary_font"]
        lines.append("      fontFamily: {")
        lines.append(f"        sans: ['{pf}', 'system-ui', 'sans-serif'],")
        if typography.get("secondary_font"):
            sf = typography["secondary_font"]
            lines.append(f"        display: ['{sf}', 'serif'],")
        lines.append("      },")
    lines.append("      borderRadius: {")
    lines.append("        DEFAULT: '8px',")
    lines.append("        lg: '12px',")
    lines.append("      },")
    if dna.get("complexity") == "Low":
        lines.append("      spacing: {")
        lines.append("        'section': '4rem',")
        lines.append("      },")
    lines.append("    },")
    lines.append("  },")
    lines.append("  plugins: [],")
    lines.append("};")
    return "\n".join(lines)
