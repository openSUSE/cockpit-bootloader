import React, { createContext, useContext, useEffect, useState } from "react";

import cockpit from 'cockpit';

const DBUS_NAME = "org.opensuse.bootkit";
const DBUS_PATH = "/org/opensuse/bootkit";

type BootKitErr = {
    ok?: null,
    err: string,
};

type BootKitOk<T> = {
    ok: T,
    err?: null,
};

type BootKitData<T> = BootKitOk<T> | BootKitErr;

export interface BootkitState {
    loading: boolean;
    saving: boolean;
    error?: string | undefined | null;
}

export interface KeyValue {
    t: "KeyValue";
    original: string;
    line: number;
    changed: boolean;
    key: string;
    value: string;
}

export interface RawLine {
    t: "String";
    raw_line: string;
}

export type KeyValueMap = Record<string, KeyValue>;

export type Grub2Snapshot = {
    // Auto incrementing snapshot id
    id: number,
    // /etc/default/grub config
    grub_config: string,
    // selected kernel that's booted to, if it's actually specified
    selected_kernel?: string | null | undefined
    // when snapshot was created
    created: string,
};

export interface Grub2SnapshotData {
    snapshot: Grub2Snapshot,
    // diff between current Grub2 config, if any
    diff?: string | null | undefined,
}

export interface Grub2SelectedSnapshot {
    // id of selected Grub2Snapshot. If none is set, select snapshot with
    // biggest ID
    grub2_snapshot_id?: number | null | undefined;
}

export interface BootkitSnapshots {
    snapshots: Grub2SnapshotData[],
    selected: Grub2SelectedSnapshot,
}

interface Grub2ConfigInternal {
    value_map: KeyValueMap;
    value_list: (KeyValue | RawLine)[];
    selected_kernel?: string | null | undefined;
}

export interface Grub2Config {
    value_map: KeyValueMap;
    value_list: KeyValue[];
    internal_list: (KeyValue | RawLine)[];
    selected_kernel?: string | null | undefined;
}

export interface BootKitContextType {
    config: Grub2Config,
    bootEntries: string[],
    snapshots: BootkitSnapshots,
    serviceAvailable: boolean,
    state: BootkitState,
    saveConfig: () => void,
    removeSnapshot: (id: number) => void,
    selectSnapshot: (id: number) => void,
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
    removeSnapshot: () => { },
    selectSnapshot: () => { },
    updateConfig: () => { },
    setBootEntry: () => { },
});
export const useBootKitContext = () => useContext(BootKitContext);

type JsonPromise<T> = string[] | BootKitData<T>
function parseBootkitJson<T>(data: JsonPromise<T>): Exclude<JsonPromise<T>, string[]> {
    return JSON.parse((data as string[])[0]);
}

// TODO: proper typing for callback arguments
// eslint-disable-next-line
type BKArg = any;

function bootKitCall<T>(callback: (...arg: BKArg[]) => Promise<JsonPromise<T>>, setError: (error: string) => void, setData?: (data: T) => void) {
    return async (...arg: BKArg[]) => {
        try {
            const data = await callback(...arg);
            const parsed = parseBootkitJson(data);
            if (parsed.ok && setData) {
                setData(parsed.ok);
            } else if (parsed.err) {
                setError(parsed.err);
            }
        } catch (err) {
            console.error(err);
            setError((err as Error).message);
        }
    };
}

const getVersion = () => {
    return cockpit.dbus(DBUS_NAME, { superuser: "require" })
                    .call(DBUS_PATH, "org.opensuse.bootkit.Info", "GetVersion");
};

const bootKitRemoveSnapshot = (id: number) => {
    const arg = { snapshot_id: id };
    return cockpit.dbus(DBUS_NAME, { superuser: "require" })
                    .call(DBUS_PATH, "org.opensuse.bootkit.Snapshot", "RemoveSnapshot", [JSON.stringify(arg)]) as Promise<JsonPromise<string>>;
};

const bootKitSelectSnapshot = (id: number) => {
    const arg = { snapshot_id: id };
    return cockpit.dbus(DBUS_NAME, { superuser: "require" })
                    .call(DBUS_PATH, "org.opensuse.bootkit.Snapshot", "SelectSnapshot", [JSON.stringify(arg)]) as Promise<JsonPromise<string>>;
};

const bootKitLoadSnapshots = (): Promise<JsonPromise<BootkitSnapshots>> => {
    return cockpit.dbus(DBUS_NAME, { superuser: "require" })
                    .call(DBUS_PATH, "org.opensuse.bootkit.Snapshot", "GetSnapshots") as Promise<JsonPromise<BootkitSnapshots>>;
};

const bootKitLoadConfig = () => {
    return cockpit.dbus(DBUS_NAME, { superuser: "require" })
                    .call(DBUS_PATH, "org.opensuse.bootkit.Config", "GetConfig") as Promise<JsonPromise<Grub2ConfigInternal>>;
};

const bootKitLoadBootEntries = () => {
    return cockpit.dbus(DBUS_NAME, { superuser: "require" })
                    .call(DBUS_PATH, "org.opensuse.bootkit.BootEntry", "GetEntries") as Promise<JsonPromise<{entries: string[]}>>;
};

const bootKitSaveGrubConfig = (config: Grub2Config) => {
    // TODO: polling and status update callbacks
    const data: Grub2ConfigInternal = {
        value_map: config.value_map,
        value_list: config.internal_list,
        selected_kernel: config.selected_kernel,
    };

    return cockpit.dbus(DBUS_NAME, { superuser: "require" })
                    .call(DBUS_PATH, "org.opensuse.bootkit.Config", "SaveConfig", [JSON.stringify(data)]) as Promise<JsonPromise<string>>;
};

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
            if (!keyvalue) {
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
        // only save the last entry of key to keyvalue store
        // to replicate the behavior of grub
        if (config.value_map[keyvalue.key]?.line === keyvalue.line) {
            config.value_map[keyvalue.key] = keyvalue;
        }
        setConfig({ ...config });
    }, [config]);

    const setBootEntry = React.useCallback((entry: string) => {
        config.selected_kernel = entry;
        setConfig({ ...config });
    }, [config]);

    const saveGrubConfig = React.useCallback(async () => {
        setState(old => ({ ...old, saving: true }));
        await saveConfig(config);
        setState(old => ({ ...old, saving: false }));
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
        });
    };

    const removeAndLoadSnapshot = async (id: number) => {
        await removeSnapshot(id);
        await loadSnapshots();
    };

    const selectAndLoadSnapshot = async (id: number) => {
        // TODO: loading indication
        await selectSnapshot(id);
        await loadSnapshots();
    };

    useEffect(() => {
        (async() => {
            setState(old => ({ ...old, loading: true }));
            let available = false;
            try {
                await getVersion();
                available = true;
            } catch {
                console.warn("BootKit service not available!");
            }

            setServiceAvailable(available);
            if (!available)
                return;

            await loadConfig();
            await loadBootEntries();
            await loadSnapshots();

            setState(old => ({ ...old, loading: false }));

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

    return (
        <BootKitContext.Provider
            value={{
                serviceAvailable,
                config,
                bootEntries,
                updateConfig,
                saveConfig: saveGrubConfig,
                setBootEntry,
                state,
                snapshots,
                removeSnapshot: removeAndLoadSnapshot,
                selectSnapshot: selectAndLoadSnapshot,
            }}
        >
            {children}
        </BootKitContext.Provider>
    );
}
