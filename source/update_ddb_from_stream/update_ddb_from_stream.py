######################################################################################################################
#  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           #
#                                                                                                                    #
#  Licensed under the Apache License Version 2.0 (the "License"). You may not use this file except in compliance     #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/                                                                               #
#                                                                                                                    #
#  or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################

from itertools import groupby
import boto3
import botocore
import base64
import logging
import os
import urllib.request, urllib.error, urllib.parse
from json import loads,dumps
from collections import OrderedDict
from datetime import datetime
from operator import itemgetter
from random import randint
from sys import maxsize
from time import sleep

log_level = str(os.environ.get('LOG_LEVEL')).upper()
if log_level not in ['DEBUG', 'INFO','WARNING', 'ERROR','CRITICAL']:
    log_level = 'ERROR'
log = logging.getLogger()
log.setLevel(log_level)

send_anonymous_data = str(os.environ.get('SEND_ANONYMOUS_DATA')).upper()
table_name = os.environ["ANALYTICS_TABLE"]
max_retry_attempts = 5
client = boto3.client('dynamodb')
avg = lambda lst : float(sum(lst))/len(lst)
type_operator_map = {
    'ConnectedDevicesCount' : max,
    'PerDeviceMaxTemp' : max,
    'PerDeviceMinTemp': min,
    'PerDeviceAvgTemp': avg,
    'DeviceTempAnomalyScore': max,
    'AvgTempValue': avg,
    'MinTempValue': min,
    'MaxTempValue': max,
    'MaxDisconnTime': max,
    'MinDisconnTime': min,
    'AvgDisconnTime': avg,
    'MaxConnTime': max,
    'MinConnTime': min,
    'AvgConnTime': avg
}

def put_record_with_retry(metric_type, event_time, record_data, merged_data, concurrency_token, attempt=0):
    print("Retry: {0} {1} {2}".format(metric_type, event_time, str(attempt)))
    if attempt > max_retry_attempts: return
    try:
        put_record(metric_type, event_time, merged_data, concurrency_token)
    except botocore.exceptions.ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            sleep(randint(0,5))
            ddb_record = client.get_item(
                TableName = table_name,
                Key = {
                    'MetricType': {'S': metric_type},
                    'EventTime': {'S': event_time}
                },
                ConsistentRead = True
            )
            merged_data = merge_record_with_ddb(record_data, ddb_record)
            put_record_with_retry(metric_type, event_time, record_data, merged_data, concurrency_token, attempt+1)
        else: raise

def put_record(metric_type, event_time, data, concurrency_token=None):
    item = {
        'MetricType': {'S':metric_type},
        'EventTime': {'S':event_time},
        'Data': {'S':dumps(data)},
        'ConcurrencyToken': {'N':str(randint(0,maxsize))}
    }

    if concurrency_token:
        client.put_item(
            TableName = table_name,
            Item = item,
            ConditionExpression = 'ConcurrencyToken = :concurrency_token',
            ExpressionAttributeValues = {':concurrency_token': {'N': str(concurrency_token)}}
        )
    else:
        client.put_item(TableName = table_name, Item = item)

def merge_record_with_ddb(record_data, ddb_record):
    ddb_data = loads(ddb_record['Item']['Data']['S'])
    metric_type = ddb_record['Item']['MetricType']['S']
    concurrency_token = int(ddb_record['Item']['ConcurrencyToken']['N'])
    merged_data = { k : merge_values(record_data, ddb_data, metric_type, k) for k in set(record_data) | set(ddb_data) }
    merged_data = OrderedDict(sorted(iter(merged_data.items()), key=itemgetter(1), reverse=True))
    return merged_data

def merge_values(record_data, set_data, metric_type, k):
    if k not in record_data: return set_data[k]
    if k not in set_data: return record_data[k]
    return type_operator_map[metric_type]([set_data[k], record_data[k]])

def merge_record_values(metric_key, grouped_rows):
    if 'DeviceTempAnomalyScore' in metric_key:
        return max(float(key[5]) for key in grouped_rows)
    else:
        metric_key_split = metric_key.split('|')
        metric_key_value = metric_key_split[1]
        return type_operator_map[metric_key_value]([float(key[5]) for key in grouped_rows])

# This function sends anonymous usage data, if enabled
def sendAnonymousData(event_time,dataDict):
    log.debug("Sending Anonymous Data")
    postDict = {}
    postDict['Data'] = dataDict
    postDict['TimeStamp'] = event_time
    postDict['Solution'] = os.environ.get('SOLUTION_ID')
    postDict['Version'] = os.environ.get('SOLUTION_VERSION')
    postDict['UUID'] = os.environ.get('SOLUTION_UUID')
    # API Gateway URL to make HTTP POST call
    url = 'https://metrics.awssolutionsbuilder.com/generic'
    data=dumps(postDict)
    data_utf8 = data.encode('utf-8')
    log.debug('sendAnonymousData data: %s', data)
    headers = {
        'content-type': 'application/json; charset=utf-8',
        'content-length': len(data_utf8)
    }
    req = urllib.request.Request(url, data_utf8, headers)
    rsp = urllib.request.urlopen(req)
    rspcode = rsp.getcode()
    content = rsp.read()
    log.debug("Response from APIGateway: %s, %s", rspcode, content)

def lambda_handler(event, context):
    log.debug('event: %s', event)
    payload = event['records']
    output = {}
    output_array = []
    log.debug('processing %s records', len(payload))

    # event_time = str(datetime.now())

    for record in payload:

        decoded_data = base64.b64decode(record['data']).decode("utf-8")

        log.debug('decoded_data: %s', decoded_data)

        data = [decoded_data.strip().split(',')]
        data = [x for x in data if x[2]!="null"]

        for metric_key, metric_group in groupby(data, key=lambda x:"{0}|{1}".format(x[0],x[1])):
            grouped_metric = list(metric_group)
            for category_key, grouped_rows in groupby(grouped_metric, key=lambda x: "{0}|{1}".format(x[2],x[3])):
                output.setdefault(metric_key, {})[category_key] = merge_record_values(metric_key, list(grouped_rows))

        for record_key in output:
            log.debug('record_key: %s', record_key)
            event_time, metric_type = record_key.split('|')
            log.debug('event_time: %s', event_time)
            log.debug('metric_type: %s', metric_type)
            record_data = OrderedDict(sorted(iter(output[record_key].items()), key=itemgetter(1), reverse=True))

            ddb_record = client.get_item(
                TableName=table_name,
                Key={
                    'MetricType': {'S':metric_type},
                    'EventTime': {'S':event_time}
                },
                ConsistentRead=True
            )

            if 'Item' not in ddb_record:
                put_record(metric_type, event_time, record_data)
            else:
                merged_data = merge_record_with_ddb(record_data, ddb_record)
                put_record_with_retry(metric_type, event_time, record_data, merged_data, int(ddb_record['Item']['ConcurrencyToken']['N']))

        output_record = {
            'recordId': record['recordId'],
            'result': 'Ok',
            'data': base64.b64encode(decoded_data.encode("utf-8")).decode("utf-8")
        }
        output_array.append(output_record)

    if send_anonymous_data == "TRUE":
        try:
            metric_data = {}
            metric_data['RecordsProcessed'] = len(payload)
            sendAnonymousData(event_time, metric_data)
        except Exception as error:
            log.error('send_anonymous_data error: %s', error)
    else:
        log.info('Anonymous usage metrics collection disabled.')

    log.debug('returning records: %s', output_array)

    return {'records': output_array}
