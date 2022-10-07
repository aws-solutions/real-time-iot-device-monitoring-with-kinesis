import boto3, base64, json, logging, os, collections, time
log_level = str(os.environ.get('LOG_LEVEL')).upper()
if log_level not in ['DEBUG', 'INFO','WARNING', 'ERROR','CRITICAL']:
    log_level = 'ERROR'
log = logging.getLogger()
log.setLevel(log_level)

SNS_ARN = os.environ['SNS_ARN']
CLIENT = boto3.client('sns')
LAST_INVOCATIONS = collections.defaultdict(int)
ALERT_INTERVAL_SECS = 60 * 60  # One hour


def _process_record(data):
    # {"EVENTTIMESTAMP":"2022-10-06 18:25:10.000","DEVICE_ID":"P02","HOURLY_FLUSH_COUNT":844.0}
    return json.loads(base64.b64decode(data).decode("utf-8")) 


def _get_display(records):
    result = collections.defaultdict(int)
    event_ts = None
    invoke = False
    
    for record in records:
        resp = _process_record(record['data'])
        result[resp['DEVICE_ID']] = max(resp['HOURLY_FLUSH_COUNT'], result[resp['DEVICE_ID']])
        event_ts = resp["EVENTTIMESTAMP"]
        
        if time.time() - LAST_INVOCATIONS[resp['DEVICE_ID']] > ALERT_INTERVAL_SECS:
            LAST_INVOCATIONS[resp['DEVICE_ID']] = time.time()
            invoke = True
            
    message = [f"Timestamp: {event_ts}"]
    for device, count in result.items():
        message.append(f"ID: {device} - {count}")
    return invoke, "\n".join(message)
    
    
def lambda_handler(event, context):
    print("Got event: ", event)
    payload = event['records']
    response = {"records": [{
        "recordId": record['recordId'],
        "result": 'Ok',
        "data": record['data'],
    } for record in payload]}
    print("Payload: ", payload)
    should_invoke, display_msg = _get_display(payload)
    if not should_invoke:
        print("Not invoking alert, too recent since last alert")
        return response

    message = f"Flush count has exceeded threshold:\n{display_msg}"
    print("Publishing message: ", message)
    CLIENT.publish(
        TargetArn = SNS_ARN,
        Message = message ,
        Subject='Flush Count Exceeded Threshold'
    )
    return response