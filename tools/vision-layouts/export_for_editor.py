"""Regenerate the editor's three aspect-specific layout datasets from the supplied generator."""
import json
from pathlib import Path
from vision_layout_gen import LAYOUTS, generate, export, PALETTES

root = Path(__file__).resolve().parents[2]
output = root / 'src' / 'vision' / 'generatedLayouts'
output.mkdir(parents=True, exist_ok=True)
for name, aspect in [('portrait', 1.77778), ('square', 1), ('landscape', 0.5625)]:
    templates = {f'{family}_{variant + 1:02d}': export(generate(family, 42 + variant, aspect, 'dense', variation=variant)) for family in LAYOUTS for variant in range(3)}
    (output / f'{name}.json').write_text(json.dumps({'templates': templates}, indent=2), encoding='utf-8')
(output / 'palettes.json').write_text(json.dumps(PALETTES, indent=2), encoding='utf-8')
print('Updated portrait, square and landscape editor datasets (42 variants each).')
