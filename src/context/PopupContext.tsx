import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import uuidv4 from 'uuid/v4';
import extensionTypes from '../tools/extensionTypes';
import toCameCase from '../tools/toCameCase';
import chromePopupServices, {
  type PopupEventHandlers,
  type PopupServices,
} from './chromePopupServices';

export interface UserGroupSnapshot {
  id: string;
  name: string;
  ids: string[];
}

export interface StoredUserGroup extends Omit<UserGroupSnapshot, 'id'> {
  id?: string;
}

export type ComputedGroupOrder = Record<string, string[]>;

export interface PopupInitialData {
  groups?: UserGroupSnapshot[];
  computedOrder?: ComputedGroupOrder;
  extensions?: Record<string, chrome.management.ExtensionInfo>;
}

interface ExtensionState {
  data: chrome.management.ExtensionInfo;
  isLoading: boolean;
}

interface PopupState {
  status: 'idle' | 'pending' | 'done' | 'error';
  groups: UserGroupSnapshot[];
  computedOrder: ComputedGroupOrder;
  extensions: Record<string, ExtensionState>;
  loadingGroupIds: Record<string, boolean>;
}

export interface ExtensionView extends chrome.management.ExtensionInfo {
  isLoading: boolean;
  icon19?: string;
  descriptionTitle: string;
}

export interface GroupView {
  id: string;
  name: string;
  computed?: string;
  extensionIds: string[];
  isLoading: boolean;
  isChecked: boolean;
  isIndeterminate: boolean;
}

interface MoveExtensionOptions {
  extensionId: string;
  fromGroupId: string;
  toGroupId?: string;
  overExtensionId?: string;
  insertAfter?: boolean;
  createNewGroup?: boolean;
}

interface ResolvedMoveExtensionOptions extends MoveExtensionOptions {
  newGroupId?: string;
}

interface PopupContextValue {
  status: PopupState['status'];
  groups: GroupView[];
  extensions: ReadonlyMap<string, ExtensionView>;
  setExtensionEnabled(id: string, enabled: boolean): Promise<void>;
  uninstallExtension(id: string): Promise<void>;
  launchExtension(id: string): Promise<void>;
  openExtensionOptions(id: string): Promise<void>;
  setGroupEnabled(id: string, enabled: boolean): Promise<void>;
  renameGroup(id: string, name: string): void;
  removeGroup(id: string): void;
  saveGroups(): Promise<void>;
  moveExtension(options: MoveExtensionOptions): void;
}

type PopupAction =
  | {type: 'initStart'}
  | {
      type: 'initSuccess';
      groups: UserGroupSnapshot[];
      computedOrder: ComputedGroupOrder;
      extensions: Record<string, ExtensionState>;
    }
  | {type: 'initError'}
  | {type: 'syncGroups'; groups: UserGroupSnapshot[]}
  | {type: 'syncComputedOrder'; computedOrder: ComputedGroupOrder}
  | {type: 'setExtension'; extension: chrome.management.ExtensionInfo}
  | {type: 'removeExtension'; id: string}
  | {type: 'setExtensionLoading'; id: string; isLoading: boolean}
  | {type: 'setGroupLoading'; id: string; isLoading: boolean}
  | {type: 'renameGroup'; id: string; name: string}
  | {type: 'removeGroup'; id: string}
  | {type: 'moveExtension'; options: ResolvedMoveExtensionOptions};

interface PopupProviderProps {
  children: ReactNode;
  initialData?: PopupInitialData;
  initialize?: boolean;
  services?: PopupServices;
}

const PopupContext = createContext<PopupContextValue | null>(null);

const selectIcon = (icons: readonly chrome.management.IconInfo[], size: number) => {
  const sortedIcons = icons.slice().sort((a, b) => (a.size > b.size ? -1 : 1));
  return sortedIcons.filter((item) => item.size >= size).pop()?.url ?? sortedIcons[0]?.url;
};

const getDescriptionTitle = (extension: chrome.management.ExtensionInfo) => {
  const result = [`Name: ${extension.name}`, `ID: ${extension.id}`];

  if (extension.versionName) {
    result.push(`Version: ${extension.versionName} (${extension.version})`);
  } else {
    result.push(`Version: ${extension.version}`);
  }

  result.push(`Type: ${extension.type}`);
  if (extension.homepageUrl) result.push(`Homepage: ${extension.homepageUrl}`);
  if (extension.updateUrl) result.push(`Update url: ${extension.updateUrl}`);
  result.push(`Offline enabled: ${extension.offlineEnabled}`);
  if (extension.appLaunchUrl) result.push(`App launch url: ${extension.appLaunchUrl}`);
  result.push(`Permissions: ${extension.permissions?.join(', ') ?? ''}`);
  result.push(`Host permissions: ${extension.hostPermissions?.join(', ') ?? ''}`);
  result.push(`Install type: ${extension.installType}`);
  if (extension.launchType) result.push(`Launch type: ${extension.launchType}`);
  if (!extension.enabled && extension.disabledReason) {
    result.push(`Disabled reason: ${extension.disabledReason}`);
  }
  result.push(`Short name: ${extension.shortName}`);
  result.push(`Description: ${extension.description}`);

  return result.join('\n');
};

