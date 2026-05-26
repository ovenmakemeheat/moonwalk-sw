#!/usr/bin/env python3
"""Bake pokeemerald (GBA) Littleroot Town into a full-colour browser asset set.

The full-colour successor to build-assets.py (which produced DMG-green pokered art).
Unlike pokered's 2bpp grayscale, pokeemerald ships indexed PNGs + JASC-PAL palettes +
tiny little-endian u16 blobs, so we resolve the GBA palette indirection OFFLINE and emit
flat true-colour RGBA the browser can blit with zero runtime palette logic.

Reads (READ-ONLY) from the pokeemerald clone:
  data/layouts/layouts.json                         layout registry (dims, tilesets)
  data/layouts/LittlerootTown/map.bin               20x20 metatile grid (u16 each)
  data/tilesets/primary/general/{tiles.png,metatiles.bin,palettes/*.pal}
  data/tilesets/secondary/petalburg/{tiles.png,metatiles.bin,palettes/*.pal}
  graphics/pokemon/<species>/{front.png,normal.pal} 12 buddy front sprites
  graphics/field_effects/pics/emotion_{exclamation,question,heart}.png

Emits into ./assets-emerald:
  littleroot-map.json   { name, tileSize:16, wTiles, hTiles, atlasCols, tiles[][], walkable[][] }
  metatiles.png         true-colour atlas: a grid of 16x16 cells, frame index == metatile id
  pokemon/<id>.png      12 recoloured 64x64 RGBA front sprites
  emotes/<happy|question|shock>.png   recoloured 16x16 RGBA emote bubbles

Phaser then renders our existing tiles[][] (metatile ids) straight against metatiles.png
(spritesheet frame N == metatile id N) — same {wTiles,hTiles,tiles,walkable} contract as
the pokered build, plus the one atlas PNG (GBA tiles are palette-indexed, so we pre-bake).

Claim-safety / licensing: pokeemerald is a Nintendo/Game Freak decomp — fine for an
internal demo, commission original art before any public release.
"""
import json, os, struct
from PIL import Image

PE = "/Users/mingrath/ghq/github.com/pret/pokeemerald"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "assets-emerald")

# GBA fieldmap constants (include/fieldmap.h, include/global.fieldmap.h)
NUM_TILES_IN_PRIMARY = 512        # secondary tiles.png indices start here
NUM_METATILES_IN_PRIMARY = 512    # metatile ids >= this come from the secondary tileset
TILE = 8                          # hardware 8x8 px tile
META = 16                         # 16x16 px metatile = 2x2 tiles, 2 layers (8 tiles)
ATLAS_COLS = 32                   # atlas grid width in metatile cells

# Our 12 buddies -> pokeemerald species dir names (all present with front.png + normal.pal)
SPECIES = ["pikachu","bulbasaur","charmander","squirtle","jigglypuff","meowth",
           "psyduck","eevee","mew","gengar","charizard","snorlax"]
# Our emote keys -> pokeemerald field-effect emote pics
EMOTES = {"happy":"emotion_heart", "question":"emotion_question", "shock":"emotion_exclamation"}


# ---------------------------------------------------------------- helpers
def read_pal(path):
    """Parse a JASC-PAL file -> list of (r,g,b), 16 entries."""
    lines = open(path).read().splitlines()
    assert lines[0].strip() == "JASC-PAL", f"{path} not JASC-PAL"
    n = int(lines[2])
    out = []
    for i in range(n):
        r, g, b = (int(x) for x in lines[3 + i].split()[:3])
        out.append((r, g, b))
    return out


def load_indexed(path):
    """Return (width, height, indices) where indices[y*w+x] is the 0..15 palette index."""
    im = Image.open(path)
    assert im.mode == "P", f"{path} mode {im.mode}, expected indexed P"
    w, h = im.size
    return w, h, list(im.getdata())


