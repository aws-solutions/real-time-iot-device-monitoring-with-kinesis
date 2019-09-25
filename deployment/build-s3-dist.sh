#!/bin/bash

# This script should be run from the repo's root directory
# ./deployment/build-s3-dist.sh source-bucket-base-name
# source-bucket-base-name should be the base name for the S3 bucket location where the template will source the Lambda code from.
# The template will append '-[region_name]' to this bucket name.
# For example: ./deployment/build-s3-dist.sh solutions
# The template will then expect the source code to be located in the solutions-[region_name] bucket

# Check to see if input has been provided:
if [ -z "$1" ]; then
    echo "Please provide the base source bucket name where the lambda code will eventually reside.\nFor example: ./build-s3-dist.sh solutions"
    exit 1
fi

# Create `dist` directory
echo "Starting to build distribution"
export deployment_dir=`pwd`
echo $deployment_dir
[ -e dist ] && rm -r dist
echo "mkdir -p dist"
mkdir -p "dist"

# Copy CFT & swap parameters
echo "cp real-time-iot-device-monitoring-with-kinesis.yaml dist/real-time-iot-device-monitoring-with-kinesis.template"
cp real-time-iot-device-monitoring-with-kinesis.yaml dist/real-time-iot-device-monitoring-with-kinesis.template

echo "Updating code source bucket and version in template with $1 $2"
bucket="s/%%BUCKET_NAME%%/$1/g"
echo "sed -i -e $bucket dist/real-time-iot-device-monitoring-with-kinesis.template"
sed -i -e $bucket dist/real-time-iot-device-monitoring-with-kinesis.template

version="s/%%VERSION%%/$2/g"
echo "sed -i -e $version dist/real-time-iot-device-monitoring-with-kinesis.template"
sed -i -e $version dist/real-time-iot-device-monitoring-with-kinesis.template

# Build Custom Resource
echo "Building CFN custom resource helper Lambda function"
cd "$deployment_dir/../source/custom-resource"
npm install
npm run build
npm run zip
cp "./dist/custom-resource-helper.zip" "$deployment_dir/dist/custom-resource-helper.zip"
rm -rf dist
rm -rf node_modules

# Build UpdateDDBLambda
echo "Building UpdateDDBLambda"
cd "$deployment_dir/../source/update_ddb_from_stream"
zip -r "$deployment_dir/dist/update_ddb_from_stream.zip" *

# Build Demo script
echo "Building Demo Script"
cd "$deployment_dir/../source/demo"
zip -r "$deployment_dir/dist/demo.zip" *

echo "Copying web site content to $deployment_dir/dist"
cd "$deployment_dir/../source/"
cp -r web_site "$deployment_dir/dist/" 

echo "Generating web site manifest"
cd $deployment_dir/manifest-generator
npm install
node app.js --target $deployment_dir/dist/web_site --output ../dist/web-site-manifest.json

cd $deployment_dir

echo "Completed building distribution"
