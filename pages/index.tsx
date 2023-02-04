import React, { useEffect, useMemo, useState } from 'react';
import { ApolloClientTokenizedProvider } from '@deep-foundation/react-hasura/apollo-client-tokenized-provider';
import {
  TokenProvider,
  useTokenController,
} from '@deep-foundation/deeplinks/imports/react-token';
import { useQuery, useSubscription, gql } from '@apollo/client';
import {
  LocalStoreProvider,
  useLocalStore,
} from '@deep-foundation/store/local';
import {
  MinilinksLink,
  MinilinksResult,
  useMinilinksConstruct,
} from '@deep-foundation/deeplinks/imports/minilinks';
import { ChakraProvider, Text } from '@chakra-ui/react';
import { Provider } from '../imports/provider';
import {
  DeepProvider,
  useDeep,
} from '@deep-foundation/deeplinks/imports/client';
import Link from 'next/link';
import { insertPackageLinksToDeep as insertDevicePackageLinksToDeep } from '../imports/device/insert-package-links-to-deep';
import { PACKAGE_NAME as DEVICE_PACKAGE_NAME } from '../imports/device/package-name';
import { insertPackageToDeep as insertDialogPackageToDeep } from '../imports/dialog/insert-package-to-deep';
import { insertPackageToDeep as insertNotificationPackageToDeep } from '../imports/notification/insert-package-to-deep';
import { PACKAGE_NAME as NOTIFICATION_PACKAGE_NAME } from '../imports/notification/package-name';
import { PACKAGE_NAME as DIALOG_PACKAGE_NAME } from '../imports/dialog/package-name';
import { isPackageInstalled } from '../imports/getIsPackageInstalled';

function Page() {
  const deep = useDeep();

  const [deviceLinkId, setDeviceLinkId] = useLocalStore(
    'deviceLinkId',
    undefined
  );

  useEffect(() => {
    if(deep.linkId === 0) {
      deep.guest();
    }
  }, []);

  useEffect(() => {
    new Promise(async () => {
      if (deep.linkId != 0) {
        const adminLinkId = await deep.id('deep', 'admin');
        if (deep.linkId != adminLinkId) {

          await deep.login({
            linkId: adminLinkId,
          });
        }
      }
    });
  }, [deep]);

  useEffect(() => {
    if(deep.linkId == 0) {
      return;
    }
    new Promise(async () => {
      const adminLinkId = await deep.id('deep', 'admin');
      if (deep.linkId != adminLinkId) {
        return;
      }
      
      if (!await isPackageInstalled({deep, packageName: DEVICE_PACKAGE_NAME})) {
        await insertDevicePackageLinksToDeep({deep});
      }
      if (!deviceLinkId) {
        const initializeDeviceLink = async () => {
          const deviceTypeLinkId = await deep.id(DEVICE_PACKAGE_NAME, 'Device');
          const containTypeLinkId = await deep.id(
            '@deep-foundation/core',
            'Contain'
          );
          const {
            data: [{ id: newDeviceLinkId }],
          } = await deep.insert({
            type_id: deviceTypeLinkId,
            in: {
              data: [
                {
                  type_id: containTypeLinkId,
                  from_id: deep.linkId,
                },
              ],
            },
          });
          setDeviceLinkId(newDeviceLinkId);
        };
        initializeDeviceLink();
      }

      if (!await isPackageInstalled({deep, packageName: NOTIFICATION_PACKAGE_NAME})) {
        await insertNotificationPackageToDeep({ deep });
      }

      if (!await isPackageInstalled({deep, packageName: DIALOG_PACKAGE_NAME})) {
        await insertDialogPackageToDeep({ deep });
      }
    });
  }, [deep]);

  return (
    <div>
      <h1>Deep.Foundation sdk examples</h1> 
      <Text suppressHydrationWarning>Authentication Link Id: {deep.linkId ?? " "}</Text> 
      <Text suppressHydrationWarning>Device Link Id: {deviceLinkId ?? " "}</Text>
       <div>
        <Link href="/all">all subscribe</Link>
      </div>
      <div>
        <Link href="/messanger">messanger</Link>
      </div>
      <div>
        <Link href="/device">device</Link>
      </div> 
      <div>
        <Link href="/dialog">dialog</Link>
      </div> 
    </div>
  );
}

export default function Index() {
  return (
    <>
      <ChakraProvider>
        <Provider>
          <DeepProvider>
            <Page />
          </DeepProvider>
        </Provider>
      </ChakraProvider>
    </>
  );
}
