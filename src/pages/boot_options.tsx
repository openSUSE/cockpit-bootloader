import React, { useEffect, useState } from 'react';

import { Form, FormGroup, FormSelect, FormSelectOption } from '@patternfly/react-core';
import cockpit from 'cockpit';
import { useBootKitContext } from '../state/bootkit_provider';
// import { fsinfo } from 'cockpit/fsinfo';

const _ = cockpit.gettext;

export const BootOptions = () => {
    const { config, bootEntries, setBootEntry } = useBootKitContext();

    const setEntry = (entry: string) => {
        setBootEntry(entry);
    };

    return (
        <Form>
            <FormGroup label={_("Boot entry")} fieldId="graphical-console-resolution">
                <FormSelect value={config.selected_kernel || bootEntries[0] || ""} onChange={(_event, value) => setEntry(value)}>
                    {bootEntries.map((value, idx) =>
                        <FormSelectOption key={idx} label={value} value={value} />
                    )}
                </FormSelect>
            </FormGroup>
            <br />
        </Form>
    );
};
