/* eslint-disable */

/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

const functions = require("firebase-functions");

const admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);
let db = admin.firestore();
db.settings({ timestampsInSnapshots: true });

async function getUser(userId) {
  let userRef = db.collection("Users").doc(userId);
  let getDoc = userRef
    .get()
    .then((doc) => {
      if (!doc.exists) {
        console.log("No such document!");
        return 0;
      } else {
        console.log("Document data:", doc.data());
        return doc.data();
      }
    })
    .catch((err) => {
      console.log("Error getting document", err);
    });
  // [END get_document]
  return getDoc;
}

exports.sendNotification = functions.firestore
  .document("Notifications/{id}")
  .onCreate(async (snapshot, context) => {
    const user = await getUser(snapshot.data().userId);
    let recipientDetails;
    if (snapshot.data().recipientId) {
      recipientDetails = {
        recipientId: snapshot.data().recipientId,
        productId: snapshot.data().productId,
        screen: "ChatDetails",
        badge: user.unreadNotifications || 0,
      };
    } else {
      recipientDetails = {};
    }

    const dataPayload = JSON.stringify(recipientDetails);

    const message = {
      // tokens: [snapshot.data().receiverToken],
      tokens: snapshot.data().receiverToken,
      notification: {
        title: `${snapshot.data().title}`,
        body: `${snapshot.data().body}`,
      },
      data: {
        details: dataPayload, // Wrap the stringified payload in an object
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            sound: "horn.wav",
            badge: user.unreadNotifications || 0,
          },
        },
      },
      ios: {
        sound: "horn.wav",
      },
      android: {
        priority: "high",
        notification: {
          channel_id: "sound_channel",
          sound: "horn.wav",
          notification_count: 20,
        },
      },
    };

    return await admin
      .messaging()
      .sendEachForMulticast(message)
      .then((response) => {
        return logger.info(`A new notification for  =====`, response);
      })
      .catch((e) => logger.info("------ error:", e));
  });

/* eslint-enable */
