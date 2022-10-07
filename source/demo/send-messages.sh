set -e 
# Set Defaults
REGION='us-east-1'
TOPIC='iot_device_analytics'
PROFILE='default'
ITERATIONS=1000
WAIT=2
DEVICE=""

# Get command line parameters
while [ "$1" != "" ]; do
  case $1 in
    -r | --region )
    shift
    REGION=$1
    ;;

    -t | --topic )
    shift
    TOPIC=$1
    ;;

    -p | --profile )
    shift
    PROFILE=$1
    ;;

    -i | --iterations )
    shift
    ITERATIONS=$1
    ;;

    -w | --wait )
    shift
    WAIT=$1
    ;;

    -d | --device )
    shift
    DEVICE=$1
    ;;
  esac
  shift
done


for (( i = 1; i <= $ITERATIONS; i++)) {
  DEVICE_ID=$DEVICE
  if [ -z "$DEVICE_ID" ]; then
    DEVICE_ID="P0"$((1 + $RANDOM % 5))
  fi

  echo "Publishing message $i/$ITERATIONS to IoT topic $TOPIC:"
  payload="{\"device_id\": \"$DEVICE_ID\", \"ts\": \"$(date +%s)\"}"
  echo "$payload"
  
  aws iot-data publish \
    --topic "$TOPIC" \
    --region "$REGION" \
    --cli-binary-format raw-in-base64-out \
    --payload "$payload"

  sleep $WAIT

}
