import gql from 'graphql-tag';

import { updatePushId } from '@apollosproject/ui-notifications';
import CACHE_LOADED from '../client/getCacheLoaded'; // eslint-disable-line

// TODO: this will require more organization...ie...not keeping everything in one file.
// But this is simple while our needs our small.

export const schema = `
  type Query {
    devicePushId: String
    cacheLoaded: Boolean
    notificationsEnabled: Boolean
  }

  type Mutation {
    cacheMarkLoaded: Boolean
    updateDevicePushId(pushId: String!): String
    updatePushPermissions(enabled: Boolean!): Boolean
  }
`;

export const defaults = {
  __typename: 'Query',
  cacheLoaded: false,
};

const GET_LOGGED_IN = gql`
  query {
    isLoggedIn @client
  }
`;

export const GET_ALL_DATA = gql`
  query {
    isLoggedIn @client
    cacheLoaded @client
    notificationsEnabled @client
  }
`;

export const resolvers = {
  Mutation: {
    cacheMarkLoaded: async (root, args, { cache, client }) => {
      cache.writeQuery({
        query: CACHE_LOADED,
        data: {
          cacheLoaded: true,
        },
      });
      const { data: { isLoggedIn } = {} } = await client.query({
        query: GET_LOGGED_IN,
      });

      const { pushId } = cache.readQuery({
        query: gql`
          query {
            pushId @client
          }
        `,
      });

      if (isLoggedIn && pushId) {
        updatePushId({ pushId, client });
      }
      return null;
    },
  },
};
