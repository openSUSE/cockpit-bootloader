import React from 'react';

import { ActionGroup, Button, Form, FormFieldGroup, FormFieldGroupHeader, FormGroup, FormSelect, FormSelectOption, TextInput } from '@patternfly/react-core';
import cockpit from 'cockpit';

const _ = cockpit.gettext;

export const KernelParameters = () => {
    return (
        <Form>
            <FormGroup label={_("Optional kernel parameters")} fieldId="key">
                <TextInput
                    aria-label="Kernel parameters"
                    value="Params here"
                    placeholder=""
                />
            </FormGroup>
            <FormGroup label={_("CPU Mitigations")} fieldId="mitigations">
                <FormSelect>
                    <FormSelectOption label='Auto + no SMT' />
                    <FormSelectOption label='Auto' />
                    <FormSelectOption label='Off' />
                    <FormSelectOption label='Manually' />
                </FormSelect>
            </FormGroup>
            <FormFieldGroup
                header={
                    <FormFieldGroupHeader
                        titleText={{ text: _("Graphical console"), id: 'graphical-console' }}
                        actions={
                            <>
                                <Button variant="secondary">{_("Disable")}</Button>
                            </>
                        }
                    />
                }
            >
                <FormGroup label={_("Console resolution")} fieldId="graphical-console-resolution">
                    <FormSelect>
                        <FormSelectOption label={_("Autodetect by grub2")} />
                        <FormSelectOption label='320x200' />
                        <FormSelectOption label='640x400' />
                        <FormSelectOption label='640x480' />
                        <FormSelectOption label='TODO rest' />
                    </FormSelect>
                </FormGroup>
                <FormGroup label={_("Console theme")} fieldId="graphical-console-theme">
                    <TextInput id="graphical-console-theme-text" name="graphical-console-theme-text" value='Theme path here' onChange={() => { }} />
                </FormGroup>
            </FormFieldGroup>
            <FormFieldGroup
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
            </FormFieldGroup>
            <ActionGroup>
                <Button variant="primary">
                    {_("Save")}
                </Button>
                <Button variant="secondary">
                    {_("Cancel")}
                </Button>
            </ActionGroup>
        </Form>
    );
}