const normalizeGroups = (groups: readonly StoredUserGroup[]): UserGroupSnapshot[] =>
  groups.map((group) => ({id: group.id || uuidv4(), name: group.name, ids: [...group.ids]}));

const normalizeComputedOrder = (computedOrder: ComputedGroupOrder): ComputedGroupOrder =>
  Object.fromEntries(
    Object.entries(computedOrder).map(([computed, ids]) => [computed, [...new Set(ids)]]),
  );

const toExtensionState = (extensions: readonly chrome.management.ExtensionInfo[], selfId: string) =>
  extensions.reduce<Record<string, ExtensionState>>((result, extension) => {
    if (extension.id !== selfId) {
      result[extension.id] = {data: extension, isLoading: false};
    }
    return result;
  }, {});

const createInitialState = (data?: PopupInitialData): PopupState => ({
  status: data ? 'done' : 'idle',
  groups: normalizeGroups(data?.groups ?? []),
  computedOrder: normalizeComputedOrder(data?.computedOrder ?? {}),
  extensions: Object.values(data?.extensions ?? {}).reduce<Record<string, ExtensionState>>(
    (result, extension) => {
      result[extension.id] = {data: extension, isLoading: false};
      return result;
    },
    {},
  ),
  loadingGroupIds: {},
});

const getComputedType = (extension: chrome.management.ExtensionInfo) =>
  extensionTypes.includes(extension.type as (typeof extensionTypes)[number])
    ? extension.type
    : 'unknown';

const getExtensionIdsForGroup = (state: PopupState, groupId: string) => {
  const userGroup = state.groups.find(({id}) => id === groupId);
  if (userGroup) return userGroup.ids.filter((id) => state.extensions[id]);

  if (!groupId.startsWith('computed:')) return [];
  const computed = groupId.slice('computed:'.length);
  const usedIds = new Set(state.groups.flatMap(({ids}) => ids));
  const availableIds = Object.values(state.extensions)
    .filter(({data}) => !usedIds.has(data.id) && getComputedType(data) === computed)
    .map(({data}) => data.id);
  const availableIdSet = new Set(availableIds);
  const orderedIds = state.computedOrder[computed]?.filter((id) => availableIdSet.has(id)) ?? [];
  const orderedIdSet = new Set(orderedIds);

  return [...orderedIds, ...availableIds.filter((id) => !orderedIdSet.has(id))];
};

const moveExtension = (state: PopupState, options: ResolvedMoveExtensionOptions) => {
  const groups = state.groups.map((group) => ({...group, ids: [...group.ids]}));
  let computedOrder = state.computedOrder;
  const fromGroup = groups.find(({id}) => id === options.fromGroupId);
  const toComputed = options.toGroupId?.startsWith('computed:')
    ? options.toGroupId.slice('computed:'.length)
    : undefined;
  const extension = state.extensions[options.extensionId]?.data;

  if (toComputed && (!extension || getComputedType(extension) !== toComputed)) {
    return {groups: state.groups, computedOrder: state.computedOrder};
  }

  if (fromGroup) {
    const position = fromGroup.ids.indexOf(options.extensionId);
    if (position !== -1) fromGroup.ids.splice(position, 1);
  }

  if (options.createNewGroup && options.newGroupId) {
    groups.unshift({id: options.newGroupId, name: 'Group', ids: [options.extensionId]});
  } else if (options.toGroupId) {
    const toGroup = groups.find(({id}) => id === options.toGroupId);
    if (toGroup) {
      const duplicatePosition = toGroup.ids.indexOf(options.extensionId);
      if (duplicatePosition !== -1) toGroup.ids.splice(duplicatePosition, 1);

      const overPosition = options.overExtensionId
        ? toGroup.ids.indexOf(options.overExtensionId)
        : -1;
      const position = overPosition === -1 ? toGroup.ids.length : overPosition;
      toGroup.ids.splice(position + (options.insertAfter ? 1 : 0), 0, options.extensionId);
    } else if (toComputed) {
      const ids = getExtensionIdsForGroup(state, options.toGroupId).filter(
        (id) => id !== options.extensionId,
      );
      const overPosition = options.overExtensionId ? ids.indexOf(options.overExtensionId) : -1;
      const position = overPosition === -1 ? ids.length : overPosition;
      ids.splice(position + (options.insertAfter ? 1 : 0), 0, options.extensionId);

      const unresolvedIds = (state.computedOrder[toComputed] ?? []).filter(
        (id) => !state.extensions[id] && !ids.includes(id),
      );
      computedOrder = {...state.computedOrder, [toComputed]: [...ids, ...unresolvedIds]};
    }
  }

  if (fromGroup && fromGroup.ids.length === 0) {
    return {groups: groups.filter(({id}) => id !== fromGroup.id), computedOrder};
  }

  return {groups, computedOrder};
};

