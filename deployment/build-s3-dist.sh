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

export solution_name="real-time-iot-device-monitoring-with-kinesis"

# Create `dist` directory
echo "Starting to build distribution"
echo "export initial_dir=`pwd`"
export initial_dir=`pwd`
export deployment_dir="$initial_dir/deployment"
export dist_dir="$initial_dir/deployment/dist"
echo "Clean up $dist_dir"
rm -rf $dist_dir
echo "mkdir -p $dist_dir"
mkdir -p "$dist_dir"

# Copy CFT & swap parameters
cp "$deployment_dir/$solution_name.yaml" "$dist_dir/$solution_name.template"

echo "Updating code source bucket in template with $1"
replace="s/%%BUCKET_NAME%%/$1/g"
echo "sed -i '' -e $replace $dist_dir/$solution_name.template"
sed -i '' -e $replace "$dist_dir/$solution_name.template"

# Build Custom Resource
echo "Building CFN custom resource helper Lambda function"
cd "$initial_dir/source/custom-resource"
npm install
npm run build
npm run zip
cp "./dist/custom-resource-helper.zip" "$dist_dir/custom-resource-helper.zip"
cd "$initial_dir"

# Build UpdateDDBLambda
echo "Building UpdateDDBLambda"
cd "$initial_dir/source/update_ddb_from_stream"
rm -rf "./dist" && mkdir "./dist"
cp "$initial_dir/source/update_ddb_from_stream/update_ddb_from_stream.py" "./dist"
cd "./dist"
zip -r update_ddb_from_stream.zip .
cp "./update_ddb_from_stream.zip" "$dist_dir"
cd "$initial_dir"

# Build Demo script
echo "Building Demo Script"
cd "$initial_dir/source/demo"
rm -rf "./dist" && mkdir "./dist"
cp "$initial_dir/source/demo/send-messages.sh" "./dist"
cd "./dist"
zip -r demo.zip .
cp "./demo.zip" "$dist_dir"
cd "$initial_dir"

echo "Copying web site content to $deployment_dir/dist"
cp -r "$initial_dir/source/web_site" "$dist_dir/"

echo "Generating web site manifest"
cd "$deployment_dir/manifest-generator"
npm install
node app
cd "$initial_dir"

echo "Completed building distribution"
