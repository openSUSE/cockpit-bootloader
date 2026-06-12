import React from 'react';

import { Button, Form, FormFieldGroup, FormFieldGroupHeader, FormGroup, FormSelect, FormSelectOption, TextInput } from '@patternfly/react-core';
import cockpit from 'cockpit';
import { useBootKitContext } from '../state/bootkit_provider';
import { BootkitGrub2ConsoleConfig } from '../state/bootkitd';

const _ = cockpit.gettext;

const Grub2ConsoleConfig = ({ config }: { config: BootkitGrub2ConsoleConfig }) => {
    const { updateConsoleConfig } = useBootKitContext();

    if (!config.graphical_enabled) {
        return (
            <FormGroup label={_("Graphical console")} fieldId="graphical-console">
                <Button variant="primary" onClick={() => updateConsoleConfig("Grub2", "graphical_enabled", true) }>{_("Enable")}</Button>
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
                        <Button variant="secondary" onClick={() => updateConsoleConfig("Grub2", "graphical_enabled", false)}>{_("Disable")}</Button>
                    }
                />
            }
        >
            <FormGroup label={_("Console resolution")} fieldId="graphical-console-resolution">
                <FormSelect value={config.console_resolution} onChange={(_event, value) => updateConsoleConfig("Grub2", "console_resolution", value)}>
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
                    value={config.console_theme || ""}
                    onChange={(_event, value) => updateConsoleConfig("Grub2", "console_theme", value)}
                />
            </FormGroup>
        </FormFieldGroup>
    );
};

const ConsoleConfig = () => {
    const { config } = useBootKitContext();

    if (config.console?.loader === "Grub2") {
        return <Grub2ConsoleConfig config={config.console} />;
    }

    return null;
};

export const KernelParameters = () => {
    const { config, updateConfig } = useBootKitContext();

    return (
        <Form>
            <FormGroup label={_("Kernel parameters")} fieldId="key">
                <TextInput
                    aria-label="Kernel parameters"
                    value={config.kernel_arguments || ""}
                    placeholder=""
                    onChange={(_event, value) => updateConfig("kernel_arguments", value)}
                />
            </FormGroup>
            <ConsoleConfig />
        </Form>
    );
};
