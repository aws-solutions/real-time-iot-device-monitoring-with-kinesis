# Real Time IoT Device Monitoring with Kinesis Analytics
AWS Solution for analyzing IoT Device Connectivity using Kinesis Analytics

## Background

### Use Case

#### Opportunity & History
AnyCorp Devices, Inc. (ACD)
 
ACD is an electronic device manufacture who makes the electronics and firmware that allows its customers to create “smart” devices out of traditional products. ACD’s customers are manufacturing companies (OEM’s), who will use ACD’s products, to add features and value to their existing products. ACD currently has 2 major product lines, one servicing door lock OEM’s and the other working with plumbing valve OEM’s. 
 
Both product lines are based off the same monolithic 3 tier .NET application, with a SQL DB. This currently is hosted in a public cloud provider (not AWS) and suffers from stability and scaling issues. Many tiers of the application are written in code that is EOL and much of the original engineering team has left the company. The CEO and CTO are considering major changes to the architecture including shifting to AWS.
 
The immediate problem that ACD has is that one of their largest plumbing OEM’s wants a new feature add to the product ASAP. They would like to record toilet valve activations in near real time for a building. Then have these activations rolled up into a per bathroom metric that can be used to efficiently dispatch cleaning staff to restock supplies in a “Just in time” model vs. the popular method of having a number of roving cleaners. If this is successful the OEM projects that large facilities can gain up to 30% saving in annual cleaning staff costs. Further this kind of innovation will grow the install base of this product by 10-20x in the the 1st year.  This revenue growth will be sufficient to fund ACD’s full application re-architecture. The CEO also feel that this kind of feature would be popular with their lock customers.
 
ACD’s CEO want to add this feature quickly. The CTO is concerned that the current app is not able to hand the complexity or scale of this opportunity. The CTO is also unclear on what method could be used feed this usage data to the OEM’s customers. The existing valve do record valve activations and send them up to current application via a REST API. The current application can redirect this data to another application for processing
 
#### Solution
 
To help ACD meet this need and help them see the breadth and depth of AWS we will be creating a PoC application that will consume sample valve data into Kinesis and then we will use QuickSight to display the data for the end customers.  This will be a very simple implementation so that the CTO & CEO can see the speed and simplicity of solutions in AWS. In this solution we use an ACD supplied sample building of 22 stories (20 above ground and 2 sub-stories) 

    * Each above ground story has 
        * 1 Men room  (12 valves)
        * 1 Women room (8 valves)
        * 1 Family room (1 valve)
    * Each Sub-story has 1 Family room (1 valve)
    * A room will need service when 70% of the valves have been activated over 35 times or any single valve activated over 75 times.
    * If it helps the devices were named "0301M04" 03-is the flr, 01M-first M room, 04-the fourth valve

 
#### Value
 
Since ACD lacks confidence in their current architecture we will not be spending time on cost comparisons. We will instead show them the cost for a single sample building and then focusing on the costs and simplicity for scaling this solution as it get adopted by the market.
 
Ingest Toilet Flush events from IOT devices to analyze and project use volumes for maintenence and labor targeting (Wayne to flesh out)

https://github.com/mmehrten/kinesis-stream


#### Technical Background

* Ingest IOT data into a Kinesis pipeline
    * https://aws.amazon.com/solutions/implementations/real-time-iot-device-monitoring-with-kinesis/
* Visualize data from S3 in Quicksight 
    * https://docs.aws.amazon.com/quicksight/latest/user/create-a-data-set-s3.html
    * https://aws.amazon.com/blogs/database/stream-data-into-an-aurora-postgresql-database-using-aws-dms-and-amazon-kinesis-data-firehose/

#### Flush Event Document


{ 
“ts”: “12312151”, 
“device_id”: “abcd-abcd-abcd-abcd”,
“event_type”: “flush”
}


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
