# Set Defaults
REGION='us-east-1'
TOPIC='iot_device_analytics'
PROFILE='default'
ITERATIONS=1000
WAIT=2

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
  esac
  shift
done


for (( i = 1; i <= $ITERATIONS; i++)) {

  DEVICE="P0"$((1 + $RANDOM % 5))

  echo "Publishing message $i/$ITERATIONS to IoT topic $TOPIC:"
  echo "device: $DEVICE"

  aws iot-data publish \
    --topic "$TOPIC" \
    --profile "$PROFILE" \
    --region "$REGION" \
    --payload '{'
      '"device_id": "' $DEVICE '", '
      '"ts": "' $(date +%s) '",'
      '}'

  sleep $WAIT

}
