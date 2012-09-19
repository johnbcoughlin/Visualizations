#!/usr/local/bin/python2.7

import json
import csv
import time

reader = csv.reader(open('concert_list', 'r'), delimiter='\t', quoting=csv.QUOTE_NONE)

lst = []

def convertDate(date):
    d = time.strptime(date, '%d %b, %Y')
    return d

for row in reader:
    try:
        d = {}
        d['location'] = row[0]
        d['date'] = convertDate(row[1])
        d['lat'] = row[2]
        d['long'] = row[3]
        lst.append(d)
    except IndexError:
        print row

concerts = sorted(lst, key=lambda d: d['date'])
concerts = [{'location' : d['location'], 'date' : time.strftime('%B %d, %Y', d['date']), 'lat' : d['lat'], 'lon' : d['long']} for d in concerts]

json.dump(concerts, open('concerts.json', 'w'))
