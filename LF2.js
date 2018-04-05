'use strict';

var AWS = require('aws-sdk');
var sqs = new AWS.SQS();
//var sns = new AWS.SNS();

var https = require("https");

// function sendTextMessage(text, phone, callback) {
//     // text = "Hello! Here are my Japanese restaurant suggestions for 2 people," + 
//     //        "for today at 7 pm: 1. Sushi Nakazawa, located at 23 Commerce St," +
//     //        "2. Jin Ramen, located at 3183 Broadway, " + 
//     //        "3. Nikko, located at 1280 Amsterdam Ave. Enjoy your meal!";
//     // phone = "+13477614173";

//     var params = {
//       Message: text, /* required */
//       PhoneNumber: phone,
//       Subject: 'Restaurant suggestions',
//     };
//     sns.publish(params, function(err, data) {
//       if (err) console.log(err, err.stack); // an error occurred
//       else     console.log(data);           // successful response

//       callback(null, "Send message to user's phone number");
//     });
// }

function sendEmailMessage(text, email, callback){
    // Create sendEmail params 
var params = {
  Destination: { /* required */
    ToAddresses: [
      email,
      /* more items */
    ]
  },
  Message: { /* required */
    Body: { /* required */
      Text: {
       Charset: "UTF-8",
       Data: text
      }
     },
     Subject: {
      Charset: 'UTF-8',
      Data: 'Restaurant Suggestions'
     }
    },
  Source: 'qs479@nyu.edu', /* required */
};       

// Create the promise and SES service object
var sendPromise = new AWS.SES({apiVersion: '2010-12-01'}).sendEmail(params).promise();

// Handle promise's fulfilled/rejected states
sendPromise.then(
  function(data) {
    console.log(data.MessageId);
  }).catch(
    function(err) {
    console.error(err, err.stack);
  });
}

function formatText(cuisine, peopleNum, date, time, recommendList) {
    var text = "Hello! Here are my " + cuisine + " restaurant suggestions for " + 
               peopleNum + ", for " + date + " " + time + ": ";
    for (let i = 0; i < recommendList.length; ++i) {
        text += (i+1) + ". " + recommendList[i].name + ", located at " + recommendList[i].address; 
        text += i == recommendList.length-1 ? ". Enjoy your meal!" : ", ";
    }
    return text;
}

function getSuggestionList(message, callback) {
    // message organization: 
    // { "Cuisine":"Japanese",
    //   "Phone":"1234567890",
    //   "Time":"19:00",
    //   "PeopleNum":"Two people",
    //   "Date":"2018-04-01",
    //   "Location":"Manhattan" }

    // console.log(message);
    
//    var phone = "+1" + message.Phone;
    var email = message.Email;
    var dict = { location: message.Location.replace(/ /g, "%20"), 
                 categories: message.Cuisine.toLowerCase()+",All",
                 open_at: Math.floor((new Date(message.Date + " " + message.Time)).getTime()/1000),
                 sort_by : "review_count",
                 price : "3",
                 limit: 3 };
    // console.log(dict);

    // var dict = { location : "Manhattan", 
    //              categories: "japanese,All",
    //              open_at : Math.floor(Date.now()/1000),
    //              limit: 3};

    var dict_arr = [];
    for (let k in dict) {
      dict_arr.push(k + "=" + dict[k]);
    }
    var criteria = dict_arr.join("&");
    console.log(criteria);

    var token = "CTaE1qPl13ixw3DRfe2frhwAFbn2Jgl0pi6xX3YKV5WIso139ZHtmz8aQd0VsgyGGZnsCCb8S-GH0zbS9himLVmfpYK_9tR1s4IuxxzPBwxlYAEK85hJDYeBkNLCWnYx";
    var object = {
        port: 443,
        hostname: "api.yelp.com",
        path: "/v3/businesses/search?" + criteria,
        headers: { "Authorization": "Bearer " + token}
    };

    var result = [];
    https.get(object, res => {
        res.setEncoding("utf8");
        let body = "";
        res.on("data", data => {
            body += data;
        });
        res.on("end", () => {
            body = JSON.parse(body);
            console.log(body);

            for (let i in body.businesses) {
              result.push({name: body.businesses[i].name, address: body.businesses[i].location.address1});
            }

            console.log(result);
            let text = formatText(message.Cuisine, message.PeopleNum, message.Date, message.Time, result);
            console.log(text);
//            sendTextMessage(text, phone, callback);
            sendEmailMessage(text, email, callback);
        });
    });
}

function receiveMessage(callback) {
    var params = {
        QueueName: 'RestaurantQueue', /* required */
    };
    sqs.getQueueUrl(params, function(err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
            callback(null, "receiveMessage::Failed to getQueueUrl");
        } else {
            console.log(data); // successful response

            var params = {
              QueueUrl: data.QueueUrl, /* required */
              MaxNumberOfMessages: 1,
              VisibilityTimeout: 0,
              WaitTimeSeconds: 0
            };
            sqs.receiveMessage(params, function(err, data) {
                if (err) {
                      console.log(err, err.stack); // an error occurred
                      callback(null, "receiveMessage::Failed to receive message");
                } else {
                    if (data.Messages && data.Messages.length > 0) {
                        console.log(((data.Messages)[0]).Body); // successful response
                        getSuggestionList(JSON.parse(((data.Messages)[0]).Body), callback);
                    } else {
                        callback(null, "receiveMessage::no message in SQS queue");
                    }
                }
            });
        }
    });
}

exports.handler = (event, context, callback) => {

    receiveMessage(callback);
//    SendEmailMessage("hello", "qs479@nyu.edu", callback);
    
};