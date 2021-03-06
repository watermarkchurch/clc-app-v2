import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Platform, View } from 'react-native';
import { gql, useQuery, useMutation, MutationUpdaterFn, ApolloCache, FetchResult } from '@apollo/client';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTrack } from '@apollosproject/ui-analytics';

import { styled, ChannelLabel, H6, Button } from '@apollosproject/ui-kit';

import RegisterButton from '../NodeSingleInner/RegisterButton';
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';

const QUERY = gql`
  query getRegistrationStatusByContentfulId($contentfulId: ID!) {
    node: eventByContentfulId(contentfulId: $contentfulId) {
      id
      title
      registered
      capacity
      isRegistered
    }
  }
`;

const REGISTER = gql`
  mutation register($nodeId: ID!) {
    node: register(nodeId: $nodeId) {
      id
      title
      registered
      capacity
      isRegistered
    }
  }
`;

const UNREGISTER = gql`
  mutation unregister($nodeId: ID!) {
    node: unregister(nodeId: $nodeId) {
      id
      title
      registered
      capacity
      isRegistered
    }
  }
`;

interface Event {
  id: string
  title: string
  registered?: number
  capacity?: number
  isRegistered?: boolean
}

interface QueryData {
  node: Event
}

const ModalBackgroundView = styled(({ theme }: any) => ({
  borderTopLeftRadius: theme.sizing.baseUnit,
  borderTopRightRadius: theme.sizing.baseUnit,
  backgroundColor: theme.colors.background.paper,
  ...Platform.select({ ios: theme.shadows.default.ios }),
}))(View);

const CapacityRow = styled(({ theme }: any) => ({
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  flex: 1,
}))(View);

const Container = styled(({ theme }: any) => ({
  paddingHorizontal: theme.sizing.baseUnit,
  paddingBottom: 20,
  flex: 1,
}))(SafeAreaView);

const LocalActionContianer = ({ contentId }: { contentId: string }) => {
  const safeArea = useSafeAreaInsets();
  const bottomSheetModalRef = useRef<BottomSheetModalMethods>();
  const track = useTrack();

  const variables = { contentfulId: contentId };
  const { data, error, loading } = useQuery<QueryData>(QUERY, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 3000,
    variables,
  });

  const updateLocalCache = React.useCallback((cache: ApolloCache<any>, { data }: FetchResult<QueryData>) => {
      if (data) {
        cache.writeQuery({
          query: QUERY,
          data
        })
      }
    },
    [contentId]
  );
  const [register, { loading: loadingRegister }] = useMutation<QueryData, { nodeId: string }>(REGISTER, {
    update: updateLocalCache,
  });
  const [unregister, { loading: loadingUnregister }] = useMutation<QueryData, { nodeId: string }>(UNREGISTER, {
    update: updateLocalCache,
  });

  const isCapacityEvent = data?.node?.capacity && data?.node?.capacity > 0;
  const capacityRemaining = data?.node?.capacity ? data?.node?.capacity - (data?.node?.registered || 0) : undefined;

  const handleButtonPress = useCallback(
    () => {
      const nodeId = data?.node?.id;
      if (!nodeId) { return }

      const variables = {
        nodeId,
      };
      const isRegistered = data?.node?.isRegistered;
      if (track) {
        track({
          eventName: isRegistered ? 'Unregister' : 'Register',
          properties: {
            title: data?.node?.title,
            itemId: nodeId,
          },
        });
      }

      return isRegistered ? unregister({ variables }) : register({ variables });
    },
    [data?.node?.isRegistered, register, unregister]
  );

  // present on mount
  useEffect(
    () => {
      if (data?.node?.id) bottomSheetModalRef.current?.present();
    },
    [data?.node?.id, bottomSheetModalRef.current]
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={[120 + safeArea.bottom]}
      animateOnMount
      dismissOnPanDown={false}
      backgroundComponent={(bgProps) => <ModalBackgroundView {...bgProps} />} // eslint-disable-line react/jsx-props-no-spreading
    >
      <Container edges={['bottom', 'left', 'right']}>
        <CapacityRow>
          {isCapacityEvent && (
            <ChannelLabel
              icon="groups"
              label={
                isCapacityEvent ? `${data?.node?.capacity} person capacity` : ``
              }
            />
          )}
          {isCapacityEvent && capacityRemaining && capacityRemaining >= 0 ? (
            <H6>
              {capacityRemaining} {capacityRemaining === 1 ? 'spot' : 'spots'}{' '}
              left
            </H6>
          ) : null}
        </CapacityRow>
        <RegisterButton
          isRegistered={!!data?.node?.isRegistered}
          isCapacityEvent={!!isCapacityEvent}
          capacityRemaining={capacityRemaining}
          loading={
            (!data?.node?.id && !error) || loadingRegister || loadingUnregister
          }
          onPress={handleButtonPress}
        />
      </Container>
    </BottomSheetModal>
  );
};

export default LocalActionContianer;
