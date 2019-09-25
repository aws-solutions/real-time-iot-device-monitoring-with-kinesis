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
  FLOW=$(( 60 + $RANDOM % 40 ))
  TEMP=$(( 15 + $RANDOM % 20 ))
  HUMIDITY=$(( 50 + $RANDOM % 40 ))
  SOUND=$(( 100 + $RANDOM % 40 ))

  # 3% chance of throwing an anomalous temperature reading
  if [ $(($RANDOM % 100)) -gt 97 ]
  then
    echo "TEMPERATURE OUT OF RANGE"
    TEMP=$(($TEMP*6))
  fi

  echo "Publishing message $i/$ITERATIONS to IoT topic $TOPIC:"
  echo "device: $DEVICE"
  echo "flow: $FLOW"
  echo "temp: $TEMP"
  echo "humidity: $HUMIDITY"
  echo "sound: $SOUND"

  aws iot-data publish --topic "$TOPIC" --payload "{\"id\":\"1\",\"device\":\"$DEVICE\",\"flow\":$FLOW,\"temp\":$TEMP,\"humidity\":$HUMIDITY,\"sound\":$SOUND}" --profile "$PROFILE" --region "$REGION"

  sleep $WAIT

}
