import React from 'react';

import { Form, FormGroup, FormSelect, FormSelectOption, NumberInput } from '@patternfly/react-core';
import cockpit from 'cockpit';
import { useBootKitContext } from '../state/bootkit_provider';

const _ = cockpit.gettext;

export const BootOptions = () => {
    const { config, updateConfig } = useBootKitContext();

    const setEntry = (entry: string) => {
        updateConfig("boot_entries.selected", entry);
    };

    const onTimeoutChange = (event: React.FormEvent<HTMLInputElement>) => {
        const value = (event.target as HTMLInputElement).value;
        updateConfig("timeout", value);
    };

    const calcTimeout = (value: number) => {
        let timeout = Number(config.timeout) || 0;
        timeout += value;
        if (timeout < 0) {
            timeout = 0;
        }

        updateConfig("timeout", timeout.toString());
    };

    return (
        <Form>
            <FormGroup label={_("Timeout")} type="number" fieldId="bootloader-timeout">
                <NumberInput
                    value={Number(config.timeout) || 0}
                    onPlus={() => calcTimeout(+1)}
                    onMinus={() => calcTimeout(-1)}
                    onChange={onTimeoutChange}
                    inputName="bootloader-timeout-input"
                    inputAriaLabel="Bootloader Timeout"
                    minusBtnAriaLabel="minus"
                    plusBtnAriaLabel="plus"
                />
            </FormGroup>
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