const popupReducer = (state: PopupState, action: PopupAction): PopupState => {
  switch (action.type) {
    case 'initStart':
      return {...state, status: 'pending'};
    case 'initSuccess':
      return {
        status: 'done',
        groups: action.groups,
        computedOrder: action.computedOrder,
        extensions: action.extensions,
        loadingGroupIds: {},
      };
    case 'initError':
      return {...state, status: 'error'};
    case 'syncGroups':
      return {...state, groups: action.groups};
    case 'syncComputedOrder':
      return {...state, computedOrder: action.computedOrder};
    case 'setExtension':
      return {
        ...state,
        extensions: {
          ...state.extensions,
          [action.extension.id]: {
            data: action.extension,
            isLoading: state.extensions[action.extension.id]?.isLoading ?? false,
          },
        },
      };
    case 'removeExtension': {
      const extensions = {...state.extensions};
      delete extensions[action.id];
      return {...state, extensions};
    }
    case 'setExtensionLoading': {
      const extension = state.extensions[action.id];
      if (!extension) return state;
      return {
        ...state,
        extensions: {
          ...state.extensions,
          [action.id]: {...extension, isLoading: action.isLoading},
        },
      };
    }
    case 'setGroupLoading':
      return {
        ...state,
        loadingGroupIds: {...state.loadingGroupIds, [action.id]: action.isLoading},
      };
    case 'renameGroup':
      return {
        ...state,
        groups: state.groups.map((group) =>
          group.id === action.id ? {...group, name: action.name} : group,
        ),
      };
    case 'removeGroup':
      return {...state, groups: state.groups.filter(({id}) => id !== action.id)};
    case 'moveExtension':
      return {...state, ...moveExtension(state, action.options)};
  }
};

