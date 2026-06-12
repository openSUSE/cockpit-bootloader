import React, { createContext, useContext, useEffect, useState } from "react";

import cockpit from 'cockpit';
import {
    BKPath,
    BKPathValue,
    BootkitConfig,
    BootkitConfigsRaw,
    BootkitConsoleConfigs,
    bootkitdGetVersion,
    bootkitLoadConfig,
    bootkitLoadConfigsRaw,
    bootkitLoadSnapshots,
    bootkitPing,
    bootkitRemoveSnapshot,
    bootkitSaveConfig,
    bootkitSelectSnapshot,
    BootkitSnapshots,
    bootkitUseCurrentSnapshot,
    DBUS_NAME,
    DBUS_PATH,
    JsonPromise,
    parseBootkitJson,
    setPathValue,
} from "./bootkitd";

export interface BootkitState {
    loading: boolean;
    saving: boolean;
    error?: string | undefined | null;
}

export interface BootKitContextType {
    config: BootkitConfig,
    configsRaw: BootkitConfigsRaw,
    snapshots: BootkitSnapshots,
    serviceAvailable: boolean,
    serviceVersion: string | null,
    state: BootkitState,
    saveConfig: () => void,
    resetConfig: () => void,
    removeSnapshot: (id: number) => void,
    selectSnapshot: (id: number) => void,
    selectCurrentSnapshot: () => void,
    updateConfig: <K extends BKPath<BootkitConfig>>(key: K, value: BKPathValue<BootkitConfig, K>) => void,
    updateConsoleConfig: <L extends BootkitConsoleConfigs["loader"], K extends BKPath<BootkitConsoleConfigs & { loader: L }>>(loader: L, key: K, value: BKPathValue<BootkitConsoleConfigs & { loader: L }, K>) => void,
}

const BootKitContext = createContext<BootKitContextType>({
    config: { boot_entries: { boot_entries: [] } },
    configsRaw: { configs: [] },
    snapshots: { snapshots: [] },
    serviceAvailable: false,
    serviceVersion: null,
    state: { loading: true, saving: false },
    saveConfig: () => { },
    resetConfig: () => { },
    removeSnapshot: () => { },
    selectSnapshot: () => { },
    selectCurrentSnapshot: () => { },
    updateConfig: () => { },
    updateConsoleConfig: () => { },
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
    const [serviceVersion, setServiceVersion] = useState<string | null>(null);
    const [config, setConfig] = useState<BootkitConfig>({ boot_entries: { boot_entries: [] } });
    const [configsRaw, setConfigsRaw] = useState<BootkitConfigsRaw>({ configs: [] });
    const [snapshots, setSnapshots] = useState<BootkitSnapshots>({ snapshots: [] });
    const [state, setState] = useState<BootkitState>({ loading: true, saving: false });

    const saveConfig = React.useCallback(async () => {
        updateState({ saving: true });
        console.log("Saving config:", config);
        await saveConfigBC(config);
        await loadAll();
        updateState({ saving: false });
    }, [config]);

    const updateState = (state: Partial<BootkitState>) => {
        setState(old => ({ ...old, ...state }));
    };

    const setStateError = (error: string) => {
        setState(old => ({ ...old, error }));
    };

    function updateConfigValue<K extends BKPath<BootkitConfig>>(key: K, value: BKPathValue<BootkitConfig, K>) {
        setConfig(old => {
            const copy = { ...old };
            setPathValue(copy, key, value);
            return copy;
        });
    }

    function updateConsoleConfig<L extends BootkitConsoleConfigs["loader"], K extends BKPath<BootkitConsoleConfigs & { loader: L }>>(loader: L, key: K, value: BKPathValue<BootkitConsoleConfigs & { loader: L }, K>) {
        setConfig(old => {
            if (!old.console) {
                console.error("Console settings are not supported for this backend");
                return old;
            }

            if (old.console.loader !== loader) {
                console.error("Console setting mismach. Cannot set settings for", loader, "when", old.console.loader, "is selected");
                return old;
            }

            setPathValue(old.console, key, value);
            const copy = { ...old };
            return copy;
        });
    }

    const updateConfig = (data: BootkitConfig) => {
        setConfig(data);
    };

    const updateConfigsRaw = (data: BootkitConfigsRaw) => {
        console.log("bootkitconfig: raw", data);
        setConfigsRaw(data);
    };

    const removeAndLoadSnapshot = async (id: number) => {
        updateState({ saving: true });
        await removeSnapshotBC(id);
        updateState({ saving: false });
        await loadSnapshotsBC();
    };

    const selectAndLoadSnapshot = async (id: number) => {
        await selectSnapshotBC(id);
        await loadAll();
    };

    const useAndLoadCurrentSnapshot = async () => {
        await useCurrentSnapshotBC();
        await loadAll();
    };

    const loadAll = async () => {
        updateState({ loading: true });
        await loadConfigBC();
        await loadConfigsRawBC();
        await loadSnapshotsBC();
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
            bootkitPing();
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
                const version = await bootkitdGetVersion();
                setServiceVersion(version[0]);
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
                    await loadConfigBC();
                }
            });
        })();
    }, []);

    const saveConfigBC = bootKitCall(bootkitSaveConfig, setStateError);
    const loadConfigBC = bootKitCall(bootkitLoadConfig, setStateError, updateConfig);
    const loadConfigsRawBC = bootKitCall(bootkitLoadConfigsRaw, setStateError, updateConfigsRaw);
    const loadSnapshotsBC = bootKitCall(bootkitLoadSnapshots, setStateError, setSnapshots);
    const removeSnapshotBC = bootKitCall(bootkitRemoveSnapshot, setStateError);
    const selectSnapshotBC = bootKitCall(bootkitSelectSnapshot, setStateError);
    const useCurrentSnapshotBC = bootKitCall(bootkitUseCurrentSnapshot, setStateError);

    return (
        <BootKitContext.Provider
            value={{
                // state
                state,
                config,
                configsRaw,
                snapshots,
                serviceAvailable,
                serviceVersion,
                // functions
                saveConfig,
                updateConfig: updateConfigValue,
                updateConsoleConfig,
                resetConfig,
                removeSnapshot: removeAndLoadSnapshot,
                selectSnapshot: selectAndLoadSnapshot,
                selectCurrentSnapshot: useAndLoadCurrentSnapshot,
            }}
        >
            {children}
        </BootKitContext.Provider>
    );
}
