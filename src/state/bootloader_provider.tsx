import React, { createContext, useContext, useEffect, useState } from "react";

import cockpit from 'cockpit';

const DBUS_NAME = "org.opensuse.bootloader";
const DBUS_PATH = "/org/opensuse/bootloader";

export interface KeyValue {
    original: string;
    line: number;
    changed: boolean;
    key: string;
    value: string;
}

export type KeyValueMap = Record<string, KeyValue>;

export interface Grub2Config {
    value_map: KeyValueMap;
    value_list: KeyValue[];
}

export interface BootloaderContextType {
    config: Grub2Config,
    bootEntries: string[],
}

const BootloaderContext = createContext<BootloaderContextType>({
    config: { value_list: [], value_map: {} },
    bootEntries: []
});
export const useBootloaderContext = () => useContext(BootloaderContext);

const loadConfig = (setConfig: (data: Grub2Config) => void) => {
    cockpit.dbus("org.opensuse.bootloader", { superuser: "require" })
                    .call("/org/opensuse/bootloader", "org.opensuse.bootloader.Config", "GetConfig")
                    .then(data => {
                        setConfig(JSON.parse(data[0] as string));
                    })
                    .catch(reason => console.error(reason));
};

const getBootEntries = (setBootEntries: (data: any) => void) => {
    cockpit.dbus("org.opensuse.bootloader", { superuser: "require" })
                    .call("/org/opensuse/bootloader", "org.opensuse.bootloader.BootEntry", "GetEntries")
                    .then(data => {
                        setBootEntries(JSON.parse(data[0] as string).entries);
                    })
                    .catch(reason => console.error(reason));
};

export function BootloaderProvider({ children }: { children: React.ReactNode }) {
    const [config, setConfig] = useState<Grub2Config>({ value_list: [], value_map: {} });
    const [bootEntries, setBootEntries] = useState([]);

    useEffect(() => {
        loadConfig(setConfig);
        getBootEntries(setBootEntries);

        cockpit.dbus(DBUS_NAME, { superuser: "require" }).subscribe({
            path: DBUS_PATH,
            interface: "org.opensuse.bootloader.Config",
            member: "FileChanged"
        }, (_path, _iface, signal, _args) => {
            if (signal === "FileChanged") {
                loadConfig(setConfig);
            }
        });
    }, []);

    return (
        <BootloaderContext.Provider value={{ config, bootEntries }}>
            {children}
        </BootloaderContext.Provider>
    );
}
