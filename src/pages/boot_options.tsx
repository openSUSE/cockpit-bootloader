import React, { useEffect, useState } from 'react';

import { Form, FormGroup, FormSelect, FormSelectOption } from '@patternfly/react-core';
import cockpit from 'cockpit';
import { fsinfo } from 'cockpit/fsinfo';

const _ = cockpit.gettext;

export const BootOptions = () => {
    const [bootEntries, setBootEntries] = useState<string[]>([]);
    const [hasGrubBoot, setHasGrubBoot] = useState<boolean | undefined>(undefined);
    const [selectedBoot, setSelectedBoot] = useState<string>("defult?");

    useEffect(() => {
        fsinfo('/boot/grub2/grub.cfg', [])
                        .then(() => setHasGrubBoot(true))
                        .catch(() => setHasGrubBoot(false));

        const bootConfig = cockpit.file('/boot/grub2/grub.cfg', { superuser: 'require' });
        bootConfig.watch(content => {
            const regex = /menuentry\s+'([^']+)/g;
            let match;
            const entries = [];
            while ((match = regex.exec(content || "")) !== null) {
                entries.push(match[1]);
            }
            setBootEntries(entries);
        });
        return bootConfig.close;
    }, []);

    return (
        <Form>
            <FormGroup label={_("Console resolution")} fieldId="graphical-console-resolution">
                <FormSelect value={selectedBoot} onChange={(_event, value) => setSelectedBoot(value)}>
                    {bootEntries.map((value, idx) =>
                        <FormSelectOption key={idx} label={value} value={value} />
                    )}
                </FormSelect>
            </FormGroup>
            <br />
        </Form>
    );
};
