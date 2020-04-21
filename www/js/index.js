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

var bandyerPlugin;

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

        bandyerPlugin = BandyerPlugin.setup({
            environment: BandyerPlugin.environments.sandbox(),
            appId: sdkConfig.appIdentifier,
            logEnabled: true,
            // optional you can disable one or more of the following capabilities, by default callkit is enabled
            iosConfig: {
                callkit: {
                    enabled: true,
                    appIconName: "logo_transparent", // optional but recommended
                    ringtoneSoundName: "custom_ringtone.mp3" // optional
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
            console.debug("Voip push Token", token);
            pushRegistrationId = token;
            if (userAlias) {
                registerNotificationDeviceToken();
            }
        });

        var arrayUserDetails = [
            {userAlias: "usr_", firstName : "Name", lastName:"Surname"},
        ];

        bandyerPlugin.addUsersDetails(arrayUserDetails);

        bandyerPlugin.setUserDetailsFormat({
            default: "${firstName} ${lastName}"
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
            android: {senderID: sdkConfig.firebaseProjectNumber},
            ios: {alert: true}
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

        // NOTIFICATIONS
        //
        // --- ANDROID ---
        // Chat&Calls
        // The sample app handles the both kind of notifications by setting the BandyerNotificationService in the config.xml
        // If this type of handling does not fit your requirements check the documentation for alternative ways.
        //
        // --- IOS ---
        // Calls:
        // - Define the target="UIBackgroundModes" in your config.xml as shown in this sample app
        // - Set voipNotificationKeyPath during the plugin setup and the plugin will handle the notifications by itself.
        //
        // Chat:
        // - Listen for normal alert push notification containing the userAlias as title and the message as body and start a chat with that userAlias
        if (device.platform === "iOS") {
            push.on('notification', function (data) {
                console.log(data);
                var otherUser = data.title;
                bandyerPlugin.startChat({
                    userAlias: otherUser,
                    withAudioCallCapability: {recording: false},
                    withAudioUpgradableCallCapability: {recording: false},
                    withAudioVideoCallCapability: {recording: false}
                });
            });
        }
    }
};

app.initialize();
