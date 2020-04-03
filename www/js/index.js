/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var app = {
    initialize: function () {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    onDeviceReady: function () {
        var loginButton = $('#loginButton');
        var logoutButton = $('#logoutButton');
        var userToLoginInputText = $('#userToLoginInputText');
        var callButton = $('#callButton');
        var chatButton = $('#chatButton');
        var userToContactInputText = $('#userToContactInputText');
        var storage = window.localStorage;

        var pushRegistrationId = null;

        var disableLogin = function () {
            userToLoginInputText.prop('disabled', true);
            loginButton.prop('disabled', true);
            logoutButton.prop('disabled', false);
        };

        var enableLogin = function () {
            userToLoginInputText.prop('disabled', false);
            loginButton.prop('disabled', false);
            logoutButton.prop('disabled', true);
            callButton.prop('disabled', true);
            chatButton.prop('disabled', true);
            storage.removeItem("userAlias");
        };

        var registerNotificationDeviceToken = function () {
            cordova.plugin.http.post("https://sandbox.bandyer.com/mobile_push_notifications/rest/device", {
                    user_alias: userAlias,
                    app_id: sdkConfig.appIdentifier,
                    push_token: pushRegistrationId,
                    platform: device.platform.toLowerCase()
                }, {}
                , function (response) {
                    console.debug("subscribed for notifications");
                }
                , function (response) {
                    console.error("Failed to subscribe for notifications");
                });
        };

        var deregisterNotificationDeviceToken = function () {
            cordova.plugin.http.delete("https://sandbox.bandyer.com/mobile_push_notifications/rest/device/" + userAlias + "/" + sdkConfig.appIdentifier + "/" + pushRegistrationId, {}, {}
                , function (response) {
                    console.debug("notification unregister success ")
                }
                , function (response) {
                    console.error("notification unregister error")
                })
        };

        callButton.prop('disabled', true);
        chatButton.prop('disabled', true);
        logoutButton.prop('disabled', true);

        var bandyerPlugin = BandyerPlugin.setup({
            environment: BandyerPlugin.environments.sandbox(),
            appId: sdkConfig.appIdentifier,
            logEnabled: true,
            // optional you can disable one or more of the following capabilities, by default callkit is enabled
            iosConfig: {
                callkit: {
                    enabled: false,
                    appIconName: "logo_transparent", // optional but recommended
                    ringtoneSoundName: "custom_ringtone" // optional
                },
                fakeCapturerFileName: 'sample',
                voipNotificationKeyPath: 'data'
            },
            // optional you can disable one or more of the following capabilities, by default all additional modules are enabled
            androidConfig: {
                callEnabled: true,
                fileSharingEnabled: true,
                chatEnabled: true,
                screenSharingEnabled: true,
                whiteboardEnabled: true
            }
        });

        bandyerPlugin.on(BandyerPlugin.events.callModuleStatusChanged, function (status) {
            console.debug("callModuleStatusChanged", status);
            var callButton = $('#callButton');
            callButton.prop('disabled', status !== 'ready');
        });

        bandyerPlugin.on(BandyerPlugin.events.chatModuleStatusChanged, function (status) {
            console.debug("chatModuleStatusChanged", status);
            var chatButton = $('#chatButton');
            chatButton.prop('disabled', status !== 'ready');
        });

        bandyerPlugin.on(BandyerPlugin.events.callError, function (reason) {
            console.error("callError", reason);
            enableLogin();
        });

        bandyerPlugin.on(BandyerPlugin.events.chatError, function (reason) {
            console.error("chatError", reason);
            enableLogin();
        });

        bandyerPlugin.on(BandyerPlugin.events.setupError, function (reason) {
            console.error("setupError", reason);
        });

        bandyerPlugin.on(BandyerPlugin.events.iOSVoipPushTokenUpdated, function (token) {
            console.debug("Push Token ", token);
        });

        var userAlias = storage.getItem("userAlias");
        if (userAlias) {
            userToLoginInputText.val(userAlias);
            bandyerPlugin.startFor(userAlias);
            disableLogin();
        }

        loginButton.click(function () {
            var userAlias = userToLoginInputText.val();
            console.debug("Logging in as:", userAlias);
            bandyerPlugin.startFor(userAlias);
            disableLogin();
            storage.setItem("userAlias", userAlias);
            if (pushRegistrationId) {
                registerNotificationDeviceToken();
            }
        });

        logoutButton.click(function () {
            console.debug("Logging out");
            bandyerPlugin.stop();
            enableLogin();
            if (pushRegistrationId && userAlias && sdkConfig.appIdentifier) {
                deregisterNotificationDeviceToken();
            }
        });

        callButton.click(function () {
            var otherUser = userToContactInputText.val();
            console.debug("Create call with:", otherUser);
            bandyerPlugin.startCall({
                userAliases: [otherUser],
                callType: BandyerPlugin.callTypes.AUDIO_VIDEO,
                recording: false
            });
        });

        chatButton.click(function () {
            var otherUser = userToContactInputText.val();
            console.debug("Chat with:", otherUser);
            bandyerPlugin.startChat({
                userAlias: otherUser,
                withAudioCallCapability: {recording: false},
                withAudioUpgradableCallCapability: {recording: false},
                withAudioVideoCallCapability: {recording: false}
            });
        });

        // configure push notifications
        var push = PushNotification.init({
            android: {senderID: sdkConfig.firebaseProjectNumber}
        });

        push.on('registration', function (data) {
            pushRegistrationId = data.registrationId;
            if (userAlias) {
                registerNotificationDeviceToken();
            }
        });

        push.on('error', function (e) {
            console.error(e.message);
        });

        // IMPORTANT: Due to platform limits in Android no js method will ever be called when the app is closed or in background!
        // To handle notifications while in background and/or with app closed you may:
        // 1) use phonegap-plugin-push and set server side when the notification is created {"force-start": "1"} (This will open the app and put it right away in background and then handle the notifications)
        // 2) Handle yourself the notifications natively, it will allow you to define a different behaviour based on your own logic
        // 3) Define the lines as described in our documentation in your config.xml and the bandyer-plugin will handle them for you natively (No handling notification callback via js will ever be called, `BandyerPlugin.handlePushNotificationPayload` included)
        // Link to documentation:

        // In this sample app:
        // For Android the option number 3 will be used
        // For iOS The following code will be used
        if (device.platform === "iOS") {
            push.on('notification', function (data) {
                console.debug(data.message);
                console.debug(data.title);
                console.debug(data.count);
                console.debug(data.sound);
                console.debug(data.image);
                console.debug(data.additionalData);

                // get bandyer payload as forwarded from your server.
                // In our case  the payload is wrapped inside data object of additionalData
                var bandyerPayload = data.additionalData.data;
                // forward received bandyer payload to bandyer plugin to be handled
                BandyerPlugin.handlePushNotificationPayload({
                    payload: bandyerPayload
                }, function () {
                    console.debug("notification handed to bandyer plugin");
                }, function (err) {
                    console.error("notification could not be handed to bandyer plugin", err);
                });
            });
        }
    }
};

app.initialize();
