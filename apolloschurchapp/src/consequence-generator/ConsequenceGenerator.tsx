import React from 'react';
import Color from 'color';
import { useQuery, gql, useMutation } from '@apollo/client';
import { FlatList, View, Text, ViewToken } from 'react-native'
import {
  BackgroundView,
  H2,
  H4,
  H5,
  styled,
  Touchable,
  Cell,
  CellText,
  GradientOverlayImage,
  Button,
  ErrorCard
} from '@apollosproject/ui-kit';
import { useTrack, TrackEventWhenLoaded } from '@apollosproject/ui-analytics';
import { debounce } from 'lodash';

const CONSEQUENCE_QUERY = gql`
  query getAllConsequences {
    local @client {
      consequenceCollection {
        chosen
        items {
          sys { id }
          title
          description
        }
      }
    }
  }
`

const MARK_CHOSEN = gql`
  mutation markConsequenceChosen($id: String!) {
    markConsequenceChosen(id: $id) @client
  }
`

const MARK_UNLOCKED = gql`
  mutation markConsequenceUnlocked {
    markConsequenceUnlocked @client
  }
`

interface ConsequenceQueryData {
  local: {
    consequenceCollection: {
      chosen: string | null
      items: Consequence[]
    }
  }
}
interface Consequence {
  sys: { id: string },
  title: string,
  description: string
}

export function ConsequenceGenerator() {
  const { data, loading, error } = useQuery<ConsequenceQueryData>(CONSEQUENCE_QUERY, {
    fetchPolicy: 'no-cache'
  });

  const [_markChosen] = useMutation(MARK_CHOSEN)
  const [_markUnlocked] = useMutation(MARK_UNLOCKED)
  const [locked, setLocked] = React.useState<string | null | undefined>(null)

  const markChosen = React.useCallback((id: string) => {
    setLocked(id)
    _markChosen({ variables: { id } }).catch((ex) => console.error(ex))
  }, [setLocked, _markChosen])
  const markUnlocked = React.useCallback(() => {
    setLocked(null)
    _markUnlocked().catch((ex) => console.error(ex))
  }, [setLocked, _markUnlocked])

  const items = data?.local?.consequenceCollection?.items
  React.useEffect(() => {
    setLocked(data?.local?.consequenceCollection?.chosen)
  }, [data?.local?.consequenceCollection?.chosen])
  
  return <>
    <TrackEventWhenLoaded
      isLoading={false}
      eventName={'View Content'}
      properties={{
        title: 'Farkle Consequence Generator',
        itemId: 'consequenceGenerator',
        type: 'tab'
      }}
    />
    {!loading && (error || !items || !items.length) &&
      <ErrorCard error={error || new Error(`An unknown error occurred`)} />}
    {!loading && items?.length &&
      <ConsequenceWheel items={items}
        locked={locked}
        onAccept={markChosen}
        onUnlock={markUnlocked} />}
  </>
}

const ITEM_HEIGHT = 50;

const SelectedConsequenceOverlay = styled(({ theme, selected }: any) => ({
  backgroundColor: theme.colors.background.accent,
  color: theme.colors.background.accent,
  borderWidth: 0,
  borderRadius: 30,
  height: ITEM_HEIGHT + 1,
  position: 'absolute',
  top: ITEM_HEIGHT * 2,
  bottom: ITEM_HEIGHT * 2,
  left: 0,
  right: 0,
}))(View);

const ConsequenceButton = styled(({ theme, locked }: any) => ({
  opacity: locked ? 0.6 : 1,
  backgroundColor: theme.colors.action.tertiary,
  color: theme.colors.text.tertiary,
  borderWidth: 1,
  borderRadius: 30,
  height: ITEM_HEIGHT - 10, // 2 * margin + 2 * borderWidth of ItemWrapper
  position: 'absolute',
  top: 5,
  right: 4
}))(Button);

interface ConsequenceWheelProps {
  items: Consequence[],

  locked?: string | null,
  onUnlock: () => void,
  onAccept: (consequenceId: string) => void
}

