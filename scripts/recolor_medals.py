from PIL import Image
import colorsys

# The 5 family "gold" source images -- everything else in public/medals/ stays
# as a single, unrecolored image (the 4 single-tier specials never need
# silver/bronze variants).
SOURCES = ['fire_medal', 'crown_medal', 'nutrition_bowl', 'cookbook_medal', 'community_medal']
MEDALS_DIR = 'public/medals'

# Gold hue band to detect (yellows/golds ~25-65 on the 0-360 wheel) -- pixels
# outside this range (the purple ribbon, black outline, white background/
# transparency) are left untouched entirely.
GOLD_HUE_MIN, GOLD_HUE_MAX = 25, 65

TIER_RECOLOR = {
    # (target_hue_deg, target_saturation, value_multiplier)
    # Silver: absolute (not multiplied) target saturation, cool steel-blue
    # hue -- multiplying the original gold saturation left near-white
    # highlight pixels reading as blown-out paper instead of metal.
    'silver': (216, 0.14, 0.92),
    'bronze': (28, 0.85, 0.80),  # shift toward copper/orange, darker overall
}


def recolor(path_in, path_out, tier):
    img = Image.open(path_in).convert('RGBA')
    px = img.load()
    target_hue, target_sat, val_mult = TIER_RECOLOR[tier]
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if not (GOLD_HUE_MIN / 360 <= h <= GOLD_HUE_MAX / 360):
                continue  # not a gold-disc pixel -- leave ribbon/outline alone
            new_h = target_hue / 360
            new_s = target_sat if tier == 'silver' else min(1, s * target_sat)
            new_v = min(1, v * val_mult)
            nr, ng, nb = colorsys.hsv_to_rgb(new_h, new_s, new_v)
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    img.save(path_out)


if __name__ == '__main__':
    for name in SOURCES:
        src = f'{MEDALS_DIR}/{name}.png'
        recolor(src, f'{MEDALS_DIR}/{name}_silver.png', 'silver')
        recolor(src, f'{MEDALS_DIR}/{name}_bronze.png', 'bronze')
        print(f'{name}: silver + bronze variants written')