def tile_pixels(idx, tiles_w, tile_index, hflip, vflip):
    """8x8 palette indices for an 8x8 tile, with optional flips applied.
    Out-of-range indices (runtime-animated/reserved slots) bake as transparent."""
    cols = tiles_w // TILE
    n_tiles = (len(idx) // tiles_w // TILE) * cols
    if tile_index < 0 or tile_index >= n_tiles:
        return [[0] * TILE for _ in range(TILE)]
    tx, ty = (tile_index % cols) * TILE, (tile_index // cols) * TILE
    out = [[0] * TILE for _ in range(TILE)]
    for y in range(TILE):
        for x in range(TILE):
            sx = (TILE - 1 - x) if hflip else x
            sy = (TILE - 1 - y) if vflip else y
            out[y][x] = idx[(ty + sy) * tiles_w + (tx + sx)]
    return out


# ---------------------------------------------------------------- load tilesets
def tileset(name, kind):
    d = f"{PE}/data/tilesets/{kind}/{name}"
    w, h, idx = load_indexed(f"{d}/tiles.png")
    metabin = open(f"{d}/metatiles.bin", "rb").read()
    n_meta = len(metabin) // 16
    metas = [struct.unpack_from("<8H", metabin, m * 16) for m in range(n_meta)]
    pals = [read_pal(f"{d}/palettes/{s:02d}.pal") for s in range(16)]
    return {"w": w, "h": h, "idx": idx, "metas": metas, "pals": pals, "n": n_meta}


prim = tileset("general", "primary")
sec = tileset("petalburg", "secondary")

# Unified GBA BG palette slots: 0-5 from primary, 6-12 from secondary (src/fieldmap.c).
# A tile entry's palette nibble (0-15) indexes this table regardless of source tileset.
def palette_for(slot):
    if slot <= 5:   return prim["pals"][slot]
    if slot <= 12:  return sec["pals"][slot]
    return prim["pals"][0]          # 13-15 unused for BG; safe fallback

# Tiles are global too: index < 512 -> primary tiles.png, else secondary at index-512.
def tile_lookup(tile_index, hflip, vflip):
    if tile_index < NUM_TILES_IN_PRIMARY:
        return tile_pixels(prim["idx"], prim["w"], tile_index, hflip, vflip)
    return tile_pixels(sec["idx"], sec["w"], tile_index - NUM_TILES_IN_PRIMARY, hflip, vflip)


def metatile_entries(meta_id):
    if meta_id < NUM_METATILES_IN_PRIMARY:
        return prim["metas"][meta_id] if meta_id < prim["n"] else None
    sid = meta_id - NUM_METATILES_IN_PRIMARY
    return sec["metas"][sid] if sid < sec["n"] else None


def bake_metatile(meta_id):
    """Composite one 16x16 RGBA metatile: bottom layer (opaque) then top layer (idx0 clear)."""
    entries = metatile_entries(meta_id)
    cell = Image.new("RGBA", (META, META), (0, 0, 0, 0))
    if entries is None:
        return cell
    px = cell.load()
    quad = [(0, 0), (TILE, 0), (0, TILE), (TILE, TILE)]   # TL,TR,BL,BR
    for layer in range(2):                                # 0 bottom, 1 top
        for q in range(4):
            e = entries[layer * 4 + q]
            tile_index = e & 0x03FF
            hflip, vflip = (e >> 10) & 1, (e >> 11) & 1
            pal = palette_for((e >> 12) & 0x0F)
            tp = tile_lookup(tile_index, hflip, vflip)
            ox, oy = quad[q]
            for y in range(TILE):
                for x in range(TILE):
                    ci = tp[y][x]
                    if layer == 1 and ci == 0:
                        continue                          # top layer: index 0 = transparent
                    r, g, b = pal[ci]
                    px[ox + x, oy + y] = (r, g, b, 255)
    return cell


# ---------------------------------------------------------------- map.bin -> grid
layouts = json.load(open(f"{PE}/data/layouts/layouts.json"))["layouts"]
L = next(l for l in layouts if l["id"] == "LAYOUT_LITTLEROOT_TOWN")
W, H = L["width"], L["height"]
blk = open(f"{PE}/data/layouts/LittlerootTown/map.bin", "rb").read()
assert len(blk) == W * H * 2, f"map.bin {len(blk)} != {W*H*2}"
grid = struct.unpack(f"<{W*H}H", blk)

tiles = [[grid[y * W + x] & 0x03FF for x in range(W)] for y in range(H)]
walkable = [[1 if ((grid[y * W + x] >> 10) & 0x3) == 0 else 0 for x in range(W)] for y in range(H)]

# ---------------------------------------------------------------- atlas (frame index == metatile id)
max_id = max(max(row) for row in tiles)
used = sorted({mid for row in tiles for mid in row})
rows = (max_id + ATLAS_COLS) // ATLAS_COLS
atlas = Image.new("RGBA", (ATLAS_COLS * META, rows * META), (0, 0, 0, 0))
for mid in used:
    cell = bake_metatile(mid)
    ax, ay = (mid % ATLAS_COLS) * META, (mid // ATLAS_COLS) * META
    atlas.paste(cell, (ax, ay))

os.makedirs(OUT, exist_ok=True)
atlas.save(f"{OUT}/metatiles.png")

json.dump({
    "name": "LITTLEROOT_TOWN", "tileSize": META,
    "wTiles": W, "hTiles": H, "atlasCols": ATLAS_COLS,
    "tiles": tiles, "walkable": walkable,
}, open(f"{OUT}/littleroot-map.json", "w"))


# ---------------------------------------------------------------- buddy front sprites
def recolour_indexed(src_png, pal, dst, transparent0=True):
    """Recolour an indexed PNG via an explicit palette; index 0 -> transparent."""
    w, h, idx = load_indexed(src_png)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = out.load()
    for y in range(h):
        for x in range(w):
            ci = idx[y * w + x]
            if transparent0 and ci == 0:
                continue
            r, g, b = pal[ci] if ci < len(pal) else (0, 0, 0)
            px[x, y] = (r, g, b, 255)
    out.save(dst)


os.makedirs(f"{OUT}/pokemon", exist_ok=True)
for sp in SPECIES:
    pal = read_pal(f"{PE}/graphics/pokemon/{sp}/normal.pal")
    recolour_indexed(f"{PE}/graphics/pokemon/{sp}/front.png", pal, f"{OUT}/pokemon/{sp}.png")

# ---------------------------------------------------------------- emotes
# The field-effect emotes have no companion .pal (runtime paletteNum). Their embedded
# colormap is the real display palette, so recolour straight from it.
os.makedirs(f"{OUT}/emotes", exist_ok=True)
for key, fx in EMOTES.items():
    src = f"{PE}/graphics/field_effects/pics/{fx}.png"
    im = Image.open(src)
    pal = [tuple(im.getpalette()[i * 3:i * 3 + 3]) for i in range(16)]
    recolour_indexed(src, pal, f"{OUT}/emotes/{key}.png")

# ---------------------------------------------------------------- arena garden
# A 5-stage berry plant (claim-safe: advances per walk-DAY, never wilts). Built from
# pokeemerald's own berry-tree art so each growth stage is real Emerald pixels.
# Each stage is a 16x32 frame (foliage tile on top, trunk/ground tile below).
GARDEN_STAGES = 5
GARDEN_FRAME = (META, META * 2)   # 16 wide x 32 tall


def cell_from_sheet(path, col, row, cell=META):
    """Lift one cell x its embedded palette from an indexed object sheet (idx0 clear)."""
    im = Image.open(path)
    pal = [tuple(im.getpalette()[i * 3:i * 3 + 3]) for i in range(16)]
    w, h = im.size
    idx = list(im.getdata())
    out = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    px = out.load()
    for y in range(cell):
        for x in range(cell):
            ci = idx[(row * cell + y) * w + (col * cell + x)]
            if ci == 0:
                continue
            px[x, y] = pal[ci] + (255,)
    return out


BT = f"{PE}/graphics/object_events/pics/berry_trees"
garden = Image.new("RGBA", (GARDEN_FRAME[0] * GARDEN_STAGES, GARDEN_FRAME[1]), (0, 0, 0, 0))


def place_stage(stage, foliage, trunk):
    """foliage/trunk are 16x16 RGBA cells (either may be None) -> top/bottom of frame."""
    fx = stage * GARDEN_FRAME[0]
    if foliage is not None:
        garden.alpha_composite(foliage, (fx, 0))
    if trunk is not None:
        garden.alpha_composite(trunk, (fx, META))


place_stage(0, None, cell_from_sheet(f"{BT}/dirt_pile.png", 0, 0))          # planted mound
place_stage(1, None, cell_from_sheet(f"{BT}/sprout.png", 0, 0))             # sprout
for stage, col in ((2, 1), (3, 3), (4, 5)):                                  # young, flowering, ripe
    place_stage(stage, cell_from_sheet(f"{BT}/oran.png", col, 0),
                       cell_from_sheet(f"{BT}/oran.png", col, 1))
garden.save(f"{OUT}/garden.png")

walk_n = sum(sum(r) for r in walkable)
print(f"Littleroot {W}x{H} metatiles · walkable {walk_n}/{W*H} · "
      f"{len(used)} unique metatiles (max id {max_id}) · atlas {atlas.size[0]}x{atlas.size[1]}")
print(f"-> {OUT}: littleroot-map.json, metatiles.png, "
      f"{len(SPECIES)} buddies, {len(EMOTES)} emotes, garden.png ({GARDEN_STAGES} stages)")
