"""Convert the public-domain X.Org 7x13 bitmap to scalable pixel outlines."""
from collections import defaultdict
import gzip
from io import BytesIO
from pathlib import Path
import struct
import sys
from PIL import ImageFont


def pack(fmt, *values):
    return struct.pack('>' + fmt, *values)


def pad(data):
    return data + bytes(-len(data) % 4)


def checksum(data):
    data = pad(data)
    return sum(struct.unpack(f'>{len(data) // 4}I', data)) & 0xffffffff


def boundary_edges(mask):
    width, height = mask.size
    edges = set()
    for row in range(height):
        for x in range(width):
            if not mask[row * width + x]:
                continue
            y = 10 - row
            square = ((x, y), (x, y + 1), (x + 1, y + 1), (x + 1, y))
            for start, end in zip(square, (*square[1:], square[0])):
                if (end, start) in edges:
                    edges.remove((end, start))
                else:
                    edges.add((start, end))
    return edges


def trace_outline(edges):
    outgoing = defaultdict(set)
    for start, end in edges:
        outgoing[start].add(end)

    contours = []
    while edges:
        start, end = min(edges)
        vertices = []
        while True:
            edges.remove((start, end))
            outgoing[start].remove(end)
            vertices.append(start)
            if end == vertices[0]:
                break
            dx, dy = end[0] - start[0], end[1] - start[1]
            directions = ((dy, -dx), (dx, dy), (-dy, dx))
            points = ((end[0] + x, end[1] + y) for x, y in directions)
            start, end = end, next(point for point in points if point in outgoing[end])
        corners = []
        for index, point in enumerate(vertices):
            before, after = vertices[index - 1], vertices[(index + 1) % len(vertices)]
            if not (before[0] == point[0] == after[0] or before[1] == point[1] == after[1]):
                corners.append((point[0] * 64, point[1] * 64))
        contours.append(corners)
    return contours


def glyph(character):
    contours = trace_outline(boundary_edges(bitmap.getmask(character)))
    points = [point for contour in contours for point in contour]
    if not points:
        return b'', 0, 0, 0
    xs, ys = zip(*points)
    bounds = (min(xs), min(ys), max(xs), max(ys))
    data = pack('5h', len(contours), *bounds)
    end = -1
    for contour in contours:
        end += len(contour)
        data += pack('H', end)
    data += pack('H', 0) + bytes([1]) * len(points)
    for axis in (0, 1):
        previous = 0
        for point in points:
            data += pack('h', point[axis] - previous)
            previous = point[axis]
    return pad(data), bounds[0], len(contours), len(points)


source = Path(sys.argv[1] if len(sys.argv) > 1 else '/usr/share/fonts/X11/misc/7x13B.pcf.gz')
bitmap = ImageFont.truetype(BytesIO(gzip.decompress(source.read_bytes())), 13)
ranges = [(32, 126), (160, 160), (171, 171), (183, 183), (187, 187), (1025, 1025), (1040, 1103), (1105, 1105),
          (8211, 8212), (8592, 8595)]
segments = []
characters = ['?']
for start, end in ranges:
    segments.append((start, end, len(characters) - start))
    characters.extend(chr(point) for point in range(start, end + 1))
segments.append((65535, 65535, 1))

outlines, bearings, contours, point_counts = zip(*(glyph(character) for character in characters))
locations = [0]
for outline in outlines:
    locations.append(locations[-1] + len(outline))

seg_count = len(segments)
seg_power = 2 ** (seg_count.bit_length() - 1)
cmap4 = pack('7H', 4, 16 + seg_count * 8, 0, seg_count * 2, seg_power * 2, seg_power.bit_length() - 1, (seg_count - seg_power) * 2)
cmap4 += pack(f'{seg_count}HH', *(end for _, end, _ in segments), 0)
cmap4 += pack(f'{seg_count}H', *(start for start, _, _ in segments))
cmap4 += pack(f'{seg_count}H', *(delta & 0xffff for _, _, delta in segments)) + bytes(seg_count * 2)

family = 'Orchard Pixel'
name_pairs = [(0, 'Bitmap outlines derived from the public-domain X.Org 7x13B font.'),
              (1, family), (2, 'Regular'), (4, family), (5, 'Version 1.0'), (6, 'OrchardPixel'),
              (13, 'Original bitmap from X.Org font-misc-misc: Public domain font. Share and enjoy.')]
name_records, strings = [], bytearray()
for name_id, value in name_pairs:
    encoded = value.encode('utf-16-be')
    name_records.append(pack('6H', 3, 1, 0x409, name_id, len(encoded), len(strings)))
    strings.extend(encoded)

unit, ascent, descent, advance = 832, 704, 128, 448
head = pack('4I2H2Q4h2H3h', 0x10000, 0x10000, 0, 0x5f0f3cf5, 3, unit, 0, 0,
            0, -descent, advance, ascent, 0, 7, 2, 1, 0)
hhea = pack('I3hH11hH', 0x10000, ascent, -descent, 0, advance, 0, 0, advance, 1, 0, 0, 0, 0, 0, 0, 0, len(characters))
maxp = pack('I14H', 0x10000, len(characters), max(point_counts), max(contours), 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0)
os2 = pack('Hh3H11h', 0, advance, 400, 5, 0, 320, 410, 0, 72, 320, 410, 0, 180, 64, 295, 0)
os2 += bytes(10) + pack('4I', 513, 0, 0, 0) + b'XORG' + pack('3H3h2H', 64, 32, 8595, ascent, -descent, 0, ascent, descent)

tables = {
    b'OS/2': os2, b'cmap': pack('4HI', 0, 1, 3, 1, 12) + cmap4,
    b'glyf': b''.join(outlines), b'head': head, b'hhea': hhea,
    b'hmtx': b''.join(pack('Hh', advance, left) for left in bearings),
    b'loca': b''.join(pack('I', offset) for offset in locations), b'maxp': maxp,
    b'name': pack('3H', 0, len(name_records), 6 + 12 * len(name_records)) + b''.join(name_records) + strings,
    b'post': pack('IIhh5I', 0x30000, 0, -85, 46, 1, 0, 0, 0, 0),
}
num_tables = len(tables)
power = 2 ** (num_tables.bit_length() - 1)
header = pack('I4H', 0x10000, num_tables, power * 16, power.bit_length() - 1, (num_tables - power) * 16)
body, records = bytearray(), bytearray()
head_offset = 0
for tag, data in sorted(tables.items()):
    offset = 12 + num_tables * 16 + len(body)
    records.extend(tag + pack('3I', checksum(data), offset, len(data)))
    body.extend(pad(data))
    if tag == b'head':
        head_offset = offset
font = bytearray(header + records + body)
font[head_offset + 8:head_offset + 12] = pack('I', (0xb1b0afba - checksum(font)) & 0xffffffff)
Path('src/orchard-pixel.ttf').write_bytes(font)
