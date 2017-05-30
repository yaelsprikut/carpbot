/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
var Conversation = require('watson-developer-cloud/conversation/v1'); // watson sdk
var axios = require('axios');
var Botkit = require('botkit');
var slackController = Botkit.slackbot();

var app = express();

var slackBot = slackController.spawn({
    token: 'xoxb-184360541733-dV7SbjHut2JKlyjkzvo2xqZy'
});

var watsonMiddleware = require('botkit-middleware-watson')({
  username: '33d0cf97-b7a3-4fe8-af64-4dac40d23ee1',
  password: '2MlUCcbIZ8Bz',
  workspace_id: 'c5789c0c-073c-4a0d-93b5-f004bb4da7d5',
  version_date: '2016-09-20',
  minimum_confidence: 0.50, // (Optional) Default is 0.75
});

slackController.middleware.receive.use(watsonMiddleware.receive);
slackBot.startRTM();

slackController.hears(['.*'], ['direct_message', 'direct_mention', 'mention'], function(bot, message) {
    bot.reply(message, message.watsonData.output.text.join('\n'));
});


// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// Create the service wrapper
var conversation = new Conversation({
  // If unspecified here, the CONVERSATION_USERNAME and CONVERSATION_PASSWORD env properties will be checked
  // After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
  username: '33d0cf97-b7a3-4fe8-af64-4dac40d23ee1',
  password: '2MlUCcbIZ8Bz',
  url: 'https://gateway.watsonplatform.net/conversation/api',
  version_date: '2016-10-21',
  version: 'v1'
});

// Endpoint to be call from the client side
app.post('/api/message', function(req, res) {
  var workspace = process.env.WORKSPACE_ID || '<workspace-id>';
  if (!workspace || workspace === '<workspace-id>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    });
  }
  var payload = {
    workspace_id: workspace,
    context: req.body.context || {},
    input: req.body.input || {}
  };

  // Send the input to the conversation service
  conversation.message(payload, function(err, data) {
    if (err) {
      return res.status(err.code || 500).json(err);
    }
    return res.json(updateMessage(payload, data));
  });
});

/**
 * Updates the response text using the intent confidence
 * @param  {Object} input The request to the Conversation service
 * @param  {Object} response The response from the Conversation service
 * @return {Object}          The response with the updated message
 */
function updateRecord(email) {

}

function makeAPICall(email) {
  axios.post('http://sub.zoomermedia.ca/sub', {
      CARP_Express_Subscribed__pc: true,
      Personemail: email,
      lastName: 'Flintstone'
    })
    .then(function (data) {
      console.log(data);
    })
    .catch(function (error) {
      console.log(error);
    });
}
function updateMessage(input, response) {
  var responseText = null;
  if (!response.output) {
    response.output = {};
  } else {
    console.log("message received");
    if (response.output.action === 'subscribe') {
      console.log("got your email!");
      var email = response.input.text;
      // console.log("The intended action triggered is " + response.output.action + " and the captured email is " + email);
      // app.post('http://sub.zoomermedia.ca/sub', function (req, res) {
      //   var email = response.input.text;
      //   var lastname = "IBMLast";
      //
      //   //var body =
      //   res.setHeader('Content-Type', 'application/json');
      //   res.send(JSON.stringify({ Personemail: email, Id: id, lastname: lastname, CARP_Express_Subscribed__pc: }));
      // });
      // makeAPICall(email);


      //   type: "POST",
      //   url: "http://sub.zoomermedia.ca/sub",
      //   body: `Classical963_Subscribed__pc=true&Classical963_Contact_Status__pc=Subscribed&Classical963_Last_Update_Date__pc=&firstname=Test&lastname=TestIBM&Personemail=${email}`
    }
    return response;
  }

  if (response.intents && response.intents[0]) {
    var intent = response.intents[0];
    // Depending on the confidence of the response the app can return different messages.
    // The confidence will vary depending on how well the system is trained. The service will always try to assign
    // a class/intent to the input. If the confidence is low, then it suggests the service is unsure of the
    // user's intent . In these cases it is usually best to return a disambiguation message
    // ('I did not understand your intent, please rephrase your question', etc..)
    if (intent.confidence >= 0.75) {
      responseText = 'I understood your intent was ' + intent.intent;
    } else if (intent.confidence >= 0.5) {
      responseText = 'I think your intent was ' + intent.intent;
    } else {
      responseText = 'I did not understand your intent';
    }
  }
  response.output.text = responseText;
  return response;
}

module.exports = app;