function ConsequenceWheel({ items, locked, onAccept, onUnlock }: ConsequenceWheelProps) {
  // start with a duplicate set of the items that you can scroll up to, and another to scroll down to
  const [data, setData] = React.useState([...items, ...items, ...items])

  const lockedIndex = locked ?
    items.findIndex((item) => item.sys.id == locked) + items.length :
    null

  const onViewableItemsChanged = React.useCallback(debounce(_onViewableItemsChanged, 100), [items])
  const listRef = React.useRef<any>()

  const [hoveredIndex, setHoveredIndex] = React.useState(lockedIndex || items.length + 2)  // initially [0, 1, 2, 3, 4] displayed
  const hoveredItem = data[hoveredIndex]

  return <BackgroundView>
    <View style={{marginLeft: 26, marginRight: 26, marginBottom: 10}}>
      <Button title="Spin the Wheel" type="tertiary"
        style={{ width: '50%' }}
        disabled={locked}
        onPress={React.useCallback(() => {
          if(listRef?.current) {
            // Spin to a random one in the next group
            const randomIdx = hoveredIndex + getRandomInt(items.length)
            listRef.current.scrollToIndex({
              index: randomIdx
            })
          }
        }, [listRef?.current, hoveredIndex, items.length])} />
    </View>

    <View style={{height: ITEM_HEIGHT * 5, marginBottom: 20}}>
      <FlatList
        ref={listRef}
        style={{height: ITEM_HEIGHT * 5}}
        data={data}
        renderItem={({item, index}) =>
          <ConsequenceItem {...item} hovered={index == hoveredIndex} />}
        initialScrollIndex={lockedIndex ? lockedIndex - 2 : items.length}
        initialNumToRender={items.length}
        scrollEnabled={!locked}
        removeClippedSubviews
        snapToInterval={ITEM_HEIGHT}
        onViewableItemsChanged={onViewableItemsChanged}
        getItemLayout={React.useCallback((data, index) => {
          return {
            length: ITEM_HEIGHT,
            offset: index * ITEM_HEIGHT,
            index
          }
        }, [])}
      />
      <SelectedConsequenceOverlay>
        {locked &&
          <ConsequenceButton title="Locked" locked={true}
            onPress={React.useCallback(() => {
              onUnlock()
            }, [onUnlock])} />}

        {!locked &&
          <ConsequenceButton title="Accept"
            onPress={React.useCallback(() => {

              onAccept(items[hoveredIndex % items.length]?.sys?.id)
            }, [hoveredIndex, onAccept])} />}
      </SelectedConsequenceOverlay>
    </View>
    <View style={{marginLeft: 26, marginRight: 26}}>
      {hoveredItem &&
        <HoveredItem item={hoveredItem} locked={!!locked} />}
    </View>
  </BackgroundView>

  function _onViewableItemsChanged({changed, viewableItems}: { changed: ViewToken[], viewableItems: ViewToken[] }) {
    const middle = viewableItems[Math.round((viewableItems.length - 1) / 2)]
    if (!middle || !middle.index) { return }

    if (middle.index < items.length) {
      // We've scrolled to the first replica - re-scroll to the middle
      const newIndex = items.length + middle.index
      listRef?.current?.scrollToIndex({
        index: newIndex,
        viewPosition: 0.5,
        animated: false
      })
      setHoveredIndex(newIndex)
    } else {
      setHoveredIndex(middle.index)
      setData((data) => {
        if (middle.index! + items.length > data.length) {
          // We've scrolled pretty far forward, need to add more data
          return [...data, ...items]
        }
        // no update
        return data
      })
    }
  }
}

interface ConsequenceItemProps {
  title: string
  hovered?: boolean
}

const ItemWrapper = styled(({ theme, hovered }: any) => ({
  borderWidth: 0,
  borderRadius: ITEM_HEIGHT / 2,
  borderColor: theme.colors.background.paper,
  backgroundColor: theme.colors.background.transparent,
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  height: ITEM_HEIGHT,
}))(View);


const ConsequenceWrapper = styled(({ theme }: any) => ({
  borderTopWidth: 1,
  borderLeftWidth: 1,
  borderRightWidth: 1,
  borderColor: theme.colors.background.accent,
  flex: 1,
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-around',
  alignItems: 'center',
  backgroundColor: theme.colors.background.transparent,
  height: ITEM_HEIGHT,
}))(View);

const ConsequenceText = styled(({ theme, hovered }: any) => ({
}))(H5);

const Spacer = styled(({ theme }: any) => ({
  width: ITEM_HEIGHT / 2 // equal to ItemWrapper borderRadius
}))(View);

function ConsequenceItem({title, hovered}: ConsequenceItemProps) {
  return <ItemWrapper hovered={hovered}>
    <Spacer />
    <ConsequenceWrapper>
      <ConsequenceText hovered={hovered}>{title}</ConsequenceText>
    </ConsequenceWrapper>
    <Spacer style={{width: 100}} />
  </ItemWrapper>
}

function HoveredItem({ item, locked }: { item: Consequence, locked?: boolean }) {
  // wait 400ms to show an item (in case we're scrolling fast!)
  const [shown, setShown] = React.useState(false)
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setShown(true)
    }, 400)
    return () => { setShown(false); clearTimeout(timeout) }
  }, [item])

  return <>
    <HoveredItem.Title locked={locked} shown={shown}>{item.title}</HoveredItem.Title>
    <HoveredItem.Body locked={locked} shown={shown}>
      {item.description}
    </HoveredItem.Body>
    </>
}

HoveredItem.Title = styled(({ theme, locked, shown }: any) => ({
  fontSize: 16,
  opacity: !shown ? 0 :
    locked ? 1 :
    0.6,
  marginBottom: 8
}))(H4)

HoveredItem.Body = styled(({ theme, locked, shown }: any) => ({
  opacity: !shown ? 0 :
    locked ? 1 :
    0.6,
  color: theme.colors.text.primary,
}))(Text)

function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}