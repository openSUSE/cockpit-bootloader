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
    serviceAvailable: boolean,
    saveConfig: () => void,
    updateConfig: (key: KeyValue | string, value: string) => void,
    setBootEntry: (entry: string) => void,
}

const BootKitContext = createContext<BootKitContextType>({
    config: { value_list: [], value_map: {}, internal_list: [] },
    bootEntries: [],
    serviceAvailable: false,
    saveConfig: () => { },
    updateConfig: () => { },
    setBootEntry: () => { },
});
export const useBootKitContext = () => useContext(BootKitContext);

const getVersion = () => {
    return cockpit.dbus(DBUS_NAME, { superuser: "require" })
                    .call(DBUS_PATH, "org.opensuse.bootkit.Info", "GetVersion");
};

const loadConfig = (setConfig: (data: Grub2ConfigInternal) => void) => {
    cockpit.dbus(DBUS_NAME, { superuser: "require" })
                    .call(DBUS_PATH, "org.opensuse.bootkit.Config", "GetConfig")
                    .then(data => {
                        const parsed: BootKitData<Grub2ConfigInternal> = JSON.parse(data[0] as string);
                        if (parsed.ok) {
                            setConfig(parsed.ok);
                        }
                        // TODO: set error
                    })
                    .catch(reason => console.error(reason));
};

const saveGrubConfig = (config: Grub2Config) => {
    // TODO: polling and status update callbacks
    const data: Grub2ConfigInternal = {
        value_map: config.value_map,
        value_list: config.internal_list,
        selected_kernel: config.selected_kernel,
    };

    cockpit.dbus(DBUS_NAME, { superuser: "require" })
                .call(DBUS_PATH, "org.opensuse.bootkit.Config", "SaveConfig", [JSON.stringify(data)])
                .then(data => console.log(data))
                .catch(reason => console.error(reason));
}

const getBootEntries = (setBootEntries: (data: string[]) => void) => {
    cockpit.dbus(DBUS_NAME, { superuser: "require" })
                    .call(DBUS_PATH, "org.opensuse.bootkit.BootEntry", "GetEntries")
                    .then(data => {
                        const parsed: BootKitData<{entries: string[]}> = JSON.parse(data[0] as string);
                        if (parsed.ok) {
                            setBootEntries(parsed.ok.entries);
                        }
                        // TODO: set error
                    })
                    .catch(reason => console.error(reason));
};

export function BootKitProvider({ children }: { children: React.ReactNode }) {
    const [serviceAvailable, setServiceAvailable] = useState(false);
    const [config, setConfig] = useState<Grub2Config>({ value_list: [], value_map: {}, internal_list: [] });
    const [bootEntries, setBootEntries] = useState<string[]>([]);

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

    const saveConfig = React.useCallback(() => {
        saveGrubConfig(config);
    }, [config]);

    const updateGrub2Config = (data: Grub2ConfigInternal) => {
        const value_list = data.value_list.filter(val => val.t === "KeyValue");
        setConfig({
            value_list,
            value_map: data.value_map,
            internal_list: data.value_list,
            selected_kernel: data.selected_kernel,
        });
    }

    useEffect(() => {
        (async() => {
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

            loadConfig(updateGrub2Config);
            getBootEntries(setBootEntries);

            cockpit.dbus(DBUS_NAME, { superuser: "require" }).subscribe({
                path: DBUS_PATH,
                interface: "org.opensuse.bootkit.Config",
                member: "FileChanged"
            }, (_path, _iface, signal, _args) => {
                if (signal === "FileChanged") {
                    loadConfig(updateGrub2Config);
                }
            });
        })();
    }, []);

    return (
        <BootKitContext.Provider value={{ serviceAvailable, config, bootEntries, updateConfig, saveConfig, setBootEntry }}>
            {children}
        </BootKitContext.Provider>
    );
}
