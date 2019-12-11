/********************************************************************************************************************* 
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           * 
 *                                                                                                                    * 
 *  Licensed under the Apache License Version 2.0 (the "License"). You may not use this file except in compliance     *
 *  with the License. A copy of the License is located at                                                             * 
 *                                                                                                                    * 
 *      http://www.apache.org/licenses/                                                                               *
 *                                                                                                                    * 
 *  or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES * 
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    * 
 *  and limitations under the License.                                                                                * 
 *********************************************************************************************************************/ 
 
'use strict'; 
 
console.log('Loading function'); 
 
const https = require('https'); 
const url = require('url'); 
const moment = require('moment'); 
 
const UUID = require('node-uuid'); 
const MetricsHelper = require('./lib/metrics-helper'); 
const KinesisAppHelper = require('./lib/kinesis-helper'); 
const WebsiteHelper = require('./lib/website-helper'); 
const S3BucketEncryptionHelper = require('./lib/s3-bucket-encryption-helper'); 
 
/** 
 * Request handler. 
 */ 
exports.handler = (event, context, callback) => { 
    console.log('Received event:', JSON.stringify(event, null, 2)); 
 
    let responseStatus = 'FAILED'; 
    let responseData = {}; 
 
    let _bucketEncryptionHelper = new S3BucketEncryptionHelper(); 
    let _kinesisAppHelper = new KinesisAppHelper(); 
    let _websiteHelper = new WebsiteHelper(); 
    let _metricsHelper = new MetricsHelper(); 
 
    switch (event.ResourceProperties.CustomResourceAction) { 
        case 'EnableBucketEncryption': 
            switch (event.RequestType) { 
                case 'Create': 
 
                    _bucketEncryptionHelper.enableDefaultBucketEncryption(event.ResourceProperties.Bucket, 
                        event.ResourceProperties.SSEAlgorithm, event.ResourceProperties.KMSMasterKeyID, 
                        (err, data) => { 
                            if (err) { 
                                responseData = { 
                                    Error: 'Enabling S3 bucket encryption failed' 
                                }; 
                                console.log([responseData.Error, ':\n', err].join('')); 
                            } else { 
                                responseStatus = 'SUCCESS'; 
                                responseData = {}; 
                            } 
 
                            sendResponse(event, callback, context.logStreamName, responseStatus, responseData); 
                        }); 
                    break; 
 
                case 'Delete': 
 
                    // Do nothing. 
                    sendResponse(event, callback, context.logStreamName, 'SUCCESS'); 
                    break; 
                default: 
 
                    // Fail if RequestType is unexpected. 
                    sendResponse(event, callback, context.logStreamName, 'FAILED'); 
            } 
            break; 
 
        case 'StartKinesisApplication': 
            switch (event.RequestType) { 
                case 'Create': 
 
                    _kinesisAppHelper.startApplication(event.ResourceProperties.ApplicationName, event.ResourceProperties.Region, 
                        function(err, data) { 
                            if (err) { 
                                responseData = { 
                                    Error: 'Starting kinesis application failed' 
                                }; 
                                console.log([responseData.Error, ':\n', err].join('')); 
                            } else { 
                                responseStatus = 'SUCCESS'; 
                                responseData = {}; 
                            } 
 
                            sendResponse(event, callback, context.logStreamName, responseStatus, responseData); 
                        }); 
                    break; 
 
                case 'Delete': 
 
                    _kinesisAppHelper.stopApplication(event.ResourceProperties.ApplicationName, event.ResourceProperties.Region, 
                        function(err, data) { 
                            if (err) { 
                                responseData = { 
                                    Error: 'Stopping kinesis application failed' 
                                }; 
                                console.log([responseData.Error, ':\n', err].join('')); 
                            } else { 
                                responseStatus = 'SUCCESS'; 
                                responseData = {}; 
                            } 
 
                            sendResponse(event, callback, context.logStreamName, responseStatus, responseData); 
                        }); 
                    break; 
 
                default: 
 
                    // Fail if RequestType is unexpected. 
                    sendResponse(event, callback, context.logStreamName, 'FAILED'); 
            } 
            break;                   
 
        default: 
            if (event.RequestType === 'Delete') { 
                if (event.ResourceProperties.CustomResourceAction === 'SendMetric') { 
                    responseStatus = 'SUCCESS'; 
 
                    let _metricsHelper = new MetricsHelper(); 
 
                    let _metric = { 
                        Solution: process.env.SOLUTION_ID, 
                        UUID: event.ResourceProperties.UUID, 
                        TimeStamp: moment().utc().format('YYYY-MM-DD HH:mm:ss.S'), 
                        Data: { 
                            Version: process.env.SOLUTION_VERSION, 
                            Deleted: moment().utc().format() 
                        } 
                    }; 
 
                    _metricsHelper.sendAnonymousMetric(_metric, function(err, data) { 
                        if (err) { 
                            responseData = { 
                                Error: 'Sending metrics helper delete failed' 
                            }; 
                            console.log([responseData.Error, ':\n', err].join('')); 
                        } 
                        sendResponse(event, callback, context.logStreamName, 'SUCCESS'); 
                    }); 
                } else { 
                    sendResponse(event, callback, context.logStreamName, 'SUCCESS'); 
                } 
            } 
 
            if (event.RequestType === 'Create') { 
                if (event.ResourceProperties.CustomResourceAction === 'ConfigureWebsite') { 
 
                    _websiteHelper.configureWebsite(event.ResourceProperties.WebsiteBucket, event.ResourceProperties.Region, 
                        event.ResourceProperties.UUID, event.ResourceProperties.Configuration, 
                        (err, data) => { 
                            if (err) { 
                                responseData = { 
                                    Error: 'Error creating website configuration file' 
                                }; 
                                console.log([responseData.Error, ':\n', err].join('')); 
                            } else { 
                                responseStatus = 'SUCCESS'; 
                                responseData = {}; 
                            } 
 
                            sendResponse(event, callback, context.logStreamName, responseStatus, responseData); 
                        }); 
                } else if (event.ResourceProperties.CustomResourceAction === 'DeployWebsite') { 
 
                    _websiteHelper.deployWebsite(event.ResourceProperties.SourceS3Bucket, event.ResourceProperties.sourceManifest,
                        event.ResourceProperties.SourceS3Key, event.ResourceProperties.WebsiteBucket, 
                        (err, data) => { 
                            if (err) { 
                                responseData = { 
                                    Error: 'Website deployment failed' 
                                }; 
                                console.log([responseData.Error, ':\n', err].join('')); 
                            } else { 
                                responseStatus = 'SUCCESS'; 
                                responseData = {}; 
                            } 
 
                            sendResponse(event, callback, context.logStreamName, responseStatus, responseData); 
                        }) 
 
                } else if (event.ResourceProperties.CustomResourceAction === 'GenerateUUID') { 
                    responseStatus = 'SUCCESS'; 
                    responseData = { 
                        UUID: UUID.v4() 
                    }; 
                    sendResponse(event, callback, context.logStreamName, responseStatus, responseData); 
 
                } else if (event.ResourceProperties.CustomResourceAction === 'SendMetric') { 
 
                    let _metric = { 
                        Solution: process.env.SOLUTION_ID, 
                        UUID: event.ResourceProperties.UUID, 
                        TimeStamp: moment().utc().format('YYYY-MM-DD HH:mm:ss.S'), 
                        Data: { 
                            Version: process.env.SOLUTION_VERSION, 
                            SendAnonymousData: process.env.SEND_ANONYMOUS_DATA, 
                            Launch: moment().utc().format() 
                        } 
                    }; 
 
                    _metricsHelper.sendAnonymousMetric(_metric, function(err, data) { 
                        if (err) { 
                            responseData = { 
                                Error: 'Sending anonymous launch metric failed' 
                            }; 
                            console.log([responseData.Error, ':\n', err].join('')); 
                        } else { 
                            responseStatus = 'SUCCESS'; 
                            responseData = {}; 
                        } 
                    }); 
                    sendResponse(event, callback, context.logStreamName, 'SUCCESS'); 
 
                } else { 
                    console.log('CustomResourceAction is not defined'); 
                    sendResponse(event, callback, context.logStreamName, 'FAILED'); 
                } 
 
            } 
    } 
 
}; 
 
