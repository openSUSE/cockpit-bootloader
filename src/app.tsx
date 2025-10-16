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
import { Flex, FlexItem, Page, PageSection, PageSectionVariants, PageSidebar, ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';

import { WithDialogs } from 'dialogs';
import cockpit from 'cockpit';

import { GrubFile, KeyValue } from './grubfile';
import { AdvancedValues } from './pages/advanced';

const _ = cockpit.gettext;

type Pages = "advanced";

const SelectedPage = ({ page, keyvals }: { page: Pages, keyvals: KeyValue[] }) => {
    switch (page) {
        case "advanced":
            return <AdvancedValues keyvals={keyvals} />;
        default:
            return null;
    }
}


// Hack to hide the Sidebar area in patternfly 6 Page
const emptySidebar = <PageSidebar isSidebarOpen={false} />;

export const Application = () => {
    const [keyvals, setKeyvals] = useState<KeyValue[]>([]);
    const [page, setPage] = React.useState<Pages>("advanced");

    useEffect(() => {
        const hostname = cockpit.file('/etc/default/grub');

        hostname.watch(content => setKeyvals(new GrubFile(content ?? "").values()));
        return hostname.close;
    }, []);

    return (
        <WithDialogs>
            <Page sidebar={emptySidebar} className='no-masthead-sidebar'>
                <PageSection variant={PageSectionVariants.default} >
                    <Flex>
                        <FlexItem align={{ default: 'alignRight' }}>
                            <ToggleGroup>
                                <ToggleGroupItem
                                    isSelected={page === "advanced"}
                                    buttonId="Advanced"
                                    text={_("Advanced")}
                                    onChange={() => setPage("advanced")}
                                />
                            </ToggleGroup>
                        </FlexItem>
                    </Flex>
                </PageSection>
                <SelectedPage page={page} keyvals={keyvals} />
            </Page>
        </WithDialogs>
    );
};
