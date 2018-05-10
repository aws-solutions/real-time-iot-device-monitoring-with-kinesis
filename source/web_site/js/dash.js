function init() {

  console.log('dash.js initialized');
  
  const clientIdParamName = "UserPoolClientId";
  const userPoolIdParamName = "UserPoolId";
  const identityPoolIdParamName = "IdentityPoolId";
  const cognitoRegionParamName = "Region";

  var streamName,
    streamType,
    rate,
    sendDataHandle,
    totalRecordsSent = 0,
    cognitoAppClientId = getConfigParameterByName(clientIdParamName),
    cognitoUserPoolId = getConfigParameterByName(userPoolIdParamName),
    cognitoIdentityPoolId = getConfigParameterByName(identityPoolIdParamName),
    cognitoRegion = getConfigParameterByName(cognitoRegionParamName),
    cognitoUser;

  let tableName = getConfigParameterByName('AnalyticsTable');

  // Populate the dashboard settings UI
  $("#userPoolId").val(cognitoUserPoolId);
  $("#identityPoolId").val(cognitoIdentityPoolId);
  $("#clientId").val(cognitoAppClientId);
  $("#userPoolRegion").val(cognitoRegion);
  $("#tableName").val(tableName);

  function getConfigParameterByName(name) {
    var data = getQSParameterByName(name);

    if (data == null || data == '') {
      data = localStorage.getItem(name);
      return data;
    }
    localStorage.setItem(name, data);
    return data;
  }

  function getQSParameterByName(name, url) {
    if (!url) {
      url = window.location.href;
    }

    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
    var results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  }

  var dateTime = [];
  var usersCounter = [];
  var androidUsers = [];
  var iOSUsers = [];
  var windowsUsers = [];
  var otherUsers = [];
  var quadA = [];
  var quadB = [];
  var quadC = [];
  var quadD = [];

  var osUsageData = [];
  var quadrantData = [];

  var colors = ["red", "green", "blue", "orange", "purple", "cyan", "magenta", "lime", "pink", "teal", "lavender", "brown", "beige", "maroon", "mint", "olive", "coral"];
  var dynamicColors = function(i) {
    if (i >= 0 && i < colors.length) return colors[i];
    var r = Math.floor(Math.random() * 255);
    var g = Math.floor(Math.random() * 255);
    var b = Math.floor(Math.random() * 255);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  var identity = function(arg1) {
    return arg1;
  };

  function addData(chart, label, data) {
    chart.data.labels = label;
    for (var i = 0; i < chart.data.datasets.length; i++) {
      dataset = chart.data.datasets[i];
      dataset.data = data;
      dataset.fill = false;
      var color = dynamicColors(colors.length - 1 - i);
      dataset.fillColor = color;
      dataset.hightlightFill = color;
      dataset.backgroundColor = color;
      dataset.borderColor = color;
    };
    chart.update();
  }

  function updateData(chart, labels, data, datasetLabel, separateAxes = false) {
    chart.data.labels = labels;
    chart.data.datasets = new Array();

    for (var i = 0; i < data.length; i++) {
      var dataset = {};
      dataset.data = data[i];
      dataset.label = datasetLabel[i];
      if (separateAxes) dataset.yAxisID = datasetLabel[i];
      dataset.fill = false;
      var color = dynamicColors(i);
      dataset.backgroundColor = color;
      dataset.borderColor = color;
      chart.data.datasets.push(dataset);
    }
    chart.update();
  }

  var generateLineChartConfig = function(label) {
    var config = {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: label,
             data: []
          }
        ]
      }, 
      options: {
        responsive: true,
        scales: {
          xAxes: [
            {
              ticks: {
                autoSkip: true,
                maxTicksLimit: 4
              },
              display: true 
            }
          ],
          yAxes: [
            {
              ticks: {
                stepSize: 50,
                suggestedMin: 0,
                suggestedMax: 100
              },
              display: true
            }
          ]
        }
      }
    };
    return config;
  }

  var generateHorizontalBarChartConfig = function(label) {
    var config = {
      type: "horizontalBar",
      data: {
        labels: [],
        datasets: [
          {
            label: label,
            data: []
          }
        ]
      },
      options: {
        legend: {
          display: true
        },
        responsive: true,
        scales: {
          yAxes: [{
             stacked: true
          }],
          xAxes: [{
            display: true,
            scaleLabel: {
              display: false
            },
            ticks: {
              stepSize: 10,
              suggestedMin: 0,
              suggestedMax: 10

            }
          }]
        }
      }
    };
    return config;
  }

  var generateLineChart = function(divId, label) {
    var ctx = document.getElementById(divId).getContext("2d");
    var config = generateLineChartConfig(label);
    return new Chart(ctx, config);
  };

  var generateHorizontalBarChart = function(divId, label) {
    var ctx = document.getElementById(divId).getContext("2d");
    var config = generateHorizontalBarChartConfig(label);
    return new Chart(ctx, config);
  };

  var getTimeSecsAgo = function(secsAgo = 0) {
    return new Date(new Date().getTime() - secsAgo*1000).toISOString().replace('T',' ').replace('Z','');
  };

  var currentTime = new Date();

  var totalCallCurrentTime = new Date(currentTime.getTime() - 600000).toISOString().replace('T',' ').replace('Z','');

  var AvgConnTimeQueryTime = new Date(currentTime.getTime() - 6000000).toISOString().replace('T',' ').replace('Z','');
  var AvgConnTimeMap = {};
  var AvgConnTimeCallLabels = new Array();
  var AvgConnTimeCallChart = generateLineChart("connTime", "Average Connection Time");

  var AvgDisConnTimeQueryTime = new Date(currentTime.getTime() - 6000000).toISOString().replace('T',' ').replace('Z','');
  var AvgDisConnTimeMap = {};
  var AvgDisConnTimeCallLabels = new Array();
  var AvgDisConnTimeCallChart = generateLineChart("disconnTime", "Average DisConnection Time");

  var AvgTempValueQueryTime = new Date(currentTime.getTime() - 6000000).toISOString().replace('T',' ').replace('Z','');
  var AvgTempCallMap = {};
  var AvgTempCallLabels = new Array();
  var AvgTempCallChart = generateLineChart("avgTempValueCanvas", "Average Temp");

  var MinTempValueQueryTime = new Date(currentTime.getTime() - 6000000).toISOString().replace('T',' ').replace('Z','');
  var MinTempCallMap = {};
  var MinTempCallLabels = new Array();
  var MinTempCallChart = generateLineChart("minTempValueCanvas", "Minimum Temp");

  var MaxTempValueQueryTime = new Date(currentTime.getTime() - 6000000).toISOString().replace('T',' ').replace('Z','');
  var MaxTempCallMap = {};
  var MaxTempCallLabels = new Array();
  var MaxTempCallChart = generateLineChart("maxTempValueCanvas", "Maximum Temp");

  var anomalyScoreCurrentTime = new Date(currentTime.getTime() - 600000).toISOString().replace('T',' ').replace('Z','');
  var anomalyCallMap = {"Average Anomaly Score": []};
  var anomalyCallLabels= new Array();
  var anomalyChartConfig = generateLineChartConfig("Average Anomaly Score");
  var anomalyCtx = document.getElementById("anomalyCanvas").getContext("2d");

  anomalyChartConfig.options.scales.yAxes = [
    {
      id: 'Average Anomaly Score',
      type: 'linear',
      position: 'left',
      ticks: {
          stepSize: 1,  
          max: 3,
          min: 0
      }
    }
  ];
  anomalyChart = new Chart(anomalyCtx, anomalyChartConfig)

  var avgTempPerDeviceQueryTime = new Date(currentTime.getTime() - 600000).toISOString().replace('T',' ').replace('Z','');
  var avgTempPerDeviceChart = generateHorizontalBarChart("avgTempCanvas", "Avg Temp per device");

  var minTempPerDeviceQueryTime = new Date(currentTime.getTime() - 600000).toISOString().replace('T',' ').replace('Z','');
  var minTempPerDeviceChart = generateHorizontalBarChart("minTempCanvas", "Min Temp per device");

  var maxTempPerDeviceQueryTime = new Date(currentTime.getTime() - 600000).toISOString().replace('T',' ').replace('Z','');
  var maxTempPerDeviceChart = generateHorizontalBarChart("maxTempCanvas", "Max Temp per device");

  var totalCallCtx = document.getElementById("A_count");
  var totalCallTimeCtx = document.getElementById("A_percent");
  var totalConnectedDevices = 0;

  var splitFunc = function(entry) {return entry.split('|')[0]; };

  var retrieveParams = function(metricType, eventTime) {
    return {
      TableName: tableName,
      ConsistentRead: true,
      ScanIndexForward: true,
      KeyConditionExpression: "MetricType = :TrailLog AND EventTime > :currentTime",
      ExpressionAttributeValues: { ":currentTime": eventTime, ":TrailLog": metricType }
    }
  };

  var retrieveParamsFromMaxTable = function(metricType, eventTime) {
    var date = eventTime.split(' ');
    var time = date[1].split(':');
    var hour = date[0]+ " " + time[0];
    var min = time[1];
    return {
      TableName: tableName,
      ConsistentRead: true,
      ScanIndexForward: true,
      KeyConditionExpression: "#hour = :hour AND #min > :minute",
      ExpressionAttributeNames: {"#hour": "Hour", "#min": "Minute"},
      ExpressionAttributeValues: { ":hour": hour, ":minute": min }
    }
  }

  var updateHorizontalBarChart = function(data, noOfTopItems, chartName, queryTime, labelFunc=identity) {
    var items = data.Items;
    var ipCountMap = {};
    
    // Merge the counts of each DDB item into a single map.
    for (var i=0; i<items.length; i++) {
      var entryMap = JSON.parse(items[i].Data);
      var mySet = new Set(Object.keys(entryMap));
      for (let key1 of mySet) ipCountMap[key1] = entryMap[key1];
    }

    if (items.length > 0) {
      queryTime = items[items.length-1].EventTime;
      
      var topIps = Object.keys(ipCountMap).sort(function(a,b) { return ipCountMap[b] - ipCountMap[a]}).slice(0,noOfTopItems);

      var topIpCounts = topIps.map(function(ip) {return ipCountMap[ip]; })
      topIps = topIps.map(labelFunc);
      addData(chartName,topIps,topIpCounts);
    }
    return queryTime;
  };

  var splitLabel = function(label) {
    return [''].concat(label.split(' '));
  }
  var updateLineChart = function(data, AvgTempCallLabels, AvgTempCallMap, chart, queryTime, labelFunc=identity) {
    var items = data.Items;
    var l = items.length
    let past_time;
    var now = new Date();
    var now_utc = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),  now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()).getTime();
    for (var i=0; i<l; i++) {
      queryTime = items[i].EventTime;
      AvgTempCallLabels.push(splitLabel(items[i].EventTime.split('.')[0]));
      ddbitem = JSON.parse(items[i].Data);
      ddbkeys = new Set(Object.keys(ddbitem));

      if (i === l-1) {
        past_time = new Date(queryTime).getTime();
      }

      for (var key in  AvgTempCallMap) {
        
        if (!ddbkeys.has(key)) {ddbitem[key]=0;}
      }
      for (let entry of Object.keys(ddbitem)) {
        if (entry in AvgTempCallMap) {
          AvgTempCallMap[entry].push(ddbitem[entry]);
        } 
        else {
          var newServiceEntry = new Array(AvgTempCallLabels.length-1);
          newServiceEntry.fill(0);
          newServiceEntry.push(ddbitem[entry]);
          AvgTempCallMap[entry] = newServiceEntry;
        }
      }
    }
    diff = (now_utc - past_time) / 60000
    if (items.length < 0) {
      if (diff > 5) {
        AvgTempCallLabels.push(splitLabel(queryTime.split('.')[0]));
        for (var key in  AvgTempCallMap) {
          AvgTempCallMap[key].push(0);
        }
      }
    }
    
    updateData(chart, AvgTempCallLabels,  Object.values(AvgTempCallMap), Object.keys(AvgTempCallMap).map(labelFunc));

    return queryTime;        
  }

  var getLatestRecord = function(){
    console.log('Getting latest records from DynamoDB');
    var params = retrieveParams("ConnectedDevicesCount", totalCallCurrentTime);
    var PerDeviceMaxTempParams = retrieveParams("PerDeviceMaxTemp", maxTempPerDeviceQueryTime);
    var PerDeviceAvgTempParams = retrieveParams("PerDeviceAvgTemp", avgTempPerDeviceQueryTime);
    var PerDeviceMinTempParams = retrieveParams("PerDeviceMinTemp", minTempPerDeviceQueryTime);
    var AvgTempParams = retrieveParams("AvgTempValue", AvgTempValueQueryTime);
    var MinTempParams = retrieveParams("MinTempValue", MinTempValueQueryTime);
    var MaxTempParams = retrieveParams("MaxTempValue", MaxTempValueQueryTime);
    var AvgConnTimeParams = retrieveParams("AvgConnTime", AvgConnTimeQueryTime);
    var AvgDisConnTimeParams = retrieveParams("AvgDisconnTime", AvgDisConnTimeQueryTime);
    var anomalyParams = retrieveParams("DeviceTempAnomalyScore", anomalyScoreCurrentTime);

    var docClient = new AWS.DynamoDB.DocumentClient();

    docClient.query(PerDeviceMaxTempParams, function(err, data) {
      if (err) console.log(err);
      else {
        maxTempPerDeviceQueryTime = updateHorizontalBarChart(data, 20, maxTempPerDeviceChart, maxTempPerDeviceQueryTime, splitFunc);
      }
    });

    docClient.query(PerDeviceMinTempParams, function(err, data) {
      if (err) console.log(err);
      else {
        minTempPerDeviceQueryTime = updateHorizontalBarChart(data, 20, minTempPerDeviceChart, minTempPerDeviceQueryTime, splitFunc);
      }
    });

    docClient.query(PerDeviceAvgTempParams, function(err, data) {
      if (err) console.log(err);
      else {
        avgTempPerDeviceQueryTime = updateHorizontalBarChart(data, 20, avgTempPerDeviceChart, avgTempPerDeviceQueryTime, splitFunc);
      }
    });

    docClient.query(AvgConnTimeParams, function(err, data) {
      if (err) console.log(err);
      else {
        AvgConnTimeQueryTime = updateLineChart(data, AvgConnTimeCallLabels, AvgConnTimeMap, AvgConnTimeCallChart, AvgConnTimeQueryTime, splitFunc) ;
      }
    });

    docClient.query(AvgDisConnTimeParams, function(err, data) {
      if (err) console.log(err);
      else {
        AvgDisConnTimeQueryTime = updateLineChart(data, AvgDisConnTimeCallLabels, AvgDisConnTimeMap, AvgDisConnTimeCallChart, AvgDisConnTimeQueryTime, splitFunc) ;
      }
    });

    docClient.query(AvgTempParams, function(err, data) {
      if (err) console.log(err);
      else {
        AvgTempValueQueryTime = updateLineChart(data, AvgTempCallLabels, AvgTempCallMap, AvgTempCallChart, AvgTempValueQueryTime, splitFunc) ;
      }
    });

    docClient.query(MinTempParams, function(err, data) {
      if (err) console.log(err);
      else {
        MinTempValueQueryTime = updateLineChart(data, MinTempCallLabels, MinTempCallMap, MinTempCallChart, MinTempValueQueryTime, splitFunc) ;
      }
    });

    docClient.query(MaxTempParams, function(err, data) {
      if (err) console.log(err);
      else {
        MaxTempValueQueryTime = updateLineChart(data, MaxTempCallLabels, MaxTempCallMap, MaxTempCallChart, MaxTempValueQueryTime, splitFunc) ;
      }
    });

    docClient.query(anomalyParams, function(err, data) {
      if (err) console.log(err);
      else {
        var items = data.Items;
        console.log(`anomalyScore data: ${data}`)
        for (let i = 0; i < items.length; i++) {
          console.log(`anomalyscore item: ${items[i]}`);
          anomalyCallLabels.push(splitLabel(items[i].EventTime));
          ddbItem = JSON.parse(items[i].Data);
          anomaly_score_value = Object.values(ddbItem);
          var sum = anomaly_score_value.reduce((previous, current) => current += previous);
          var avg = sum / anomaly_score_value.length;
          anomalyCallMap["Average Anomaly Score"].push(parseFloat(avg));
        }
        if (items.length>0) {
          anomalyScoreCurrentTime = items[items.length-1].EventTime;
          updateData(anomalyChart, anomalyCallLabels, Object.values(anomalyCallMap), Object.keys(anomalyCallMap), true);
        }
      }
    });

    docClient.query(params, function(err, data) {
      if (err) console.log(err);
      else {

        var items = data.Items;
        for (var i = 0; i < items.length; i++) {
          totalConnectedDevices = parseInt((items[i].Data).split(':')[1]);
        }
        var callTime;
        if (items.length > 0) callTime = items[items.length-1].EventTime;
        else callTime = new Date(new Date().getTime() - 200).toISOString().replace('T',' ').replace('Z','');
        totalCallCtx.innerHTML = "<h3>CountConnectedDevices: " + totalConnectedDevices + "</h3>";
        totalCallTimeCtx.innerHTML = "<h4>Last Updated: " + callTime.split(' ')[1] + "</h4>";
      }    
    });

    setTimeout( function() {
      getLatestRecord();
    }, 15000);
  }
  var cognitoAuth = function() {

    $("#logoutLink").click( function() {
      cognitoUser.signOut();

      $("#password").val("");
      $("#loginForm").removeClass("hidden");
      $("#logoutLink").addClass("hidden");
      $("#unauthMessage").removeClass("hidden");
      $("#dashboard_content").addClass("hidden");
    });

    $("#btnSaveConfiguration").click(function (e) {

      var clientId = $("#clientId").val(),
        userPoolId = $("#userPoolId").val(),
        identityPoolId = $("#identityPoolId").val(),
        userPoolRegion = $("#userPoolRegion").val();

      if (clientId && userPoolId && identityPoolId && userPoolRegion) {
        $("#configErr").addClass("hidden");
        localStorage.setItem(clientIdParamName, clientId);
        localStorage.setItem(userPoolIdParamName, userPoolId);
        localStorage.setItem(identityPoolIdParamName, identityPoolId);
        localStorage.setItem(cognitoRegionParamName, userPoolRegion);
        $("#cognitoModal").modal("hide");
      }
      else {
        $("#configErr").removeClass("hidden");
      }
    });

    $("#newPasswordForm").submit(function (e) {
      var newPassword = $("#newPassword").val();

      // If new password meets the criteria,
      if (newPassword.length >= 8 && newPassword.match(/[a-z]/)
        && newPassword.match(/[A-Z]/) && newPassword.match(/[0-9]/)
        && newPassword == $("#newPassword2").val())
      {
        $("#newPasswordModal").modal("hide");
        $("#newPasswordErr").addClass("hidden");
        $("#newPasswordMatchErr").addClass("hidden");
        $("#newPasswordComplexityErr").addClass("hidden");

        var userName = $("#userName").val();
        var password = $("#password").val();

        var authData = {
          UserName: userName,
          Password: password
        };

        var authDetails = new AmazonCognitoIdentity.AuthenticationDetails(authData);

        var poolData = {
          UserPoolId: cognitoUserPoolId,
          ClientId: cognitoAppClientId
        };

        var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
        var userData = {
          Username: userName,
          Pool: userPool
        };

        cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

        cognitoUser.authenticateUser(authDetails, cognitoAuthFunctions);

      } else {
        $("#newPasswordErr").removeClass("hidden");

        if (newPassword != $("#newPassword2").val()) {
          $("#newPasswordMatchErr").removeClass("hidden");
        }
        else {
          $("#newPasswordMatchErr").addClass("hidden");
        }

        if (newPassword.length < 8 || !newPassword.match(/[a-z]/)
          || !newPassword.match(/[A-Z]/) || !newPassword.match(/[0-9]/)) {

          $("#newPasswordComplexityErr").removeClass("hidden");

          // Must be longer than 8 characters
          if (newPassword.length < 8 ) {
            $("#newPasswordLengthErr").removeClass("hidden");
          }
          else {
            $("#newPasswordLengthErr").addClass("hidden");
          }

          // Must contain a lowercase error.
          if (!newPassword.match(/[a-z]/)) {
            $("#newPasswordLowerErr").removeClass("hidden");
          }
          else {
            $("#newPasswordLowerErr").addClass("hidden");
          }

          // Must contain an uppercase letter.
          if (!newPassword.match(/[A-Z]/)) {
            $("#newPasswordUpperErr").removeClass("hidden");
          }
          else {
            $("#newPasswordUpperErr").addClass("hidden");
          }

          // Must contain a number.
          if (!newPassword.match(/[0-9]/)) {
            $("#newPasswordNumberErr").removeClass("hidden");
          }
          else {
            $("#newPasswordNumberErr").addClass("hidden");
          }
          
        }
        else {
          $("#newPasswordComplexityErr").addClass("hidden");
        }
      }
    });

    $("#loginForm").submit(function() {

      // validate that the Cognito configuration parameters have been set
      if (!cognitoAppClientId || !cognitoUserPoolId || !cognitoIdentityPoolId || !cognitoRegion) {
        console.log("not present")
        $("#configErr").removeClass("hidden");
        $("#configureLink").trigger("click");
        return;
      }

      // update ui
      $("#loginForm").addClass("hidden");
      $("#signInSpinner").removeClass("hidden");

      var userName = $("#userName").val();
      var password = $("#password").val();

      var authData = {
        UserName: userName,
        Password: password
      };

      var authDetails = new AmazonCognitoIdentity.AuthenticationDetails(authData);

      var poolData = {
        UserPoolId: cognitoUserPoolId,
        ClientId: cognitoAppClientId
      };

      var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
      var userData = {
        Username: userName,
        Pool: userPool
      };

      cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
      cognitoUser.authenticateUser(authDetails, cognitoAuthFunctions);
    });
  }

  cognitoAuth();
  
  function timeNow() {
    var d = new Date(),
      h = (d.getHours()<10?'0':'') + d.getHours(),
      m = (d.getMinutes()<10?'0':'') + d.getMinutes(),
      s = (d.getSeconds()<10?'0':'') + d.getSeconds();

    return h + ':' + m + ':' + s;
  }

  let cognitoAuthFunctions = {
    onSuccess: function(result) {
      console.log('access token + ' + result.getAccessToken().getJwtToken());

      var logins = {};
      logins["cognito-idp." + cognitoRegion + ".amazonaws.com/" + cognitoUserPoolId] = result.getIdToken().getJwtToken();
      var params = {
        IdentityPoolId: cognitoIdentityPoolId,
        Logins: logins
      };

      AWS.config.region = cognitoRegion;
      AWSCognito.config.region = cognitoRegion;

      AWS.config.credentials = new AWS.CognitoIdentityCredentials(params);

      AWS.config.credentials.get(function(refreshErr) {
        if (refreshErr) {
          console.error(refreshErr);
        }
        else {
          $("#unauthMessage").addClass("hidden");
          $("#logoutLink").removeClass("hidden");
          $("#dashboard_content").removeClass("hidden");
          $("#signInSpinner").addClass("hidden");
          getLatestRecord();
        }
      });
    },
    onFailure: function(err) {
      $("#logoutLink").addClass("hidden");
      $("#loginForm").removeClass("hidden");
      $("#signInSpinner").addClass("hidden");

      alert(err);
    },
    newPasswordRequired: function(userAttributes, requiredAttributes) {
      // User was signed up by an admin and must provide new
      // password and required attributes, if any, to complete
      // authentication.
      console.log("New Password Required");
      var newPassword = $("#newPassword").val();

      var attributesData = {};
      if (newPassword.length >= 8 && newPassword.match(/[a-z]/)
        && newPassword.match(/[A-Z]/) && newPassword.match(/[0-9]/)
        && newPassword == $("#newPassword2").val())
      {
        cognitoUser.completeNewPasswordChallenge(newPassword, attributesData, this);
      } else {
        $("#newPasswordModal").modal("show");
      }
    }
  };

}
