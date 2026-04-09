import React, { createContext, useContext, useEffect, useState } from "react";

import cockpit from 'cockpit';
import {
    bootkitdGetVersion,
    bootKitLoadBootEntries,
    bootKitLoadConfig,
    bootKitLoadSnapshots,
    bootKitPing,
    bootKitRemoveSnapshot,
    bootKitSaveGrubConfig,
    bootKitSelectSnapshot,
    BootkitSnapshots,
    bootKitUseCurrentSnapshot,
    Grub2Config,
    Grub2ConfigInternal,
    JsonPromise,
    KeyValue,
    parseBootkitJson,
} from "./bootkitd";

const DBUS_NAME = "org.opensuse.bootkit";
const DBUS_PATH = "/org/opensuse/bootkit";

export interface BootkitState {
    loading: boolean;
    saving: boolean;
    error?: string | undefined | null;
}

export interface BootKitContextType {
    config: Grub2Config,
    bootEntries: string[],
    snapshots: BootkitSnapshots,
    serviceAvailable: boolean,
    state: BootkitState,
    saveConfig: () => void,
    resetConfig: () => void,
    removeSnapshot: (id: number) => void,
    selectSnapshot: (id: number) => void,
    selectCurrentSnapshot: () => void,
    updateConfig: (key: KeyValue | string, value: string) => void,
    setBootEntry: (entry: string) => void,
}

const BootKitContext = createContext<BootKitContextType>({
    config: { value_list: [], value_map: {}, internal_list: [] },
    bootEntries: [],
    snapshots: { snapshots: [], selected: {} },
    serviceAvailable: false,
    state: { loading: true, saving: false },
    saveConfig: () => { },
    resetConfig: () => { },
    removeSnapshot: () => { },
    selectSnapshot: () => { },
    selectCurrentSnapshot: () => { },
    updateConfig: () => { },
    setBootEntry: () => { },
});
export const useBootKitContext = () => useContext(BootKitContext);

// TODO: proper typing for callback arguments
// eslint-disable-next-line
type BKArg = any;

function bootKitCall<T>(callback: (...arg: BKArg[]) => Promise<JsonPromise<T>>, setError: (error: string) => void, setData?: (data: T) => void) {
    return async (...arg: BKArg[]) => {
        try {
            const data = await callback(...arg);
            let parsed: T | string = "";
            try {
                parsed = parseBootkitJson(data);
            } catch {
                // if the value is not valid json, we can assume it's just a string
                parsed = (data as string[])[0] as string;
            }
            if (setData) {
                setData(parsed as T);
            }
        } catch (err) {
            console.error(err);
            setError((err as Error).message);
        }
    };
}

