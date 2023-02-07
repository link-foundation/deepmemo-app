import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TokenProvider } from '@deep-foundation/deeplinks/imports/react-token';
import {
  LocalStoreProvider,
  useLocalStore,
} from '@deep-foundation/store/local';
import {
  DeepProvider,
  useDeep,
  useDeepSubscription,
} from '@deep-foundation/deeplinks/imports/client';
import { Button, ChakraProvider, Input, Link, Stack, Text, Divider } from '@chakra-ui/react';
import { PACKAGE_NAME as DEVICE_PACKAGE_NAME } from '../imports/device/package-name';
import { Provider } from '../imports/provider';
import { PushNotifications } from '@capacitor/push-notifications';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Device } from '@capacitor/device';
import { getMessaging, getToken, Messaging, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyAdW-DEUZuYcN-1snWNcL7QvtkNdibT_vY',
  authDomain: 'deep-97e93.firebaseapp.com',
  projectId: 'deep-97e93',
  storageBucket: 'deep-97e93.appspot.com',
  messagingSenderId: '430972811028',
  appId: '1:430972811028:web:7c43130f8166c437c03401',
  measurementId: 'G-NJ1R8HDWLK',
};

const PACKAGE_NAME = '@deep-foundation/push-notifications';

function Page() {
  const deep = useDeep();
  const [deviceLinkId, setDeviceLinkId] = useLocalStore(
    'deviceLinkId',
    undefined
  );

  // TODO Do not let to use functionality if package is not initialized. Do not do this TODO until bug with twice rerender caused by useDeepSubsciption is fixed
  const [isPackageInitialized, setIsPackageInitialized] = useState(undefined);

  const [deviceRegistrationTokenLinkId, setDeviceRegistrationTokenLinkId] =
    useLocalStore('deviceRegistrationToken', undefined);

  const [isPermissionsGranted, setIsPermissionsGranted] = useState(undefined);

  const [platform, setPlatform] = useState(undefined);

  const [firebaseApplication, setFirebaseApplication] = useState<FirebaseApp>(undefined);
  const [firebaseMessaging, setFirebaseMessaging] = useState<Messaging>(undefined);

  useEffect(() => {
    const firebaseApplication = initializeApp(firebaseConfig);
    window["firebaseApplication"] = firebaseApplication;
    setFirebaseApplication(firebaseApplication);

    const firebaseMessaging = getMessaging(firebaseApplication);
    window["firebaseMessaging"] = firebaseMessaging;
    setFirebaseMessaging(firebaseMessaging);
  }, []);

  useEffect(() => {
    new Promise(async () => {
      // TODO: Get platform from deep
      // const {data: [platformLink]} = await deep.select({
      //   type_id: {
      //     _id: ["@deep-foundation/core", "Contain"]
      //   },
      //   from_id: deviceLinkId,
      //   to: {
      //     type_id: {
      //       _id: ["@deep-foundation/device", "Platform"]
      //     }
      //   }
      // });
      // const platform = platformLink.value.value;
      // setPlatform(platform);

      const deviceInfo = await Device.getInfo();
      setPlatform(deviceInfo.platform);
    });
  }, []);

  useEffect(() => {
    new Promise(async () => {
      let isPermissionsGranted: boolean;
      if (!platform) {
        return;
      } else if (platform === 'web') {
        isPermissionsGranted = Notification.permission === 'granted';
      } else {
        let permissionsStatus = await PushNotifications.checkPermissions();
        isPermissionsGranted = permissionsStatus.receive === 'granted';
      }

      setIsPermissionsGranted(isPermissionsGranted);
    });
  }, [deviceLinkId, deviceRegistrationTokenLinkId, platform]);

  const [webPushCertificate, setWebPushCertificate] = useState<string|undefined>(undefined);  

  return (
    <Stack>
      <Text suppressHydrationWarning>Device link id{deviceLinkId ?? ' '}</Text>
      <Text suppressHydrationWarning>
        Device registration token link id {deviceRegistrationTokenLinkId ?? ' '}
      </Text>
      <Text suppressHydrationWarning>Platform: {platform ?? ' '}</Text>
      <Text suppressHydrationWarning>
        Permissions are {!isPermissionsGranted && 'not'} granted
      </Text>
      <Button
        disabled={!platform}
        onClick={() => {
          new Promise(async () => {
            let isPermissionsGranted: boolean;
            if (!platform) {
              return;
            } else if (platform === 'web') {
              const permissionsStatus = await Notification.requestPermission();
              isPermissionsGranted = permissionsStatus === 'granted';
            } else {
              const permissionsStatus =
                await PushNotifications.requestPermissions();
              isPermissionsGranted = permissionsStatus.receive === 'granted';
            }
            setIsPermissionsGranted(isPermissionsGranted);
          });
        }}
      >
        Request permissions
      </Button>

      <Button
        disabled={
          !isPermissionsGranted ||
          !platform ||
          !firebaseApplication ||
          !firebaseMessaging
        }
        onClick={async () => {
          console.log({ platform });

          const insertDeviceRegistrationTokenToDeep = async ({
            deviceRegistrationToken,
          }: {
            deviceRegistrationToken: string;
          }) => {
            const deviceRegistrationTokenTypeLinkId = await deep.id(
              PACKAGE_NAME,
              'DeviceRegistrationToken'
            );
            const containTypeLinkId = await deep.id(
              '@deep-foundation/core',
              'Contain'
            );
            console.log({ deviceLinkId });

            await deep.delete({
              down: {
                parent: {
                  type_id: containTypeLinkId,
                  from_id: deviceLinkId,
                  to: {
                    type_id: deviceRegistrationTokenTypeLinkId,
                  },
                },
              },
            });

            const {
              data: [{ id: deviceRegistrationTokenLinkId }],
            } = await deep.insert({
              type_id: deviceRegistrationTokenTypeLinkId,
              string: {
                data: {
                  value: deviceRegistrationToken,
                },
              },
              in: {
                data: {
                  type_id: containTypeLinkId,
                  from_id: deviceLinkId,
                },
              },
            });
            console.log({ deviceRegistrationTokenLinkId });
            setDeviceRegistrationTokenLinkId(deviceRegistrationTokenLinkId);
          };

          if (platform === 'web') {
            console.log(firebaseApplication);
            console.log(firebaseMessaging);

            const serviceWorkerRegistration = await navigator.serviceWorker.register('firebase-messaging-sw.js', { type: 'module', scope: 'firebase-cloud-messaging-push-scope' });
            const deviceRegistrationToken = await getToken(firebaseMessaging, {
              serviceWorkerRegistration,
              vapidKey:
                'BIScptqotJFzjF7G6efs4_WCrbfVA0In5WaGU-bK62w083TNgfpQoqVKCbjI0ykZLWXbIQLQ1_iEi91u1p4YrH4',

            });

            await insertDeviceRegistrationTokenToDeep({
              deviceRegistrationToken,
            });
          } else {
            await PushNotifications.addListener(
              'registration',
              async ({value: deviceRegistrationToken}) => {
                await insertDeviceRegistrationTokenToDeep({deviceRegistrationToken})
              }
            );
            await PushNotifications.register();
          }
        }}
      >
        Register
      </Button>
      <Text>WebPushCertificate can be found on <Link>https://console.firebase.google.com/project/PROJECT_NAME/settings/cloudmessaging</Link>. Do not forget to change PROJECT_NAME in URL to your project name</Text>
      <Input placeholder={"WebPushCertificate"} onChange={(event) => {
        setWebPushCertificate(event.target.value);
      }}></Input>
      <Button isDisabled={!webPushCertificate} onClick={async () => {
        const containTypeLinkId = await deep.id("@deep-foundation/core", "Contain");
        const webPushCertificateTypeLinkId = await deep.id(PACKAGE_NAME, "WebPushCertificate");
        console.log({ deviceLinkId });

        await deep.delete({
          down: {
            parent: {
              type_id: containTypeLinkId,
              from_id: deviceLinkId,
              to: {
                type_id: webPushCertificateTypeLinkId,
              },
            },
          },
        });
        await deep.insert({
          type_id: webPushCertificateTypeLinkId,
          string: {
            data: {
              value: webPushCertificate
            }
          },
          in: {
            data: [{
              type_id: containTypeLinkId,
              from_id: deviceLinkId
            }]
          }
        })        
      }}>Insert WebPushCertificate</Button>
      <Button
        disabled={
          !isPermissionsGranted ||
          !platform ||
          !deviceRegistrationTokenLinkId ||
          !firebaseApplication ||
          !firebaseMessaging
        }
        onClick={async () => {
          const listenPushNotifications = async () => {
            console.log({ platform });

            // if (platform === 'web') {
            onMessage(firebaseMessaging, async (payload) => {
              console.log({payload});
              
              // await insertPushNotificationToDeep({
              //   deep,
              //   deviceLinkId,
              //   payload,
              // });
            });
            // } else {
            //   await PushNotifications.addListener(
            //     'pushNotificationReceived',
            //     async (notification) => {
            //       const notificationTypeLinkId = await deep.id(
            //         PACKAGE_NAME,
            //         'Notification'
            //       );
            //       const containTypeLinkId = await deep.id(
            //         '@deep-foundation/core',
            //         'Contain'
            //       );
            //       const {
            //         data: [{ id: notificationLinkId }],
            //       } = await deep.insert({
            //         type_id: notificationTypeLinkId,
            //         in: {
            //           data: {
            //             type_id: containTypeLinkId,
            //             from_id: deviceLinkId,
            //           },
            //         },
            //       });

            //       const titleTypeLinkId = await deep.id(PACKAGE_NAME, 'Title');
            //       await deep.insert({
            //         type_id: titleTypeLinkId,
            //         string: {
            //           data: {
            //             value: notification.title,
            //           },
            //         },
            //         in: {
            //           data: {
            //             type_id: containTypeLinkId,
            //             from_id: notificationLinkId,
            //           },
            //         },
            //       });

            //       const subtitleTypeLinkId = await deep.id(
            //         PACKAGE_NAME,
            //         'Subtitle'
            //       );
            //       await deep.insert({
            //         type_id: subtitleTypeLinkId,
            //         string: {
            //           data: {
            //             value: notification.subtitle,
            //           },
            //         },
            //         in: {
            //           data: {
            //             type_id: containTypeLinkId,
            //             from_id: notificationLinkId,
            //           },
            //         },
            //       });

            //       const bodyTypeLinkId = await deep.id(PACKAGE_NAME, 'Body');
            //       await deep.insert({
            //         type_id: bodyTypeLinkId,
            //         string: {
            //           data: {
            //             value: notification.body,
            //           },
            //         },
            //         in: {
            //           data: {
            //             type_id: containTypeLinkId,
            //             from_id: notificationLinkId,
            //           },
            //         },
            //       });

            //       const idTypeLinkId = await deep.id(PACKAGE_NAME, 'Id');
            //       await deep.insert({
            //         type_id: idTypeLinkId,
            //         string: {
            //           data: {
            //             value: notification.id,
            //           },
            //         },
            //         in: {
            //           data: {
            //             type_id: containTypeLinkId,
            //             from_id: notificationLinkId,
            //           },
            //         },
            //       });

            //       const tagTypeLinkId = await deep.id(PACKAGE_NAME, 'Tag');
            //       await deep.insert({
            //         type_id: tagTypeLinkId,
            //         string: {
            //           data: {
            //             value: notification.tag,
            //           },
            //         },
            //         in: {
            //           data: {
            //             type_id: containTypeLinkId,
            //             from_id: notificationLinkId,
            //           },
            //         },
            //       });

            //       const badgeTypeLinkId = await deep.id(PACKAGE_NAME, 'Badge');
            //       await deep.insert({
            //         type_id: badgeTypeLinkId,
            //         number: {
            //           data: {
            //             value: notification.badge,
            //           },
            //         },
            //         in: {
            //           data: {
            //             type_id: containTypeLinkId,
            //             from_id: notificationLinkId,
            //           },
            //         },
            //       });

            //       const payloadTypeLinkId = await deep.id(
            //         PACKAGE_NAME,
            //         'Payload'
            //       );
            //       await deep.insert({
            //         type_id: payloadTypeLinkId,
            //         object: {
            //           data: {
            //             value: notification.data,
            //           },
            //         },
            //         in: {
            //           data: {
            //             type_id: containTypeLinkId,
            //             from_id: notificationLinkId,
            //           },
            //         },
            //       });

            //       const clickActionTypeLinkId = await deep.id(
            //         PACKAGE_NAME,
            //         'ClickAction'
            //       );
            //       await deep.insert({
            //         type_id: clickActionTypeLinkId,
            //         string: {
            //           data: {
            //             value: notification.click_action,
            //           },
            //         },
            //         in: {
            //           data: {
            //             type_id: containTypeLinkId,
            //             from_id: notificationLinkId,
            //           },
            //         },
            //       });

            //       const deepLinkTypeLinkId = await deep.id(
            //         PACKAGE_NAME,
            //         'DeepLink'
            //       );
            //       await deep.insert({
            //         type_id: deepLinkTypeLinkId,
            //         string: {
            //           data: {
            //             value: notification.link,
            //           },
            //         },
            //         in: {
            //           data: {
            //             type_id: containTypeLinkId,
            //             from_id: notificationLinkId,
            //           },
            //         },
            //       });

            //       const groupTypeLinkId = await deep.id(PACKAGE_NAME, 'Group');
            //       await deep.insert({
            //         type_id: groupTypeLinkId,
            //         string: {
            //           data: {
            //             value: notification.group,
            //           },
            //         },
            //         in: {
            //           data: {
            //             type_id: containTypeLinkId,
            //             from_id: notificationLinkId,
            //           },
            //         },
            //       });

            //       if (notification.groupSummary) {
            //         const isGroupSummaryTypeLinkId = await deep.id(
            //           PACKAGE_NAME,
            //           'IsGroupSummary'
            //         );
            //         await deep.insert({
            //           type_id: isGroupSummaryTypeLinkId,
            //           in: {
            //             data: {
            //               type_id: containTypeLinkId,
            //               from_id: notificationLinkId,
            //             },
            //           },
            //         });
            //       }
            //     }
            //   );
            // }
          };

          listenPushNotifications();
        }}
      >
        Listen push notifications
      </Button>
    </Stack>
  );
}

export default function PushNotificationsPage() {
  return (
    <ChakraProvider>
      <Provider>
        <DeepProvider>
          <Page />
        </DeepProvider>
      </Provider>
    </ChakraProvider>
  );
}