/** 
 * Sends a response to the pre-signed S3 URL 
 */ 
let sendResponse = function(event, callback, logStreamName, responseStatus, responseData) { 
    const responseBody = JSON.stringify({ 
        Status: responseStatus, 
        Reason: `See the details in CloudWatch Log Stream: ${logStreamName}`, 
        PhysicalResourceId: logStreamName, 
        StackId: event.StackId, 
        RequestId: event.RequestId, 
        LogicalResourceId: event.LogicalResourceId, 
        Data: responseData, 
    }); 
 
    console.log('RESPONSE BODY:\n', responseBody); 
    const parsedUrl = url.parse(event.ResponseURL); 
    const options = { 
        hostname: parsedUrl.hostname, 
        port: 443, 
        path: parsedUrl.path, 
        method: 'PUT', 
        headers: { 
            'Content-Type': '', 
            'Content-Length': responseBody.length, 
        } 
    }; 
 
    const req = https.request(options, (res) => { 
        console.log('STATUS:', res.statusCode); 
        console.log('HEADERS:', JSON.stringify(res.headers)); 
        callback(null, 'Successfully sent stack response!'); 
    }); 
 
    req.on('error', (err) => { 
        console.log('sendResponse Error:\n', err); 
        callback(err); 
    }); 
 
    req.write(responseBody); 
    req.end(); 
}; 