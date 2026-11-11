"""Build the pilot pack from the OSM XML/Overpass and Overture JSON extracts."""
import argparse
import collections
from difflib import SequenceMatcher
import json
import math
from pathlib import Path
import re
import unicodedata
import xml.etree.ElementTree as ET

AREAS = [
    {'name': 'Bologna', 'bounds': [11.325, 44.475, 11.365, 44.506]},
    {'name': 'Savigno', 'bounds': [11.0617, 44.3828, 11.0874, 44.4011]},
]
OSM_CATEGORIES = {'restaurant', 'cafe', 'bar', 'pub', 'fast_food', 'food_court', 'biergarten'}


def distance(lat, lng, row):
    north = (row['lat'] - lat) * 111195
    east = (row['lng'] - lng) * 111195 * math.cos(math.radians(lat))
    return math.hypot(north, east)


def normalized(name):
    ascii_name = unicodedata.normalize('NFKD', name.lower()).encode('ascii', 'ignore').decode()
    words = re.findall(r'[a-z0-9]+', ascii_name)
    return set(words) - {'bar', 'cafe', 'ristorante', 'pizzeria', 'osteria', 'trattoria', 'da', 'di', 'e', 'la', 'il', 'savigno', 'bologna'}


def build_row(source, key, name, lat, lng, category, hours=None, website=None):
    row = dict(id=f'{source}:{key}', name=name.strip(), lat=round(lat, 6),
               lng=round(lng, 6), category=category, sources=[f'{source}:{key}'])
    if hours:
        row['hours'] = hours
    if website and re.match(r'^https?://[^\s]+$', website, re.I):
        row['websiteUri'] = website
    return row


def osm_record(kind, key, tags, lat, lng):
    category = tags.get('amenity')
    if category not in OSM_CATEGORIES:
        category = 'bakery' if tags.get('shop') == 'bakery' else None
    name = tags.get('name', '').strip()
    if name and category and lat is not None and lng is not None:
        return build_row('osm', f'{kind}/{key}', name, lat, lng, category,
                         tags.get('opening_hours'), tags.get('website') or tags.get('contact:website'))


def osm_xml(path):
    root = ET.parse(path).getroot()
    nodes = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in root.findall('node')}
    ways = {w.get('id'): [n.get('ref') for n in w.findall('nd')] for w in root.findall('way')}
    for e in root:
        tags = {t.get('k'): t.get('v') for t in e.findall('tag')}
        if not tags.get('name') or e.tag not in {'node','way','relation'}:
            continue
        if e.tag == 'node':
            points = [nodes[e.get('id')]]
        elif e.tag == 'way':
            points = [nodes[ref] for ref in ways[e.get('id')] if ref in nodes]
        else:
            points = [nodes[ref] for m in e.findall('member')
                      if m.get('type') == 'way' and m.get('role') in {'outer',''}
                      for ref in ways.get(m.get('ref'), []) if ref in nodes]
        if points:
            lat, lng = (sum(axis)/len(points) for axis in zip(*points))
            if row := osm_record(e.tag,e.get('id'),tags,lat,lng):
                yield row


def overture_record(item):
    if item.get('operating_status') in {'permanently_closed','temporarily_closed'} or (item.get('confidence') or 0) < 0.65:
        return None
    taxonomy = item.get('taxonomy') or {}
    kinds = set(taxonomy.get('hierarchy') or []) | {item.get('basic_category'),taxonomy.get('primary')}
    categories = [('fast_food_restaurant','fast_food'),('pub','pub'),('bar','bar'),
                  ('bakery','bakery'),('cafe','cafe'),('food_court','food_court'),('restaurant','restaurant')]
    category = next((value for key,value in categories if key in kinds), None)
    name = ((item.get('names') or {}).get('primary') or '').strip()
    if not category or not name:
        return None
    bbox = item['bbox']
    website = next(iter(item.get('websites') or []), None)
    return build_row('overture', item['id'], name, (bbox['ymin']+bbox['ymax'])/2,
                     (bbox['xmin']+bbox['xmax'])/2, category, website=website)


def matching(a,b):
    d = distance(a['lat'],a['lng'],b)
    if d > 55:
        return False
    names = normalized(a['name']), normalized(b['name'])
    if a['name'].casefold() == b['name'].casefold():
        return True
    if names[0] and names[0] == names[1]:
        return True
    if d <= 30 and names[0] and names[1] and (names[0] < names[1] or names[1] < names[0]):
        return True
    left, right = (' '.join(sorted(words)) for words in names)
    return d <= 15 and min(len(left), len(right)) >= 7 and SequenceMatcher(None,left,right).ratio() >= 0.87


def merge(rows):
    venues=[]
    for row in rows:
        candidates=[other for other in venues if matching(row,other)]
        if not candidates:
            venues.append(row.copy())
            continue
        other=min(candidates,key=lambda candidate:distance(row['lat'],row['lng'],candidate))
        other['sources'] = sorted(set(other['sources']+row['sources']))
        for field in ('hours','websiteUri'):
            if field not in other and row.get(field):
                other[field]=row[field]
    return venues


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('extracts',type=Path)
    parser.add_argument('output',type=Path)
    args=parser.parse_args()
    folder=args.extracts
    overpass=json.loads((folder/'osm-fr').read_text())
    osm={}
    for e in overpass['elements']:
        coords=e.get('center',e)
        if row:=osm_record(e['type'],e['id'],e.get('tags',{}),coords.get('lat'),coords.get('lon')):
            osm[row['id']]=row
    for name in ('rialto','mercanzia','savigno'):
        for row in osm_xml(folder/(name+'-xml')):
            osm[row['id']]=row
    overture=[row for name in ('bologna','savigno')
              for item in json.loads((folder/f'overture-{name}.json').read_text())
              if (row:=overture_record(item))]
    venues=merge([*osm.values(),*overture])
    args.output.write_text(json.dumps({
        'sources':{
            'osm':{'attribution':'© OpenStreetMap contributors','license':'ODbL-1.0',
                   'url':'https://www.openstreetmap.org/copyright',
                   'overpassSnapshot':overpass['osm3s']['timestamp_osm_base']},
            'overture':{'attribution':'Overture Maps Foundation','release':'2026-10-21.0',
                        'url':'https://docs.overturemaps.org/attribution/'},
        },
        'areas':AREAS,'venues':venues,
    },ensure_ascii=False,separators=(',',':'))+'\n')
    for name,lat,lng,radius in [('Rialto',44.488531,11.349276,350),('Mercanzia',44.493586,11.346639,350),('Savigno',44.3919473,11.0745599,1000),('Rialto 1 km',44.488531,11.349276,1000)]:
        nearby=[v for v in venues if distance(lat,lng,v)<=radius]
        print(name,radius,len(nearby),dict(collections.Counter(
            '+'.join(sorted({s.split(':')[0] for s in v['sources']})) for v in nearby)),
            'hours',sum('hours' in v for v in nearby))


if __name__=='__main__':
    main()
