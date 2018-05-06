#!/usr/bin/python3

"""
DESCRIPTION
    Simple python script to import a csv into ElasticSearch. It can also update existing Elastic data if
    only parameter --id-column is provided

HOW IT WORKS
    The script creates an ElasticSearch API PUT request for
    each row in your CSV. It is similar to running an bulk insert by:

    $ curl -XPUT localhost:9200/_bulk -d '{index: "", type: ""}
                                         { data }'

    In both `json-struct` and `elastic-index` path, the script will
    insert your csv data by replacing the column name wrapped in '%'
    with the data for the given row. For example, `%id%` will be
    replaced with data from the `id` column of your CSV.

NOTES
    - CSV must have headers
    - insert elastic address (with port) as argument, it defaults to localhost:9200

EXAMPLES
    1. CREATE example:

    $ python csv_to_elastic.py \
        --elastic-address 'localhost:9200' \
        --csv-file input.csv \
        --elastic-index 'index' \
        --datetime-field=dateField \
        --json-struct '{
            "name" : "%name%",
            "major" : "%major%"
        }'

    CSV:

|  name  |      major       |
|--------|------------------|
|  Mike  |   Engineering    |
|  Erin  | Computer Science |


    2. CREATE/UPDATE example:

    $ python csv_to_elastic.py \
        --elastic-address 'localhost:9200' \
        --csv-file input.csv \
        --elastic-index 'index' \
        --datetime-field=dateField \
        --json-struct '{
            "name" : "%name%",
            "major" : "%major%"
        }'
        --id-column id
CSV:

|  id  |  name  |      major       |
|------|--------|------------------|
|   1  |  Mike  |   Engineering    |
|   2  |  Erin  | Computer Science |

"""

import argparse
import http.client
import os
import csv
import json

def getParams():
    params = {}
    params["elastic_index"] = "predictions"
    params["elastic_type"] = "Prediction"
    params["file_path"] = "./data/FILE_3_prediction_recommend.csv"
    params["elastic_address"] = 'search-recommend-xjclj4cziq5cck27y3rkkvqwee.us-east-1.es.amazonaws.com'
    # search-recommend-xjclj4cziq5cck27y3rkkvqwee.us-east-1.es.amazonaws.com
    params["json_struct"] = '{"RestaurantID" : "%id%", "Cuisine" : "%cuisine%", "Score" : "%score%"}'
    return params

def execute(file_path, delimiter, elastic_index, json_struct, elastic_type, elastic_address):
    endpoint = '/_bulk'

    print("")
    print(" ----- CSV to ElasticSearch ----- ")
    print("")

    count = 0
    headers = []
    headers_position = {}
    to_elastic_string = ""
    with open(file_path, 'r') as csvfile:
        reader = csv.reader(csvfile, delimiter=delimiter, quotechar=
        '"')
        for row in reader:
            if count == 0:
                for iterator, col in enumerate(row):
                    headers.append(col)
                    headers_position[col] = iterator
                print(headers)
            elif len(row[0]) == 0: # Empty rows on the end of document
                print("Found empty rows at the end of document")
                break
            else:
                pos = 0
                if os.name == 'nt':
                    _data = json_struct.replace("^", '"')
                else:
                    _data = json_struct.replace("'", '"')
                _data = _data.replace('\n', '').replace('\r', '')
                for header in headers:
                    try:
                        row[pos] = row[pos].replace('"', '')
                        int(row[pos])
                        _data = _data.replace(
                            '"%' + header + '%"', row[pos])
                    except ValueError:
                        _data = _data.replace('%' + header + '%', row[pos])
                    pos += 1
                # Send the request
                index_row = {
                    "index": {"_index": elastic_index, "_type": elastic_type}}
                json_string = json.dumps(index_row) + "\n" + _data + "\n"
                to_elastic_string += json_string

            count += 1

    print(to_elastic_string)
    print('Reached end of CSV - sending to Elastic')

    connection = http.client.HTTPConnection(elastic_address)
    headers = {"Content-type": "application/json", "Accept": "text/plain"}
    connection.request('POST', url=endpoint,
                       headers=headers, body=to_elastic_string)
    response = connection.getresponse()
    print("Returned status code:", response.status)
    body = response.read()
    print("Returned body:", body)
    return

if __name__ == '__main__':
    params = getParams()
    file_path = params["file_path"]
    delimiter = "," 
    elastic_index = params["elastic_index"]
    json_struct = params["json_struct"]
    elastic_type = params["elastic_type"]
    elastic_address = params["elastic_address"]
    execute(file_path, delimiter, elastic_index, json_struct, elastic_type, elastic_address)


