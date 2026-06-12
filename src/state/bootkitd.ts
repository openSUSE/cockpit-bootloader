import cockpit from 'cockpit';

export const DBUS_NAME = "org.opensuse.bootkit";
export const DBUS_PATH = "/org/opensuse/bootkit";

type BKKeys<K extends string | number, IsTop> = IsTop extends true ? K : `.${K}`

// Map type into "foo.bar" path
export type BKPath<T, IsTop = true, K extends keyof T = keyof T> =
  K extends string | number
    ? `${BKKeys<K, IsTop>}${'' | (T[K] extends object ? T[K] extends unknown[] ? '' : BKPath<T[K], false> : '')}`
    : never

// infer type of a member based on "foo.bar" path
export type BKPathValue<T, P extends string> = P extends `${infer K}.${infer R}`
  ? K extends keyof T
    ? BKPathValue<T[K], `${R}`>
    : never
  : P extends `${infer K}`
    ? K extends keyof T
      ? T[K]
      : never
    : never;

export const getPathKeys = (path: string): string[] => {
    const paths = path.split(".");
    return paths;
};

export const setPathValue = (obj: object, path: string, value: unknown) => {
    // TODO: typesafety
    const paths = path.split(".");
    let curr = obj;
    for (let idx = 0; idx <= paths.length; idx++) {
        const path = paths[idx];
        if (idx === paths.length - 1) {
            // @ts-expect-error Assume curr being a valid object
            curr[path] = value;
        } else {
            // @ts-expect-error Assume curr being a valid object
            curr = curr[path];
        }
    }
};

export interface BootkitGrub2ConsoleConfig {
    graphical_enabled: boolean;
    /** Seleceted console resolution or "auto" */
    console_resolution: string;
    console_theme?: string | null;
}

/**
 * Discriminated union matching `#[serde(tag = "loader")]`
 */
export type BootkitConsoleConfigs =
    | { loader: "SystemdBoot" }
    | (BootkitGrub2ConsoleConfig & { loader: "Grub2" });

export interface BootkitBootEntry {
    /** "Raw" name, usually containing more technical info */
    name: string;
    /** Pretty name, if available */
    title?: string | null;
}

export interface BootkitBootEntries {
    selected?: string | null;
    boot_entries: BootkitBootEntry[];
}

export interface BootkitConfig {
    timeout?: string | null;
    boot_entries: BootkitBootEntries;
    kernel_arguments?: string | null;
    /** Possible mismatches of currently selected config and system's state. */
    config_diffs?: { [key: string]: string };
    /** Console configs for loaders that support them */
    console?: BootkitConsoleConfigs | null;
}

/**
 * Discriminated union matching `#[serde(tag = "file_type")]`
 */
export type BootkitRawFile =
    | { file_type: "Grub2Config"; values: [string, string][] }
    | { file_type: "SystemdBootEntry"; values: [string, string][] }
    | { file_type: "SystemdBootLoader"; values: [string, string][] };

export interface BootkitConfigRaw {
    file: BootkitRawFile;
    file_path: string;
}

export interface BootkitConfigsRaw {
    configs: BootkitConfigRaw[];
}

export interface BootkitSnapshotConfig {
    contents: string;
    diff?: string | null;
}

export interface BootkitSnapshot {
    id: number;
    /** Timestamp from database (ISO 8601 string) */
    created: string;
    /** Raw bootloader specific config(s) */
    configs: { [key: string]: BootkitSnapshotConfig };
    /** Selected kernel, None means default */
    kernel?: BootkitBootEntry | null;
}

export interface BootkitSnapshots {
    selected?: number | null;
    snapshots: BootkitSnapshot[];
}

export interface BootkitSnapshotSelect {
    snapshot_id: number;
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
                    .call(DBUS_PATH, "org.opensuse.bootkit.Info", "GetVersion") as Promise<string[]>;
};

export const bootkitPing = () => {
    return bootkitdClient()
                    .call(DBUS_PATH, "org.opensuse.bootkit.Info", "Ping");
};

export const bootkitLoadConfig = () => {
    return bootkitdClient()
                    .call(DBUS_PATH, "org.opensuse.bootkit.Config", "GetConfig") as Promise<JsonPromise<BootkitConfig>>;
};

export const bootkitLoadConfigsRaw = () => {
    return bootkitdClient()
                    .call(DBUS_PATH, "org.opensuse.bootkit.ConfigRaw", "GetConfigsRaw") as Promise<JsonPromise<BootkitConfigsRaw>>;
};

export const bootkitLoadSnapshots = () => {
    return bootkitdClient()
                    .call(DBUS_PATH, "org.opensuse.bootkit.Snapshot", "GetSnapshots") as Promise<JsonPromise<BootkitSnapshots>>;
};

export const bootkitSaveConfig = (config: BootkitConfig) => {
    return bootkitdClient()
                    .call(DBUS_PATH, "org.opensuse.bootkit.Config", "SaveConfig", [JSON.stringify(config)]) as Promise<JsonPromise<string>>;
};

export const bootkitSnapshotFromSystem = () => {
    return bootkitdClient()
                    .call(DBUS_PATH, "org.opensuse.bootkit.Snapshot", "SnapshotFromSystem", []) as Promise<JsonPromise<string>>;
};

export const bootkitRemoveSnapshot = (id: number) => {
    const arg = { snapshot_id: id };
    return bootkitdClient()
                    .call(DBUS_PATH, "org.opensuse.bootkit.Snapshot", "RemoveSnapshot", [JSON.stringify(arg)]) as Promise<JsonPromise<string>>;
};

export const bootkitSelectSnapshot = (id: number) => {
    const arg = { snapshot_id: id };
    return bootkitdClient()
                    .call(DBUS_PATH, "org.opensuse.bootkit.Snapshot", "SelectSnapshot", [JSON.stringify(arg)]) as Promise<JsonPromise<string>>;
};

export const bootkitUseCurrentSnapshot = () => {
    return bootkitdClient()
                    .call(DBUS_PATH, "org.opensuse.bootkit.Snapshot", "UseCurrentSnapshot", []) as Promise<JsonPromise<string>>;
};
