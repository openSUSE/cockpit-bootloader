import React from 'react';
import { Form, TextInput, FormGroup, ActionGroup } from '@patternfly/react-core';
import { Button } from '@patternfly/react-core';
import { Modal, ModalHeader } from "@patternfly/react-core";

import { useDialogs } from "dialogs.jsx";
import cockpit from 'cockpit';

import { ListingTable } from 'cockpit-components-table.jsx';
import { GrubFile, KeyValue } from './../grubfile';

const _ = cockpit.gettext;

export const KeyValDialog = ({
    keyval, grub,
}: {
    keyval: KeyValue
    grub: GrubFile,
}) => {
    const Dialogs = useDialogs();
    const [newValue, setNewValue] = React.useState(keyval.value)

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
                            value={keyval.key}
                            placeholder=""
                            isDisabled
                        />
                    </FormGroup>
                    <FormGroup label={_("Value")} fieldId="value">
                        <TextInput
                            aria-label="Value"
                            value={newValue}
                            placeholder=""
                            onChange={(_event, value) => setNewValue(value)}
                        />
                    </FormGroup>
                    <ActionGroup>
                        <Button variant="primary" onClick={() => { grub.updateValue(keyval, newValue); Dialogs.close() }}>
                            {_("Save")}
                        </Button>
                        <Button variant="secondary" onClick={() => Dialogs.close()}>
                            {_("Cancel")}
                        </Button>
                    </ActionGroup>
                </Form>
            </ModalHeader>
        </Modal>
    );
};

export const AdvancedValues = ({ grub }: { grub: GrubFile }) => {
    const Dialogs = useDialogs();

    return (
        <ListingTable
            aria-label={_("GRUB values")}
            gridBreakPoint='grid-lg'
            columns={[
                { title: _("Key") },
                { title: _("Value") },
            ]}
            rows={grub.values().map((pkg, idx) => {
                return {
                    columns: [
                        { title: pkg.key },
                        { title: pkg.value },
                        { title: <Button onClick={() => Dialogs.show(<KeyValDialog grub={grub} keyval={pkg} />)}>{_("Edit")}</Button> },
                    ]
                };
            })}
        />
    )
}