export const PopupProvider = ({
  children,
  initialData,
  initialize,
  services = chromePopupServices,
}: PopupProviderProps) => {
  const [state, dispatch] = useReducer(popupReducer, initialData, createInitialState);
  const stateRef = useRef(state);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const shouldInitialize = initialize ?? !initialData;

  const commit = useCallback((action: PopupAction) => {
    const nextState = popupReducer(stateRef.current, action);
    stateRef.current = nextState;
    dispatch(action);
    return nextState;
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!shouldInitialize) return;

    let destroyed = false;
    let unsubscribe: (() => void) | undefined;
    commit({type: 'initStart'});

    Promise.all([services.loadGroups(), services.loadComputedOrder(), services.getExtensions()])
      .then(([groups, computedOrder, extensions]) => {
        if (destroyed) return;
        commit({
          type: 'initSuccess',
          groups: normalizeGroups(groups),
          computedOrder: normalizeComputedOrder(computedOrder),
          extensions: toExtensionState(extensions, services.selfId),
        });

        const handlers: PopupEventHandlers = {
          extensionChanged: (extension) => {
            if (extension.id !== services.selfId) commit({type: 'setExtension', extension});
          },
          extensionRemoved: (id) => commit({type: 'removeExtension', id}),
          groupsChanged: (nextGroups) =>
            commit({type: 'syncGroups', groups: normalizeGroups(nextGroups)}),
          computedOrderChanged: (nextComputedOrder) =>
            commit({
              type: 'syncComputedOrder',
              computedOrder: normalizeComputedOrder(nextComputedOrder),
            }),
        };
        unsubscribe = services.subscribe(handlers);
      })
      .catch((error: unknown) => {
        console.error('[PopupContext] init error', error);
        if (!destroyed) commit({type: 'initError'});
      });

    return () => {
      destroyed = true;
      unsubscribe?.();
    };
  }, [commit, services, shouldInitialize]);

  const saveGroups = useCallback(
    (groups = stateRef.current.groups, computedOrder = stateRef.current.computedOrder) => {
      const groupSnapshot = groups.map((group) => ({...group, ids: [...group.ids]}));
      const computedOrderSnapshot = normalizeComputedOrder(computedOrder);
      const save = saveQueueRef.current
        .catch(() => undefined)
        .then(() => services.saveGroups(groupSnapshot, computedOrderSnapshot));
      saveQueueRef.current = save;
      return save;
    },
    [services],
  );

  const setExtensionEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      commit({type: 'setExtensionLoading', id, isLoading: true});
      try {
        await services.setExtensionEnabled(id, enabled);
      } catch (error) {
        console.error('[PopupContext] setEnabled error', error);
      } finally {
        commit({type: 'setExtensionLoading', id, isLoading: false});
      }
    },
    [commit, services],
  );

  const uninstallExtension = useCallback(
    async (id: string) => {
      commit({type: 'setExtensionLoading', id, isLoading: true});
      try {
        await services.uninstallExtension(id);
      } catch (error) {
        console.error('[PopupContext] uninstall error', error);
      } finally {
        commit({type: 'setExtensionLoading', id, isLoading: false});
      }
    },
    [commit, services],
  );

  const setGroupEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      commit({type: 'setGroupLoading', id, isLoading: true});
      try {
        await Promise.all(
          getExtensionIdsForGroup(stateRef.current, id).map((extensionId) =>
            setExtensionEnabled(extensionId, enabled),
          ),
        );
      } catch (error) {
        console.error('[PopupContext] setEnabled error', error);
      } finally {
        commit({type: 'setGroupLoading', id, isLoading: false});
      }
    },
    [commit, setExtensionEnabled],
  );

  const renameGroup = useCallback(
    (id: string, name: string) => commit({type: 'renameGroup', id, name}),
    [commit],
  );

  const removeGroup = useCallback(
    (id: string) => {
      const nextState = commit({type: 'removeGroup', id});
      saveGroups(nextState.groups, nextState.computedOrder).catch((error: unknown) =>
        console.error('[PopupContext] save groups error', error),
      );
    },
    [commit, saveGroups],
  );

  const moveExtensionAction = useCallback(
    (options: MoveExtensionOptions) => {
      // commit applies every action eagerly and React applies it again, so IDs must be resolved first.
      const resolvedOptions = options.createNewGroup ? {...options, newGroupId: uuidv4()} : options;
      const nextState = commit({type: 'moveExtension', options: resolvedOptions});
      saveGroups(nextState.groups, nextState.computedOrder).catch((error: unknown) =>
        console.error('[PopupContext] save groups error', error),
      );
    },
    [commit, saveGroups],
  );

  const launchExtension = useCallback(
    async (id: string) => {
      try {
        await services.launchExtension(id);
      } catch (error) {
        console.error('[PopupContext] launch error', error);
      }
    },
    [services],
  );

  const openExtensionOptions = useCallback(
    async (id: string) => {
      const optionsUrl = stateRef.current.extensions[id]?.data.optionsUrl;
      if (!optionsUrl) return;
      try {
        await services.openExtensionOptions(optionsUrl);
      } catch (error) {
        console.error('[PopupContext] open options error', error);
      }
    },
    [services],
  );

  const extensions = useMemo(
    () =>
      new Map(
        Object.values(state.extensions).map(({data, isLoading}) => [
          data.id,
          {
            ...data,
            isLoading,
            icon19: selectIcon(data.icons ?? [], 19),
            descriptionTitle: getDescriptionTitle(data),
          },
        ]),
      ),
    [state.extensions],
  );

  const groups = useMemo<GroupView[]>(() => {
    const toView = (id: string, name: string, computed?: string): GroupView => {
      const extensionIds = getExtensionIdsForGroup(state, id);
      const enabledCount = extensionIds.filter(
        (extensionId) => state.extensions[extensionId].data.enabled,
      ).length;
      return {
        id,
        name,
        computed,
        extensionIds,
        isLoading: state.loadingGroupIds[id] ?? false,
        isChecked: enabledCount === extensionIds.length,
        isIndeterminate: enabledCount > 0 && enabledCount < extensionIds.length,
      };
    };

    const userGroups = state.groups.map(({id, name}) => toView(id, name));
    const computedGroups = [...extensionTypes, 'unknown'].map((computed) =>
      toView(
        `computed:${computed}`,
        chrome.i18n.getMessage(`${toCameCase(computed)}Type`) ||
          chrome.i18n.getMessage('unknownType'),
        computed,
      ),
    );
    return [...userGroups, ...computedGroups];
  }, [state]);

  const value = useMemo<PopupContextValue>(
    () => ({
      status: state.status,
      groups,
      extensions,
      setExtensionEnabled,
      uninstallExtension,
      launchExtension,
      openExtensionOptions,
      setGroupEnabled,
      renameGroup,
      removeGroup,
      saveGroups,
      moveExtension: moveExtensionAction,
    }),
    [
      extensions,
      groups,
      launchExtension,
      moveExtensionAction,
      openExtensionOptions,
      removeGroup,
      renameGroup,
      saveGroups,
      setExtensionEnabled,
      setGroupEnabled,
      state.status,
      uninstallExtension,
    ],
  );

  return <PopupContext.Provider value={value}>{children}</PopupContext.Provider>;
};

export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) throw new Error('usePopup must be used inside PopupProvider');
  return context;
};
