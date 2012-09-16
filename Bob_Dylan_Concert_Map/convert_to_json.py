#!/usr/local/bin/python2.7

import json
import csv

reader = csv.reader(open('concert_list', 'r'), delimiter='\t', quoting=csv.QUOTE_NONE)

lst = []

for row in reader:
    try:
        d = {}
        d['location'] = row[0]
        d['date'] = row[1]
        d['lat'] = row[2]
        d['long'] = row[3]
        lst.append(d)
    except IndexError:
        print row

json.dump(lst, open('concerts.json', 'w'))
