import React from 'react';

import { Button, Form, FormFieldGroup, FormFieldGroupHeader, FormGroup, FormSelect, FormSelectOption, TextInput } from '@patternfly/react-core';
import cockpit from 'cockpit';
import { GrubFile, KeyValue } from '../grubfile';
import { KeyValueMap, useBootKitContext } from '../state/bootkit_provider';

const _ = cockpit.gettext;

const GraphicalConsole = ({ grubValues, updateValue }: { grubValues: KeyValueMap, updateValue: (key: string, value: string) => void }) => {
    const resolutionValue = () => {
        const resolution = grubValues.GRUB_GFXMODE?.value;

        if (!resolution || resolution === "auto")
            return _("Autodetect by grub2");

        return resolution;
    };

    const isGraphicsEnabled = (): boolean => {
        return grubValues.GRUB_TERMINAL?.value === "gfxterm";
    };

    if (!isGraphicsEnabled()) {
        return (
            <FormGroup label={_("Graphical console")} fieldId="graphical-console">
                <Button variant="primary" onClick={() => updateValue("GRUB_TERMINAL", "gfxterm")}>{_("Enable")}</Button>
            </FormGroup>
        );
    }

    return (
        <FormFieldGroup
            header={
                <FormFieldGroupHeader
                    className='pf-v6-c-form__label-text'
                    titleText={{ text: _("Graphical console"), id: 'graphical-console' }}
                    actions={
                        <Button variant="secondary" onClick={() => updateValue("GRUB_TERMINAL", "console")}>{_("Disable")}</Button>
                    }
                />
            }
        >
            <FormGroup label={_("Console resolution")} fieldId="graphical-console-resolution">
                <FormSelect value={resolutionValue()} onChange={(_event, value) => updateValue("GRUB_GFXMODE", value)}>
                    <FormSelectOption label={_("Autodetect by grub2")} value="auto" />
                    <FormSelectOption label='320x200' value='320x200' />
                    <FormSelectOption label='640x400' value='640x400' />
                    <FormSelectOption label='640x480' value='640x480' />
                    <FormSelectOption label='TODO rest' />
                </FormSelect>
            </FormGroup>
            <FormGroup label={_("Console theme")} fieldId="graphical-console-theme">
                <TextInput
                    id="graphical-console-theme-text"
                    name="graphical-console-theme-text"
                    value={grubValues.GRUB_THEME?.value}
                    onChange={(_event, value) => updateValue("GRUB_THEME", value)}
                />
            </FormGroup>
        </FormFieldGroup>
    );
};

export const KernelParameters = ({ grub }: { grub: GrubFile }) => {
    const context = useBootKitContext();

    const updateValue = (key: string, value: string) => {
        context.updateConfig(key, value);
    };

    return (
        <Form>
            <FormGroup label={_("Kernel parameters")} fieldId="key">
                <TextInput
                    aria-label="Kernel parameters"
                    value={context.config.value_map.GRUB_CMDLINE_LINUX_DEFAULT?.value}
                    placeholder=""
                    onChange={(_event, value) => updateValue("GRUB_CMDLINE_LINUX_DEFAULT", value)}
                />
            </FormGroup>
            {/* <FormGroup label={_("CPU Mitigations")} fieldId="mitigations">
                <FormSelect>
                    <FormSelectOption label='Auto + no SMT' />
                    <FormSelectOption label='Auto' />
                    <FormSelectOption label='Off' />
                    <FormSelectOption label='Manually' />
                </FormSelect>
            </FormGroup> */}
            <GraphicalConsole grubValues={context.config.value_map} updateValue={updateValue} />
            {/*   <FormFieldGroup
                header={
                    <FormFieldGroupHeader
                        titleText={{ text: _("Serial console"), id: 'serial-console' }}
                        actions={
                            <>
                                <Button variant="primary">{_("Enable")}</Button>
                            </>
                        }
                    />
                }
            >
                <FormGroup label={_("Console arguments")} fieldId="serial-console-arguments">
                    <TextInput id="serial-console-arg-text" name="serial-console-arg-text" value='Arguments here' onChange={() => { }} />
                </FormGroup>
            </FormFieldGroup> */}
        </Form>
    );
};
