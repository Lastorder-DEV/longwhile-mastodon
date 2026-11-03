import type { UnknownAction } from '@reduxjs/toolkit';
import { Record as ImmutableRecord, mergeDeep } from 'immutable';

import { loadingBarReducer } from 'react-redux-loading-bar';
import { combineReducers } from 'redux-immutable';

import { RESET_ALL } from '../actions/store';

import { accountsReducer } from './accounts';
import { accountsFamiliarFollowersReducer } from './accounts_familiar_followers';
import { accountsMapReducer } from './accounts_map';
import { adminDmRoomsReducer } from './admin_dm_rooms';
import { alertsReducer } from './alerts';
import announcements from './announcements';
import { composeReducer } from './compose';
import { contextsReducer } from './contexts';
import conversations from './conversations';
import custom_emojis from './custom_emojis';
import { dmDraftsReducer } from './dm_drafts';
import { dmMessagesReducer } from './dm_messages';
import { dmRoomsReducer } from './dm_rooms';
import { dropdownMenuReducer } from './dropdown_menu';
import filters from './filters';
import height_cache from './height_cache';
import history from './history';
import { listsReducer } from './lists';
import { markersReducer } from './markers';
import media_attachments from './media_attachments';
import meta from './meta';
import { modalReducer } from './modal';
import { multiAccountReducer } from './multi_account';
import { navigationReducer } from './navigation';
import { notificationGroupsReducer } from './notification_groups';
import { notificationPolicyReducer } from './notification_policy';
import { notificationRequestsReducer } from './notification_requests';
import notifications from './notifications';
import { pictureInPictureReducer } from './picture_in_picture';
import { pollsReducer } from './polls';
import push_notifications from './push_notifications';
import { relationshipsReducer } from './relationships';
import { scheduledStatusesReducer } from './scheduled_statuses';
import { searchReducer } from './search';
import server from './server';
import settings from './settings';
import status_lists from './status_lists';
import statuses from './statuses';
import { suggestionsReducer } from './suggestions';
import { followedTagsReducer } from './tags';
import timelines from './timelines';
import trends from './trends';
import user_lists from './user_lists';

const reducers = {
  announcements,
  dropdownMenu: dropdownMenuReducer,
  timelines,
  meta,
  alerts: alertsReducer,
  loadingBar: loadingBarReducer,
  modal: modalReducer,
  user_lists,
  status_lists,
  accounts: accountsReducer,
  accounts_map: accountsMapReducer,
  accounts_familiar_followers: accountsFamiliarFollowersReducer,
  statuses,
  relationships: relationshipsReducer,
  settings,
  push_notifications,
  server,
  contexts: contextsReducer,
  compose: composeReducer,
  search: searchReducer,
  media_attachments,
  notifications,
  notificationGroups: notificationGroupsReducer,
  height_cache,
  custom_emojis,
  lists: listsReducer,
  followedTags: followedTagsReducer,
  filters,
  conversations,
  suggestions: suggestionsReducer,
  polls: pollsReducer,
  trends,
  markers: markersReducer,
  picture_in_picture: pictureInPictureReducer,
  history,
  notificationPolicy: notificationPolicyReducer,
  notificationRequests: notificationRequestsReducer,
  multiAccount: multiAccountReducer,
  navigation: navigationReducer,
  scheduled_statuses: scheduledStatusesReducer,
  dmRooms: dmRoomsReducer,
  dmMessages: dmMessagesReducer,
  dmDrafts: dmDraftsReducer,
  adminDmRooms: adminDmRoomsReducer,
};

// We want the root state to be an ImmutableRecord, which is an object with a defined list of keys,
// so it is properly typed and keys can be accessed using `state.<key>` syntax.
// This will allow an easy conversion to a plain object once we no longer call `get` or `getIn` on the root state

// By default with `combineReducers` it is a Collection, so we provide our own implementation to get a Record
const initialRootState = Object.fromEntries(
  Object.entries(reducers).map(([name, reducer]) => [
    name,
    reducer(undefined, {
      // empty action
    }),
  ]),
);

const RootStateRecord = ImmutableRecord(initialRootState, 'RootState');

const combinedReducer = combineReducers(reducers, RootStateRecord);

type RootStateType = ReturnType<typeof combinedReducer>;

// longwhile: RESET_ALL (account switching) rebuilds every slice except the
// multi-account registry and `meta`, which must survive the reset.
export const rootReducer = (
  state: RootStateType | undefined,
  action: UnknownAction,
): RootStateType => {
  if (action.type === RESET_ALL) {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */
    const nextState: any = combinedReducer(undefined, action);
    const prevState: any = state;

    if (prevState?.get && nextState?.set) {
      return nextState
        .set('multiAccount', prevState.get('multiAccount'))
        .set('meta', prevState.get('meta'));
    }

    if (prevState && typeof prevState === 'object') {
      return {
        ...nextState,
        multiAccount: prevState.multiAccount,
        meta: prevState.meta,
      };
    }

    return nextState;
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */
  }

  return combinedReducer(state, action);
};

export function reducerWithInitialState(
  stateOverrides: Record<string, unknown> = {},
) {
  const initialStateRecord = mergeDeep(initialRootState, stateOverrides);
  const PatchedRootStateRecord = ImmutableRecord(
    initialStateRecord,
    'RootState',
  );
  return combineReducers(reducers, PatchedRootStateRecord);
}
