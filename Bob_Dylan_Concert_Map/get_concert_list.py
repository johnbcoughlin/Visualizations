#!/usr/local/bin/python2.7

import urllib2
import re
import time
from xml.dom.minidom import parseString
from unidecode import unidecode

performance_list = []

def get_performances(f):
    while True:
        try:
            date = get_next_date(f)
            location = get_next_location(f)
            lat, long = geocode(location)
            print u'\t'.join([location, date, lat, long]).encode('utf8')
            geocode(location)
        except (TypeError, AttributeError):
            break

def get_next_location(f):
    location_regex = re.compile(ur'<span>(.+)</span>', re.UNICODE)
    location_match = None
    while not location_match:
        try:
            location_match = re.search(location_regex, f.next().strip())
        except StopIteration:
            return None
    try:
        location = location_match.group(1)
    except AttributeError:
        print 'hit attribute error in location matching'
        return None
    return unicode(location, 'utf8')

def get_next_date(f):
    date_regex = re.compile(r'<li class=\'with-date\'><h3>(.+)</h3></li>')
    date_match = None
    while not date_match:
        try:
            date_match = re.search(date_regex, f.next().strip())
        except StopIteration:
            return None
    try:
        date = date_match.group(1)
        date = time.strptime(date, '%A %d %B %Y')
        formatted_date = time.strftime('%d %b, %Y', date)
        return formatted_date
    except AttributeError:
        print 'hit attribute error in date matching'
        return None

def geocode(location):
    root_url = r'http://worldkit.org/geocoder/rest/?city='
    location = [p.strip() for p in location.split(',')]
    country = location[-1]
    # If we're not in the US, get rid of any state or provincial codes
    if country != 'US' and len(location) == 3:
        location.pop(1)
    try:
        location[-1] = country_codes[country]
    except KeyError:
        pass
    query_url = strip_accents((root_url + ','.join(location)).replace(' ', '%20'))
    xml = urllib2.urlopen(query_url)
    data = xml.read()
    xml.close()
    dom = parseString(data)

    try:
        long = dom.getElementsByTagName('geo:long')[0].toxml()
        long = long.replace('<geo:long>', '').replace('</geo:long>', '')

        lat = dom.getElementsByTagName('geo:lat')[0].toxml()
        lat = lat.replace('<geo:lat>', '').replace('</geo:lat>', '')

        return lat, long
    except IndexError:
        return 'unknown', 'unknown'

def get_country_code_map():
    f = urllib2.urlopen('http://brainoff.com/geocoder/countryselect.php')
    f.next()
    f.next()
    pattern = re.compile(r'<option  value=\"(\w\w)\">(.+)</option>')
    matches = [re.match(pattern, line) for line in f]
    d = {match.group(2) : match.group(1) for match in matches if match}
    return d
    
import unicodedata
def strip_accents(s):
    return ''.join((c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn'))

country_codes = get_country_code_map()

for i in range(7):
    f = urllib2.urlopen('http://www.songkick.com/artists/408511-bob-dylan/gigography?page=' + str(i))
    get_performances(f)

