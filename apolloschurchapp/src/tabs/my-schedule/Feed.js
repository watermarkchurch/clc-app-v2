import React, { useEffect, useRef } from 'react';

import { SafeAreaView } from 'react-native-safe-area-context';
import { gql } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';

import { BackgroundView } from '@apollosproject/ui-kit';
import {
  FeaturesFeedConnected,
  FEATURE_FEED_ACTION_MAP,
  RockAuthedWebBrowser,
} from '@apollosproject/ui-connected';
import { useQueryAutoRefresh } from '../../client/hooks/useQueryAutoRefresh';

function handleOnPress({ action, ...props }) {
  if (FEATURE_FEED_ACTION_MAP[action]) {
    FEATURE_FEED_ACTION_MAP[action]({ action, ...props });
  }
  // If you add additional actions, you can handle them here.
  // Or add them to the FEATURE_FEED_ACTION_MAP, with the syntax
  // { [ActionName]: function({ relatedNode, action, ...FeatureFeedConnectedProps}) }
}

// getHomeFeed uses the HOME_FEATURES in the config.yml
// You can also hardcode an ID if you are confident it will never change
// Or use some other strategy to get a FeatureFeed.id
export const GET_FEED_FEED = gql`
  query myScheduleFeed {
    myScheduleFeed {
      id
    }
  }
`;

const Feed = () => {
  const navigation = useNavigation();
  
  const { data } = useQueryAutoRefresh(GET_FEED_FEED);

  return (
    <RockAuthedWebBrowser>
      {(openUrl) => (
        <BackgroundView>
          <FeaturesFeedConnected
            openUrl={openUrl}
            navigation={navigation}
            featureFeedId={data?.myScheduleFeed?.id}
            onPressActionItem={handleOnPress}
          />
        </BackgroundView>
      )}
    </RockAuthedWebBrowser>
  );
};

export default Feed;
