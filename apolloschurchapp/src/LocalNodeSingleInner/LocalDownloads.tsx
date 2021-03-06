import React, { PureComponent, useCallback } from 'react';
import { gql, useQuery } from '@apollo/client';

import { useNavigation } from '@react-navigation/native';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Linking, View } from 'react-native';

import {
  TableView,
  Cell,
  CellText,
  Divider,
  H4,
  PaddedView,
  GradientOverlayImage,
  styled,
  Touchable,
} from '@apollosproject/ui-kit';
import { useTrack } from '@apollosproject/ui-analytics';
import { Caret } from '../ui/ScheduleItem';
import { rewriteContentfulUrl } from '../util';

const query = gql`
  query getSpeakersLocal($itemId: ID!) {
    local @client {
      entry(id: $itemId) {
        ... on Local_Event {
          downloads {
            items {
              sys { id }
              description
              title
              url
            }
          }
        }
      }
    }
  }
`;

interface Asset {
  sys: { id: string }
  title: string
  description: string
  url?: string
}

const LocalDownloads = ({ contentId }: { contentId: string }) => {
  const { loading, data } = useQuery(query, {
    variables: { itemId: contentId },
    fetchPolicy: 'no-cache'
  });
  const track = useTrack();

  const node = get(data, 'local.entry')
  const downloads = get(node, 'downloads.items') || [];

  if (node !== null && !downloads.length) return null;

  

  return (
    <>
      <PaddedView vertical={false}>
        <H4 isLoading={loading && !downloads.length} padded>
          Resources
        </H4>
      </PaddedView>
      <TableView>
        {(
          downloads || (loading && !downloads.length ? [{ id: 'loading' }] : [])
        ).map((item: Asset) => {
          const rendered =
            <View>
              <Cell>
                <CellText isLoading={loading && !downloads.length}>
                  {item.title}
                </CellText>
                <Caret name="download" />
              </Cell>
              <Divider />
            </View>

          const url = item.url
          if (url) {
            return <Touchable key={item.sys.id} onPress={() => {
              const u = rewriteContentfulUrl(url)
              if(track) {
                track({
                  eventName: 'Click',
                  properties: {
                    title: item.title,
                    itemId: item.sys.id,
                    on: contentId,
                    url: u,
                  },
                });
              }

              Linking.openURL(u)
            }} >
              {rendered}
            </Touchable>
          }

          return rendered
        } 
        )}
      </TableView>
    </>
  );
};

export default LocalDownloads;
