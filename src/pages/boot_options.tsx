import React from 'react';

import { Form, FormGroup, FormSelect, FormSelectOption } from '@patternfly/react-core';
import cockpit from 'cockpit';
import { useBootKitContext } from '../state/bootkit_provider';

const _ = cockpit.gettext;

export const BootOptions = () => {
    const { config, updateConfig } = useBootKitContext();

    const setEntry = (entry: string) => {
        updateConfig("boot_entries.selected", entry);
    };

    return (
        <Form>
            <FormGroup label={_("Boot entry")} fieldId="graphical-console-resolution">
                <FormSelect value={config.boot_entries.selected || config.boot_entries.boot_entries[0] || ""} onChange={(_event, value) => setEntry(value)}>
                    {config.boot_entries.boot_entries.map((value, idx) =>
                        <FormSelectOption key={idx} label={value.title || value.name} value={value.name} />
                    )}
                </FormSelect>
            </FormGroup>
            <br />
        </Form>
    );
};
