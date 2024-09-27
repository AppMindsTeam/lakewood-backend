/* eslint-disable */

/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');

const functions = require('firebase-functions');

const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
let db = admin.firestore();
db.settings({ timestampsInSnapshots: true });

const Typesense = require('typesense');

const client = new Typesense.Client({
  nodes: [
    {
      host: 'n2zuwmjsilropd1xp-1.a1.typesense.net', // Replace with your Typesense server host
      port: 443, // Replace with your server port
      protocol: 'https', // Use 'https' if using Typesense Cloud or a secured server
    },
  ],
  apiKey: '7J6yMPeyWPSbPbR4q9tNtp3cgwi1fbc8', // Replace with your API key
  connectionTimeoutSeconds: 4,
});

// Firestore trigger for new product addition
exports.syncNewProductToTypesense = functions.firestore
  .document('Products/{productId}')
  .onCreate(async (snap, context) => {
    const newProduct = snap.data();
    const productId = context.params.productId;

    try {
      // Add the new product to Typesense
      await client
        .collections('Products')
        .documents()
        .create({
          ...newProduct,
          id: productId,
          createdAt: newProduct.createdAt ? newProduct.createdAt.toDate() : '',
        });
      logger.log(`Successfully added product ${productId} to Typesense`);
    } catch (error) {
      logger.error(`Error adding product ${productId} to Typesense:`, error);
    }
  });

// function getUser(userId) {
//   // [START get_document]
//   let userRef = db.collection("Users").doc(userId);
//   let getDoc = userRef
//     .get()
//     .then((doc) => {
//       if (!doc.exists) {
//         console.log("No such document!");
//         return 0;
//       } else {
//         console.log("Document data:", doc.data());
//         return doc.data();
//       }
//     })
//     .catch((err) => {
//       console.log("Error getting document", err);
//     });
//   // [END get_document]
//   return getDoc;
// }

exports.sendNotification = functions.firestore
  .document('Notifications/{id}')
  .onCreate(async (snapshot, context) => {
    let recipientDetails;
    if (snapshot.data().recipientId) {
      recipientDetails = {
        recipientId: snapshot.data().recipientId,
        productId: snapshot.data().productId,
        screen: 'ChatDetails',
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
          'apns-priority': '10',
        },
        payload: {
          aps: {
            sound: 'horn.wav',
          },
        },
      },
      ios: {
        sound: 'horn.wav',
      },
      android: {
        priority: 'high',
        notification: {
          channel_id: 'sound_channel',
          sound: 'horn.wav',
        },
      },
    };

    return await admin
      .messaging()
      .sendEachForMulticast(message)
      .then((response) => {
        return logger.info(`A new notification for  =====`, response);
      })
      .catch((e) => logger.info('------ error:', e));
  });

/* eslint-enable */
