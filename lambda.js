//assignment 1
// exports.handler = (event, context, callback) => {
//     // TODO implement
//     var response='Hello';
//     console.log(event)
//     switch (event.data) {
//         case 'Hi':
//             response ='Welcome';
//             break;
//         case 'How are you?':
//             response =' I am good, what can I do for you?';
//             break;
                
//         default:
//             // code
//     }

    
//     callback(null, response);
// };

//assignment 2
var AWS = require('aws-sdk');
var lexruntime = new AWS.LexRuntime();

exports.handler = (event, context, callback) => {
    console.log(event);

    if (event.data) {
        var params = {
            botAlias: 'Prod', /* required */
            botName: 'DiningService', /* required */
            inputText: event.data, /* required */
            userId: 'chat-user-12345', /* required */
        };
        lexruntime.postText(params, function(err, data) {
            if (err) {
              console.log(err, err.stack); // an error occurred
            } else {
                console.log(data); // successful response
                callback(null, data.message);
            }   
        });
    }
};