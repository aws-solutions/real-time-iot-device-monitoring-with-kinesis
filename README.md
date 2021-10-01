# Real Time IoT Device Monitoring with Kinesis Analytics
AWS Solution for analyzing IoT Device Connectivity using Kinesis Analytics

## OS/Python Environment Setup
```bash
sudo apt-get update
sudo apt-get install install zip wget gawk sed -y
```

## Building Lambda Package
```bash
cd deployment/
./build-s3-dist.sh source-bucket-base-name solution-name solution-version
```
source-bucket-base-name should be the base name for the S3 bucket location where the template will source the Lambda code from.
The template will append '-[region_name]' to this value.
For example: ./build-s3-dist.sh solutions
The template will then expect the source code to be located in the solutions-[region_name] bucket

## CF template and Lambda function
The CF Template is located in `deployment/global-s3-assets` directory. The Lambda function is located in `deployment/regional-s3-assets` directory.

## Collection of operational metrics

This solution collects anonymous operational metrics to help AWS improve the quality of features of the solution. For more information, including how to disable this capability, please see the [implementation guide](https://docs.aws.amazon.com/solutions/latest/real-time-iot-device-monitoring-with-kinesis/appendix-c.html).

***

Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://www.apache.org/licenses/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions and limitations under the License.
