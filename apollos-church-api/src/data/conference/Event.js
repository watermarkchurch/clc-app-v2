import gql from 'graphql-tag';
import { createGlobalId } from '@apollosproject/server-core';
import marked from 'marked';
import ContentfulDataSource from './ContentfulDataSource';

export class dataSource extends ContentfulDataSource {}

export const schema = gql`
  extend type Mutation {
    likeNode(nodeId: ID!): Boolean
    unlikeNode(nodeId: ID!): Boolean
  }
  type Event implements ContentItem & Node & ContentNode & Card & VideoNode & AudioNode & ContentChildNode & ContentParentNode {
    id: ID!
    title(hyphenated: Boolean): String
    coverImage: ImageMedia

    htmlContent: String
    summary: String

    childContentItemsConnection(
      first: Int
      after: String
    ): ContentItemsConnection
    siblingContentItemsConnection(
      first: Int
      after: String
    ): ContentItemsConnection

    parentChannel: ContentChannel
    media: VideoMediaSource

    speakers: [Speaker]
    location: Location
    startTime: String
    endTime: String
    downloads: [ContentfulAsset]
    label: String

    publishDate: String
    images: [ImageMedia]
    videos: [VideoMedia]
    audios: [AudioMedia]
    theme: Theme
  }
`;

export const resolver = {
  Event: {
    id: ({ sys }, args, context, { parentType }) =>
      createGlobalId(sys.id, parentType.name),
    title: ({ fields }) => fields.title,
    summary: (node, args, { dataSources }) =>
      dataSources.ContentItem.createSummary(node),
    htmlContent: ({ fields }) =>
      fields.description ? marked(fields.description) : null,
    speakers: ({ fields }) => fields.speakers,
    location: ({ fields }) => fields.location,
    startTime: async ({ fields, sys }, args, { dataSources }) => {
      if (fields.startTime) return fields.startTime;
      // a little contrived...
      try {
        const breakout = await dataSources.Breakouts.getFromEvent(sys.id);
        return breakout.fields.startTime;
      } catch (e) {
        return null;
      }
    },
    endTime: async ({ fields, sys }, args, { dataSources }) => {
      if (fields.endTime) return fields.endTime;
      // a little contrived...
      try {
        const breakout = await dataSources.Breakouts.getFromEvent(sys.id);
        return breakout.fields.endTime;
      } catch (e) {
        return null;
      }
    },
    downloads: ({ fields }) => fields.downloads,
    coverImage: ({ fields }) => fields.art,
    label: ({ fields }) => fields.eventType,
    isLiked: ({ sys }, args, { dataSources: { UserLike }}, { parentType }) => 
      UserLike.userLikedNode({ nodeId: createGlobalId(sys.id, parentType.name) }), // todo
  },
  Mutation: {
    likeNode: async (root, args, { dataSources: { UserLike, Person } }) => {
      const personId = await Person.getCurrentPersonId();
      return UserLike.likeNode({ ...args, personId, operation: 'Like' });
    },
    unlikeNode: async (root, args, { dataSources: { UserLike, Person } }) => {
      const personId = await Person.getCurrentPersonId();
      return UserLike.unlikeNode({ ...args, personId, operation: 'Unlike' });
    },
  },
};