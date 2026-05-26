#!/usr/bin/env python3
"""Parse pokered binary map data into a web-friendly tilemap + copy assets.

Reads (read-only) from the pokered repo:
  - maps/PalletTown.blk        grid of block IDs (10x9 blocks, 1 byte each)
  - gfx/blocksets/overworld.bst 128 blocks x 16 tile IDs (4x4 tiles)
  - gfx/tilesets/overworld.png  128x48 = 16x6 grid of 8x8 tiles (2bpp grayscale)
  - data/tilesets/collision_tile_ids.asm  the WALKABLE tile IDs per tileset

Emits into ./assets:
  - pallet-map.json   { wTiles, hTiles, tiles[h][w], walkable[h][w] }
  - overworld.png     the tileset (copied verbatim; recolored at runtime by Phaser)
And copies the pokemon front sprites + emote bubbles already extracted under realtime/assets.
"""
import json, os, shutil
from collections import deque
from PIL import Image

POKERED = "/Users/mingrath/ghq/github.com/Pokered/pokered"

# Classic Game Boy DMG green palette, light -> dark. Everything is recolored into
# these 4 shades so the grayscale pokered art reads as one coherent retro world.
DMG = [(155, 188, 15), (139, 172, 15), (48, 98, 48), (15, 56, 15)]

def shade_index(L):
    """Map an 8-bit grayscale level to one of the 4 DMG shades (0=lightest)."""
    if L >= 192: return 0
    if L >= 128: return 1
    if L >= 64:  return 2
    return 3

def recolor(src, dst, transparent_bg):
    """Recolor a grayscale PNG into the DMG palette. If transparent_bg, flood the
    lightest shade inward from the border to alpha 0 (clean sprite cutout) while
    keeping any lightest pixels enclosed by the sprite as solid highlights."""
    im = Image.open(src).convert("L")
    w, h = im.size
    px = im.load()
    out = Image.new("RGBA", (w, h))
    op = out.load()
    transparent = [[False]*w for _ in range(h)]
    if transparent_bg:
        q = deque()
        for x in range(w):
            for y in (0, h-1):
                if shade_index(px[x, y]) == 0: q.append((x, y))
        for y in range(h):
            for x in (0, w-1):
                if shade_index(px[x, y]) == 0: q.append((x, y))
        while q:
            x, y = q.popleft()
            if x < 0 or y < 0 or x >= w or y >= h or transparent[y][x]: continue
            if shade_index(px[x, y]) != 0: continue
            transparent[y][x] = True
            q.extend([(x+1, y), (x-1, y), (x, y+1), (x, y-1)])
    for y in range(h):
        for x in range(w):
            if transparent[y][x]:
                op[x, y] = (0, 0, 0, 0)
            else:
                r, g, b = DMG[shade_index(px[x, y])]
                op[x, y] = (r, g, b, 255)
    out.save(dst)
HERE = os.path.dirname(os.path.abspath(__file__))
REALTIME = os.path.dirname(HERE)
OUT = os.path.join(HERE, "assets")
os.makedirs(OUT, exist_ok=True)

BLOCKS_W, BLOCKS_H = 10, 9   # PALLET_TOWN from constants/map_constants.asm

# --- parse blockset: 128 blocks, each 16 tile IDs laid out 4x4 row-major ---
bst = open(f"{POKERED}/gfx/blocksets/overworld.bst", "rb").read()
blocks = [list(bst[i*16:(i+1)*16]) for i in range(len(bst)//16)]

# --- parse map: BLOCKS_W*BLOCKS_H block IDs ---
blk = open(f"{POKERED}/maps/PalletTown.blk", "rb").read()
assert len(blk) == BLOCKS_W*BLOCKS_H, f"blk len {len(blk)} != {BLOCKS_W*BLOCKS_H}"

# --- expand blocks -> tile grid (40 x 36 tiles) ---
wT, hT = BLOCKS_W*4, BLOCKS_H*4
tiles = [[0]*wT for _ in range(hT)]
for by in range(BLOCKS_H):
    for bx in range(BLOCKS_W):
        block_id = blk[by*BLOCKS_W + bx]
        block = blocks[block_id]
        for ty in range(4):
            for tx in range(4):
                tiles[by*4+ty][bx*4+tx] = block[ty*4+tx]

# --- parse walkable tile IDs for the Overworld tileset ---
walkable_ids = set()
coll_path = f"{POKERED}/data/tilesets/collision_tile_ids.asm"
lines = open(coll_path).read().splitlines()
in_ow = False
for ln in lines:
    s = ln.strip()
    if s.startswith("Overworld_Coll::"):
        in_ow = True; continue
    if in_ow:
        if s.startswith("coll_tiles"):
            for tok in s.replace("coll_tiles", "").split(","):
                tok = tok.strip()
                if tok.startswith("$"):
                    walkable_ids.add(int(tok[1:], 16))
            break
walkable = [[1 if tiles[y][x] in walkable_ids else 0 for x in range(wT)] for y in range(hT)]

# tileset: recolor into DMG greens, opaque (white tiles stay the lightest shade)
recolor(f"{POKERED}/gfx/tilesets/overworld.png", f"{OUT}/overworld.png", transparent_bg=False)

# buddy sprites + emotes: recolor + border-flood the white background to transparent
for sub in ("pokemon", "emotes"):
    src = os.path.join(REALTIME, "assets", sub)
    dst = os.path.join(OUT, sub)
    os.makedirs(dst, exist_ok=True)
    for f in os.listdir(src):
        if f.endswith(".png"):
            recolor(os.path.join(src, f), os.path.join(dst, f), transparent_bg=True)

json.dump({
    "name": "PALLET_TOWN",
    "tileSize": 8,
    "wTiles": wT, "hTiles": hT,
    "wBlocks": BLOCKS_W, "hBlocks": BLOCKS_H,
    "tilesetCols": 16, "tilesetRows": 6,
    "tiles": tiles,
    "walkable": walkable,
}, open(f"{OUT}/pallet-map.json", "w"))

walk_count = sum(sum(r) for r in walkable)
print(f"map {wT}x{hT} tiles, walkable {walk_count}/{wT*hT} "
      f"({len(walkable_ids)} walkable tile-IDs), assets -> {OUT}")
