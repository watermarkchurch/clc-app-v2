import React from 'react';
import { View, Image } from 'react-native';
import { Query } from '@apollo/client/react/components';
import PropTypes from 'prop-types';
import {
  checkNotifications,
  openSettings,
  requestNotifications,
  RESULTS,
} from 'react-native-permissions';
import {
  styled,
  BackgroundView,
  NavigationService,
} from '@apollosproject/ui-kit';
import {
  AskNotificationsConnected,
  FeaturesConnected,
  LocationFinderConnected,
  FollowConnected,
  OnboardingSwiper,
  onboardingComplete,
  WITH_USER_ID,
} from '@apollosproject/ui-onboarding';

const FullscreenBackgroundView = styled({
  position: 'absolute',
  width: '100%',
  height: '100%',
})(BackgroundView);

const ImageContainer = styled({
  height: '40%',
})(View);

const StyledImage = styled({
  height: '100%',
  width: '100%',
})(Image);

// Represents the current version of onboarding.
// Some slides will be "older", they shouldn't be shown to existing users.
// Some slides will be the same version as teh current onboarding version.
// Those slides will be shown to any user with an older version than the version of those slides.
export const ONBOARDING_VERSION = 2;

function Onboarding({ navigation, route }) {
  const userVersion = route?.params?.userVersion || 0;
  return (
    <Query query={WITH_USER_ID} fetchPolicy="network-only">
      {({ data }) => (
        <>
          <FullscreenBackgroundView />
          <OnboardingSwiper
            navigation={navigation}
            userVersion={userVersion}
            onComplete={() => {
              onboardingComplete({
                userId: data?.currentUser?.id,
                version: ONBOARDING_VERSION,
              });
              navigation.dispatch(
                NavigationService.resetAction({
                  navigatorName: 'Tabs',
                  routeName: 'Home',
                })
              );
            }}
          >
            {({ swipeForward }) => (
              <>
                <AskNotificationsConnected
                  onPressPrimary={swipeForward}
                  onRequestPushPermissions={(update) => {
                    checkNotifications().then((checkRes) => {
                      if (checkRes.status === RESULTS.DENIED) {
                        requestNotifications(['alert', 'badge', 'sound']).then(
                          () => {
                            update();
                          }
                        );
                      } else {
                        openSettings();
                      }
                    });
                  }}
                  BackgroundComponent={
                    <ImageContainer>
                      <StyledImage
                        source={require('./img/notifications.jpg')}
                      />
                    </ImageContainer>
                  }
                />
              </>
            )}
          </OnboardingSwiper>
        </>
      )}
    </Query>
  );
}

Onboarding.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      userVersion: PropTypes.number,
    }),
  }),
};

export default Onboarding;