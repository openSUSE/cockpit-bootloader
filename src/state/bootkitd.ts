import cockpit from 'cockpit';

const DBUS_NAME = "org.opensuse.bootkit";
const DBUS_PATH = "/org/opensuse/bootkit";

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

export interface Grub2ConfigInternal {
    value_map: KeyValueMap;
    value_list: (KeyValue | RawLine)[];
    selected_kernel?: string | null | undefined;
    config_diff?: string | null | undefined;
}

export interface Grub2Config {
    value_map: KeyValueMap;
    value_list: KeyValue[];
    internal_list: (KeyValue | RawLine)[];
    selected_kernel?: string | null | undefined;
    config_diff?: string | null | undefined;
}

export type JsonPromise<T> = string[] | T
export function parseBootkitJson<T>(data: JsonPromise<T>): Exclude<JsonPromise<T>, string[]> {
    return JSON.parse((data as string[])[0]);
}

let _bootkitdClient: cockpit.DBusClient | null = null;
const bootkitdClient = (): cockpit.DBusClient => {
    if (!_bootkitdClient) {
        _bootkitdClient = cockpit.dbus(DBUS_NAME, { superuser: "require" });
    }

    return _bootkitdClient;
};

export const bootkitdGetVersion = () => {
    return bootkitdClient()
                    .call(DBUS_PATH, "org.opensuse.bootkit.Info", "GetVersion");
};

export const bootKitPing = () => {
    return bootkitdClient()
                    .call(DBUS_PATH, "org.opensuse.bootkit.Info", "Ping");
};

export const bootKitRemoveSnapshot = (id: number) => {
    const arg = { snapshot_id: id };
    return bootkitdClient()
                    .call(DBUS_PATH, "org.opensuse.bootkit.Snapshot", "RemoveSnapshot", [JSON.stringify(arg)]) as Promise<JsonPromise<string>>;
};

export const bootKitSelectSnapshot = (id: number) => {
    const arg = { snapshot_id: id };
    return bootkitdClient()
                    .call(DBUS_PATH, "org.opensuse.bootkit.Snapshot", "SelectSnapshot", [JSON.stringify(arg)]) as Promise<JsonPromise<string>>;
};

export const bootKitUseCurrentSnapshot = () => {
    return bootkitdClient()
                    .call(DBUS_PATH, "org.opensuse.bootkit.Snapshot", "UseCurrentSnapshot", []) as Promise<JsonPromise<string>>;
};

export const bootKitLoadSnapshots = (): Promise<JsonPromise<BootkitSnapshots>> => {
    return bootkitdClient()
                    .call(DBUS_PATH, "org.opensuse.bootkit.Snapshot", "GetSnapshots") as Promise<JsonPromise<BootkitSnapshots>>;
};

export const bootKitLoadConfig = () => {
    return bootkitdClient()
                    .call(DBUS_PATH, "org.opensuse.bootkit.Config", "GetConfig") as Promise<JsonPromise<Grub2ConfigInternal>>;
};

export const bootKitLoadBootEntries = () => {
    return bootkitdClient()
                    .call(DBUS_PATH, "org.opensuse.bootkit.BootEntry", "GetEntries") as Promise<JsonPromise<{entries: string[]}>>;
};

export const bootKitSaveGrubConfig = (config: Grub2Config) => {
    // TODO: polling and status update callbacks
    const data: Grub2ConfigInternal = {
        value_map: config.value_map,
        value_list: config.internal_list,
        selected_kernel: config.selected_kernel,
    };

    return bootkitdClient()
                    .call(DBUS_PATH, "org.opensuse.bootkit.Config", "SaveConfig", [JSON.stringify(data)]) as Promise<JsonPromise<string>>;
};