export function BootKitProvider({ children }: { children: React.ReactNode }) {
    const [serviceAvailable, setServiceAvailable] = useState(false);
    const [config, setConfig] = useState<Grub2Config>({ value_list: [], value_map: {}, internal_list: [] });
    const [snapshots, setSnapshots] = useState<BootkitSnapshots>({ snapshots: [], selected: {} });
    const [bootEntries, setBootEntries] = useState<string[]>([]);
    const [state, setState] = useState<BootkitState>({ loading: true, saving: false });

    const updateConfig = React.useCallback((key: KeyValue | string, value: string) => {
        let keyvalue = key as KeyValue;
        if (typeof key === "string") {
            keyvalue = config.value_map[key];
            // For keyalues that do exists,
            // make sure that the T is always "KeyValue" to keep backend happy.
            // Else we'll crete a completely new one
            if (keyvalue) {
                keyvalue.t = "KeyValue";
            } else {
                const lineNum = config.internal_list.length;
                keyvalue = {
                    t: "KeyValue",
                    key,
                    value,
                    changed: true,
                    line: lineNum,
                    original: `${key}="${value}"`,
                };
                config.internal_list.push(keyvalue);
                config.value_list.push(keyvalue);
                config.value_map[key] = keyvalue;
                setConfig({ ...config });
                return;
            }
        }

        keyvalue.changed = true;
        keyvalue.value = value;
        const line = config.value_list.findIndex(kv => kv.line === keyvalue.line);
        config.value_list[line] = keyvalue;
        config.internal_list[keyvalue.line] = keyvalue;
        // only save the last entry of key to keyvalue store
        // to replicate the behavior of grub
        if (config.value_map[keyvalue.key]?.line === keyvalue.line) {
            config.value_map[keyvalue.key] = keyvalue;
        }
        setConfig({ ...config });
    }, [config]);

    const updateState = (state: Partial<BootkitState>) => {
        setState(old => ({ ...old, ...state }));
    };

    const setBootEntry = React.useCallback((entry: string) => {
        config.selected_kernel = entry;
        setConfig({ ...config });
    }, [config]);

    const saveGrubConfig = React.useCallback(async () => {
        updateState({ saving: true });
        await saveConfig(config);
        await loadAll();
        updateState({ saving: false });
    }, [config]);

    const setStateError = (error: string) => {
        setState(old => ({ ...old, error }));
    };

    const updateGrub2Config = (data: Grub2ConfigInternal) => {
        const value_list = data.value_list.filter(val => val.t === "KeyValue");
        setConfig({
            value_list,
            value_map: data.value_map,
            internal_list: data.value_list,
            selected_kernel: data.selected_kernel,
            config_diff: data.config_diff,
        });
    };

    const removeAndLoadSnapshot = async (id: number) => {
        updateState({ saving: true });
        await removeSnapshot(id);
        updateState({ saving: false });
        await loadSnapshots();
    };

    const selectAndLoadSnapshot = async (id: number) => {
        await selectSnapshot(id);
        await loadAll();
    };

    const useAndLoadCurrentSnapshot = async () => {
        await useCurrentSnapshot();
        await loadAll();
    };

    const loadAll = async () => {
        updateState({ loading: true });
        await loadConfig();
        await loadBootEntries();
        await loadSnapshots();
        updateState({ loading: false });
    };

    const resetConfig = async () => {
        await loadAll();
    };

    useEffect(() => {
        if (!serviceAvailable)
            return;

        const timeout = setInterval(() => {
            // TODO: error handling
            bootKitPing();
        }, 10000);

        return () => {
            clearInterval(timeout);
        };
    }, [serviceAvailable]);

    useEffect(() => {
        (async() => {
            updateState({ loading: true });
            let available = false;
            try {
                await bootkitdGetVersion();
                available = true;
            } catch {
                console.warn("BootKit service not available!");
            }

            setServiceAvailable(available);
            if (!available)
                return;

            await loadAll();

            cockpit.dbus(DBUS_NAME, { superuser: "require" }).subscribe({
                path: DBUS_PATH,
                interface: "org.opensuse.bootkit.Config",
                member: "FileChanged"
            }, async (_path, _iface, signal) => {
                if (signal === "FileChanged") {
                    /// TODO: warn about state beign changed if this didn't happen because we saved config ourselves
                    await loadConfig();
                }
            });
        })();
    }, []);

    const saveConfig = bootKitCall(bootKitSaveGrubConfig, setStateError);
    const loadConfig = bootKitCall(bootKitLoadConfig, setStateError, updateGrub2Config);
    const loadSnapshots = bootKitCall(bootKitLoadSnapshots, setStateError, setSnapshots);
    const loadBootEntries = bootKitCall(bootKitLoadBootEntries, setStateError, (entries) => setBootEntries(entries.entries));
    const removeSnapshot = bootKitCall(bootKitRemoveSnapshot, setStateError);
    const selectSnapshot = bootKitCall(bootKitSelectSnapshot, setStateError);
    const useCurrentSnapshot = bootKitCall(bootKitUseCurrentSnapshot, setStateError);

    return (
        <BootKitContext.Provider
            value={{
                serviceAvailable,
                config,
                bootEntries,
                updateConfig,
                resetConfig,
                saveConfig: saveGrubConfig,
                setBootEntry,
                state,
                snapshots,
                removeSnapshot: removeAndLoadSnapshot,
                selectSnapshot: selectAndLoadSnapshot,
                selectCurrentSnapshot: useAndLoadCurrentSnapshot,
            }}
        >
            {children}
        </BootKitContext.Provider>
    );
}
