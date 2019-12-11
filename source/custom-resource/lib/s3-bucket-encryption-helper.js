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

/**
 * @author Solution Builders
 */

'use strict';

let AWS = require('aws-sdk');
let s3 = new AWS.S3();

/**
 * Helper function to turn on S3 default bucket encryption for cfn custom resource.
 *
 * @class bucketEncryptionHelper
 */
let bucketEncryptionHelper = (function() {

    /**
     * @class bucketEncryptionHelper
     * @constructor
     */
    let bucketEncryptionHelper = function() {};

    /**
     * Enables default encryption for a given bucket.
     * @param {string} S3Bucket - S3 Bucket to enable default encryption.
     * @param {copyWebSiteAssets~requestCallback} cb - The callback that handles the response.
     */
    bucketEncryptionHelper.prototype.enableDefaultBucketEncryption = function(bucket, algorithm, key, cb) {
        console.log(['Enabling default encryption on bucket:', bucket].join(' '));
        var params = {
          Bucket: bucket,
          ServerSideEncryptionConfiguration: {
            Rules: [
              {
                ApplyServerSideEncryptionByDefault: {
                  SSEAlgorithm: algorithm
                }
              }
            ]
          }
        };
        if (algorithm === 'aws:kms') {
          params.ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.KMSMasterKeyID = key;
        }

        s3.putBucketEncryption(params, (err, result) => {
            if (err) {
              console.log(['Failed to enable default bucket encryption:', err].join(' '));
              return cb(err, null);
            } else {
              console.log("Successfully enabled default bucket encryption.");
              return cb(null, "SUCCESS");
            }
        });
    };

    return bucketEncryptionHelper;

})();

module.exports = bucketEncryptionHelper;
