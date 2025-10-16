/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2017 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */

import React, { useEffect, useState } from 'react';
import { Page, PageSection, PageSectionVariants, PageSidebar, Form, TextInput, FormGroup, ActionGroup } from '@patternfly/react-core';
import { Button } from '@patternfly/react-core';
import { Modal, ModalHeader } from "@patternfly/react-core";

import { useDialogs } from "dialogs.jsx";
import { WithDialogs } from 'dialogs';
import cockpit from 'cockpit';

import { ListingTable } from 'cockpit-components-table.jsx';

const _ = cockpit.gettext;

/**
 * @class
 * @prop {number} line
 * @prop {string} key
 * @prop {string} value
 */
class KeyValue {
    private original: string;
    private line: number;
    private changed: boolean;
    public key: string;
    public value: string;
    /**
     * Create a point.
     * @prop {number} line - The x value.
     * @prop {string} key - The x value.
     * @prop {string} value - The y value.
     */
    constructor(original: string, line: number) {
        this.original = original
        this.line = line
        this.changed = false
        this.key = ''
        this.value = ''
        this.parse()
    }

    parse() {
        // assuming this is always valid
        // TODO: error out if the parse fails
        // TODO: save the type of quotes so they can be returned to orignal
        const trimmed = this.original.trim();
        const keyval = trimmed.split('=')
        this.key = keyval[0];
        this.value = keyval[1].replace(/'|"/g, '');
    }

    toString() {
        if (!this.changed) {
            return this.original;
        }

        return `${this.key}="${this.value}"`;
    }
}

class GrubFile {
    private lines: (KeyValue | string)[]

    constructor(data: string) {
        this.lines = []
        const lines = data.split('\n');
        for (const idx in lines) {
            const line = lines[idx]
            const trimmed = line.trim();
            if (trimmed.length === 0) {
                this.lines.push(line);
                continue;
            }

            if (trimmed[0] === '#') {
                this.lines.push(line);
                continue;
            }

            this.lines.push(new KeyValue(line, Number(idx)))
        }
    }

    values() {
        return this.lines.filter(value => (typeof value !== "string"))
    }

    toFile() {
        return this.lines.map((val) => val.toString()).join('\n')
    }
}


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

// Hack to hide the Sidebar area in patternfly 6 Page
const emptySidebar = <PageSidebar isSidebarOpen={false} />;

const GrubValues = ({ keyvals }: { keyvals: KeyValue[] }) => {
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
                // const pkg = packages[key];
                return {
                    columns: [
                        { title: pkg.key },
                        { title: pkg.value },
                        { title: <Button onClick={() => Dialogs.show(<KeyValDialog name={pkg.key} value={pkg.value} />)}>edit</Button> },
                    ]
                };
            })}
        />
    )
}

export const Application = () => {
    const [keyvals, setKeyvals] = useState<KeyValue[]>([]);

    useEffect(() => {
        const hostname = cockpit.file('/etc/default/grub');

        hostname.watch(content => setKeyvals(new GrubFile(content ?? "").values()));
        return hostname.close;
    }, []);

    return (
        <WithDialogs    >
            <Page sidebar={emptySidebar} className='no-masthead-sidebar'>
                <PageSection variant={PageSectionVariants.default} >
                    <GrubValues keyvals={keyvals} />
                </PageSection>
            </Page>
        </WithDialogs>
    );
};
