import React from 'react';
import { Form, TextInput, FormGroup, ActionGroup } from '@patternfly/react-core';
import { Button } from '@patternfly/react-core';
import { Modal, ModalHeader } from "@patternfly/react-core";

import { useDialogs } from "dialogs.jsx";
import cockpit from 'cockpit';

import { ListingTable } from 'cockpit-components-table.jsx';
import { KeyValue } from './../grubfile';

const _ = cockpit.gettext;

export const KeyValDialog = ({
    name, value
}: {
    name: string,
    value: string
}) => {
    const Dialogs = useDialogs();

    return (
        <Modal
            title={_("Edit GRUB value")}
            variant="small"
            onClose={() => Dialogs.close()}
            isOpen
        >
            <ModalHeader>
                <Form>
                    <FormGroup label={_("Key")} fieldId="key">
                        <TextInput
                            aria-label="Key"
                            value={name}
                            placeholder=""
                        />
                    </FormGroup>
                    <FormGroup label={_("Value")} fieldId="value">
                        <TextInput
                            aria-label="Value"
                            value={value}
                            placeholder=""
                        />
                    </FormGroup>
                    <ActionGroup>
                        <Button variant="primary">
                            {_("Save")}
                        </Button>
                        <Button variant="secondary">
                            {_("Cancel")}
                        </Button>
                    </ActionGroup>
                </Form>
            </ModalHeader>
        </Modal>
    );
};

export const AdvancedValues = ({ keyvals }: { keyvals: KeyValue[] }) => {
    const Dialogs = useDialogs();

    return (
        <ListingTable
            aria-label={_("GRUB values")}
            gridBreakPoint='grid-lg'
            columns={[
                { title: _("Key") },
                { title: _("Value") },
            ]}
            rows={keyvals.map((pkg, idx) => {
                return {
                    columns: [
                        { title: pkg.key },
                        { title: pkg.value },
                        { title: <Button onClick={() => Dialogs.show(<KeyValDialog name={pkg.key} value={pkg.value} />)}>{_("Edit")}</Button> },
                    ]
                };
            })}
        />
    )
}
