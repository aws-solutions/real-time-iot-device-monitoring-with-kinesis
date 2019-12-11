#!/bin/bash
#
# This assumes all of the OS-level configuration has been completed and git repo has already been cloned
#
# This script should be run from the repo's deployment directory
# cd deployment
# ./build-s3-dist.sh source-bucket-base-name trademarked-solution-name version-code
#
# Parameters:
#  - source-bucket-base-name: Name for the S3 bucket location where the template will source the Lambda
#    code from. The template will append '-[region_name]' to this bucket name.
#    For example: ./build-s3-dist.sh solutions my-solution v1.0.0
#    The template will then expect the source code to be located in the solutions-[region_name] bucket
#
#  - trademarked-solution-name: name of the solution for consistency
#
#  - version-code: version of the solution

set -e

# Check to see if input has been provided:
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo "Please provide the base source bucket name, trademark approved solution name and version where the lambda code will eventually reside."
    echo "For example: ./build-s3-dist.sh solutions trademarked-solution-name v1.0.0"
    exit 1
fi

# Get reference for all important folders
template_dir="$PWD"
template_dist_dir="$template_dir/global-s3-assets"
build_dist_dir="$template_dir/regional-s3-assets"
source_dir="$template_dir/../source"

echo "------------------------------------------------------------------------------"
echo "[Init] Clean old dist folders"
echo "------------------------------------------------------------------------------"
echo "rm -rf $template_dist_dir"
rm -rf $template_dist_dir
echo "mkdir -p $template_dist_dir"
mkdir -p $template_dist_dir
echo "rm -rf $build_dist_dir"
rm -rf $build_dist_dir
echo "mkdir -p $build_dist_dir"
mkdir -p $build_dist_dir

echo "------------------------------------------------------------------------------"
echo "[Packaging] Global Assets: Cloudformation Templates"
echo "------------------------------------------------------------------------------"
echo "copy yaml templates and rename"
cp $template_dir/real-time-iot-device-monitoring-with-kinesis.yaml $template_dist_dir/
cd $template_dist_dir
# Rename all *.yaml to *.template
for f in *.yaml; do
    mv -- "$f" "${f%.yaml}.template"
done

echo "Updating code source bucket name in template with $1"
bucket_name="s/%%BUCKET_NAME%%/$1/g"
echo "sed -i -e $bucket_name $template_dist_dir/*.template"
sed -i -e $bucket_name $template_dist_dir/*.template

echo "Updating code source solution name in template with $2"
solution_name="s/%%SOLUTION_NAME%%/$2/g"
echo "sed -i -e $solution_name $template_dist_dir/*.template"
sed -i -e $solution_name $template_dist_dir/*.template

echo "Updating code source version in template with $3"
s_version="s/%%VERSION%%/$3/g"
echo "sed -i -e $s_version $template_dist_dir/*.template"
sed -i -e $s_version $template_dist_dir/*.template

echo "------------------------------------------------------------------------------"
echo "[Packaging] Region Assets: Source"
echo "------------------------------------------------------------------------------"

# Build Custom Resource
echo "Building CFN custom resource helper Lambda function"
cd $source_dir/custom-resource
npm install
npm run build
npm run zip
cp ./dist/custom-resource-helper.zip $build_dist_dir/custom-resource-helper.zip
rm -rf dist
rm -rf node_modules

# Build UpdateDDBLambda
echo "Building UpdateDDBLambda"
cd $source_dir/update_ddb_from_stream
zip -r $build_dist_dir/update_ddb_from_stream.zip *

# Build Demo script
echo "Building Demo Script"
cd $source_dir/demo
zip -r $build_dist_dir/demo.zip *

echo "Getting third party libraries for web site"
cd $source_dir/web_site
npm install bootstrap@3.3.7
cp node_modules/bootstrap/dist/css/bootstrap.min.css css/
cp node_modules/bootstrap/dist/js/bootstrap.min.js js/

npm install font-awesome
cp -r node_modules/font-awesome/fonts ./
cp node_modules/font-awesome/css/font-awesome.min.css css/

npm install chart.js
cp node_modules/chart.js/dist/Chart.min.js js/

npm install amazon-cognito-identity-js
cp node_modules/amazon-cognito-identity-js/dist/amazon-cognito-identity.min.js js/

npm install jquery
cp node_modules/jquery/dist/jquery.min.js js/

rm -rf node_modules
rm package-lock.json

echo "Copying web site content to $build_dist_dir"
cd $source_dir
cp -r web_site $build_dist_dir/

echo "Generating web site manifest"
cd $template_dir/manifest-generator
npm install
node app.js --target $build_dist_dir/web_site --output $build_dist_dir/web-site-manifest.json

cd $template_dir

echo "Completed building distribution"
