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

export interface PopupInitialData {
  groups?: UserGroupSnapshot[];
  extensions?: Record<string, chrome.management.ExtensionInfo>;
}

interface ExtensionState {
  data: chrome.management.ExtensionInfo;
  isLoading: boolean;
}

interface PopupState {
  status: 'idle' | 'pending' | 'done' | 'error';
  groups: UserGroupSnapshot[];
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
}

interface MoveExtensionOptions {
  extensionId: string;
  fromGroupId: string;
  toGroupId?: string;
  overExtensionId?: string;
  insertAfter?: boolean;
  createNewGroup?: boolean;
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
  saveGroups(): Promise<void>;
  moveExtension(options: MoveExtensionOptions): void;
}

type PopupAction =
  | {type: 'initStart'}
  | {
      type: 'initSuccess';
      groups: UserGroupSnapshot[];
      extensions: Record<string, ExtensionState>;
    }
  | {type: 'initError'}
  | {type: 'syncGroups'; groups: UserGroupSnapshot[]}
  | {type: 'setExtension'; extension: chrome.management.ExtensionInfo}
  | {type: 'removeExtension'; id: string}
  | {type: 'setExtensionLoading'; id: string; isLoading: boolean}
  | {type: 'setGroupLoading'; id: string; isLoading: boolean}
  | {type: 'renameGroup'; id: string; name: string}
  | {type: 'moveExtension'; options: MoveExtensionOptions};

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
  extensions: Object.values(data?.extensions ?? {}).reduce<Record<string, ExtensionState>>(
    (result, extension) => {
      result[extension.id] = {data: extension, isLoading: false};
      return result;
    },
    {},
  ),
  loadingGroupIds: {},
});

const moveExtension = (state: PopupState, options: MoveExtensionOptions) => {
  const groups = state.groups.map((group) => ({...group, ids: [...group.ids]}));
  const fromGroup = groups.find(({id}) => id === options.fromGroupId);

  if (fromGroup) {
    const position = fromGroup.ids.indexOf(options.extensionId);
    if (position !== -1) fromGroup.ids.splice(position, 1);
  }

  if (options.createNewGroup) {
    groups.unshift({id: uuidv4(), name: 'Group', ids: [options.extensionId]});
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
    }
  }

  if (
    fromGroup &&
    !fromGroup.ids.some((id) => Object.prototype.hasOwnProperty.call(state.extensions, id))
  ) {
    return groups.filter(({id}) => id !== fromGroup.id);
  }

  return groups;
};

const popupReducer = (state: PopupState, action: PopupAction): PopupState => {
  switch (action.type) {
    case 'initStart':
      return {...state, status: 'pending'};
    case 'initSuccess':
      return {
        status: 'done',
        groups: action.groups,
        extensions: action.extensions,
        loadingGroupIds: {},
      };
    case 'initError':
      return {...state, status: 'error'};
    case 'syncGroups':
      return {...state, groups: action.groups};
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
    case 'moveExtension':
      return {...state, groups: moveExtension(state, action.options)};
  }
};

const getExtensionIdsForGroup = (state: PopupState, groupId: string) => {
  const userGroup = state.groups.find(({id}) => id === groupId);
  if (userGroup) return userGroup.ids.filter((id) => state.extensions[id]);

  if (!groupId.startsWith('computed:')) return [];
  const computed = groupId.slice('computed:'.length);
  const usedIds = new Set(state.groups.flatMap(({ids}) => ids));

  return Object.values(state.extensions)
    .filter(({data}) => {
      if (usedIds.has(data.id)) return false;
      if (computed === 'unknown') {
        return !extensionTypes.includes(data.type as (typeof extensionTypes)[number]);
      }
      return data.type === computed;
    })
    .map(({data}) => data.id);
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

    Promise.all([services.loadGroups(), services.getExtensions()])
      .then(([groups, extensions]) => {
        if (destroyed) return;
        commit({
          type: 'initSuccess',
          groups: normalizeGroups(groups),
          extensions: toExtensionState(extensions, services.selfId),
        });

        const handlers: PopupEventHandlers = {
          extensionChanged: (extension) => {
            if (extension.id !== services.selfId) commit({type: 'setExtension', extension});
          },
          extensionRemoved: (id) => commit({type: 'removeExtension', id}),
          groupsChanged: (nextGroups) =>
            commit({type: 'syncGroups', groups: normalizeGroups(nextGroups)}),
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
    (groups = stateRef.current.groups) => {
      const snapshot = groups.map((group) => ({...group, ids: [...group.ids]}));
      const save = saveQueueRef.current
        .catch(() => undefined)
        .then(() => services.saveGroups(snapshot));
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

  const moveExtensionAction = useCallback(
    (options: MoveExtensionOptions) => {
      const nextState = commit({type: 'moveExtension', options});
      saveGroups(nextState.groups).catch((error: unknown) =>
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
      return {
        id,
        name,
        computed,
        extensionIds,
        isLoading: state.loadingGroupIds[id] ?? false,
        isChecked: extensionIds.every((extensionId) => state.extensions[extensionId].data.enabled),
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
      saveGroups,
      moveExtension: moveExtensionAction,
    }),
    [
      extensions,
      groups,
      launchExtension,
      moveExtensionAction,
      openExtensionOptions,
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
